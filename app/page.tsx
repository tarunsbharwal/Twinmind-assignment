"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "@/contexts/SessionContext";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { MicrophoneButton } from "@/components/MicrophoneButton";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { SuggestionsPanel } from "@/components/SuggestionsPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { downloadSessionJSON } from "@/lib/export";
import {
  TranscriptChunk,
  SuggestionBatch,
  Suggestion,
  ChatMessage,
} from "@/lib/types";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  const {
    session,
    settings,
    addTranscriptChunk,
    addSuggestionBatch,
    addChatMessage,
    updateChatMessageResponse,
    setSettings,
  } = useSession();

  const { isRecording, startRecording, stopRecording } = useAudioCapture({
    chunkDurationMs: 30000,
    onChunkReady: handleAudioChunk,
    onError: (error) => console.error("Audio capture error:", error),
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [suggestionsLoading, setLoadingSuggestions] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const suggestionsTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle incoming audio chunk - transcribe it
  async function handleAudioChunk(audioBase64: string) {
    try {
      if (!settings.groqApiKey) {
        alert("Please set your Groq API key in settings");
        return;
      }

      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, apiKey: settings.groqApiKey }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Transcription error status:", response.status);
        console.error("Transcription error body:", errorText);
        try {
          const error = JSON.parse(errorText);
          console.error("Transcription error JSON:", error);
        } catch (e) {
          console.error("Could not parse transcription error as JSON");
        }
        return;
      }

      const data = await response.json();

      // Add chunk to transcript
      const chunk: TranscriptChunk = {
        id: Math.random().toString(),
        text: data.text,
        timestamp: new Date().toLocaleTimeString(),
        duration: 30,
        startTime: Date.now(),
      };

      addTranscriptChunk(chunk);

      // Auto-generate suggestions
      await generateSuggestions();
    } catch (error) {
      console.error("Audio chunk handling error:", error);
    }
  }

  // Generate suggestions based on recent transcript
  async function generateSuggestions() {
    if (!settings.groqApiKey || session.transcript.length === 0) return;

    try {
      setLoadingSuggestions(true);

      // Build context from last N minutes of transcript
      const recentTranscript = session.transcript
        .slice(-10)
        .map((t) => `[${t.timestamp}] ${t.text}`)
        .join("\n");

      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: recentTranscript,
          apiKey: settings.groqApiKey,
          systemPrompt: settings.suggestionPrompt,
          recentBatches: session.suggestionsHistory.slice(0, 3),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Suggestions error status:", response.status);
        console.error("Suggestions error body:", errorText);
        try {
          const error = JSON.parse(errorText);
          console.error("Suggestions error JSON:", error);
        } catch (e) {
          console.error("Could not parse error as JSON");
        }
        return;
      }

      // Parse streaming response
      const reader = response.body?.getReader();
      if (!reader) return;

      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                fullText += content;
                console.log("[Streaming] Received chunk:", JSON.stringify(content));
              }
            } catch (e) {
              console.warn("[Streaming] Could not parse chunk:", data);
              // Keep processing
            }
          }
        }
      }

      console.log("[Suggestions] Full text accumulated (" + fullText.length + " chars)");
      console.log("[Suggestions] First 200 chars:", fullText.substring(0, 200));

      // Try to extract JSON array from accumulated text
      console.log("[Parsing] Starting suggestion parsing...");

      // Try JSON parsing first
      let suggestions: any[] = [];
      let cleanText = repairJSON(fullText);

      console.log("[Parsing] Cleaned text (" + cleanText.length + " chars)");
      console.log("[Parsing] First 200 chars of cleaned:", cleanText.substring(0, 200));

      // More aggressive JSON extraction - look for [ ... ]
      let jsonMatch = cleanText.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        console.log("[Parsing] Found potential JSON array");
        try {
          let jsonStr = jsonMatch[0].trim();
          console.log("[Parsing] JSON match length:", jsonStr.length);
          console.log("[Parsing] JSON match first 100 chars:", jsonStr.substring(0, 100));

          jsonStr = repairJSON(jsonStr);
          console.log("[Parsing] Attempting JSON.parse...");
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Validate suggestion structure
            const validSuggestions = parsed.filter(
              (s) => s.tag && s.preview && typeof s.tag === "string" && typeof s.preview === "string"
            );
            if (validSuggestions.length > 0) {
              suggestions = validSuggestions;
              console.log("✅ [Parsing] Suggestions parsed from JSON, found", validSuggestions.length, "items");
            } else {
              console.warn("[Parsing] Parsed JSON but no valid suggestions found");
            }
          } else {
            console.warn("[Parsing] Parsed JSON but not a non-empty array");
          }
        } catch (e) {
          console.warn("[Parsing] JSON parsing failed:", e instanceof Error ? e.message : String(e));
        }
      } else {
        console.warn("[Parsing] No JSON array found in text");
      }

      // If JSON parsing failed, try regex extraction with better patterns
      if (suggestions.length === 0) {
        try {
          console.log("[Parsing] Attempting regex extraction...");

          // Extract objects that look like suggestions
          // Match patterns like: "tag":"QUESTION","preview":"What is X?"
          const objectPattern = /\{\s*"tag"\s*:\s*"([^"]+)"\s*,\s*"preview"\s*:\s*"([^"]*?)"\s*\}/g;

          let match;
          while ((match = objectPattern.exec(fullText)) !== null) {
            const tag = match[1];
            const preview = match[2];

            // Check if tag is valid
            const validTags = ["ANSWER", "QUESTION", "TALKING_POINT", "FACT_CHECK", "CLARIFICATION"];
            if (validTags.includes(tag) && preview.trim()) {
              suggestions.push({ tag, preview });
              console.log("[Parsing] Found suggestion:", tag, preview);
            }
          }

          if (suggestions.length > 0) {
            console.log("✅ [Parsing] Suggestions extracted from regex, found", suggestions.length, "items");
          } else {
            console.warn("[Parsing] Regex extraction found no matches, trying fallback...");

            // Last resort: extract all tag:preview pairs regardless of format
            const tagPattern = /"tag"\s*:\s*"([^"]+)"/g;
            const previewPattern = /"preview"\s*:\s*"([^"]*?)"/g;

            const tags: string[] = [];
            const previews: string[] = [];

            let tagMatch;
            while ((tagMatch = tagPattern.exec(fullText)) !== null) {
              tags.push(tagMatch[1]);
            }

            let previewMatch;
            while ((previewMatch = previewPattern.exec(fullText)) !== null) {
              previews.push(previewMatch[1]);
            }

            console.log("[Parsing] Fallback - found", tags.length, "tags and", previews.length, "previews");

            // Combine tags and previews
            if (tags.length > 0 && previews.length > 0) {
              suggestions = tags
                .slice(0, 3)
                .map((tag, i) => ({
                  tag,
                  preview: previews[i] || "",
                }))
                .filter((s) => s.preview && s.tag);

              console.log("✅ [Parsing] Suggestions extracted from fallback, found", suggestions.length, "items");
            } else {
              console.warn("[Parsing] Fallback also failed - no tags or previews found");
            }
          }
        } catch (e) {
          console.error("[Parsing] Regex extraction error:", e instanceof Error ? e.message : String(e));
        }
      }

      // Add to session if we got suggestions
      if (suggestions.length > 0) {
        const batch: SuggestionBatch = {
          id: Math.random().toString(),
          generatedAt: new Date().toISOString(),
          suggestions,
          sourcedFromTranscript: session.transcript.slice(-3),
        };
        addSuggestionBatch(batch);
      } else {
        console.warn("Could not extract any suggestions from response");
      }
    } catch (error) {
      console.error("Suggestion generation error:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  // Handle suggestion click - send to chat
  async function handleSuggestionClick(suggestion: Suggestion) {
    if (!settings.groqApiKey) {
      alert("Please set your Groq API key in settings");
      return;
    }

    // Add to chat
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      timestamp: new Date().toISOString(),
      source: "suggestion",
      message: suggestion.preview,
      relatedSuggestion: suggestion.tag,
    };
    addChatMessage(userMsg);

    // Generate detailed answer
    await generateChatResponse(userMsg.id, suggestion.preview);
  }

  // Handle user message
  async function handleSendMessage(message: string) {
    if (!settings.groqApiKey) {
      alert("Please set your Groq API key in settings");
      return;
    }

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      timestamp: new Date().toISOString(),
      source: "direct",
      message,
    };
    addChatMessage(userMsg);

    // Generate response
    await generateChatResponse(userMsg.id, message);
  }

  // Generate chat response with streaming
  async function generateChatResponse(messageId: string, message: string) {
    try {
      setChatLoading(true);
      const startTime = Date.now();

      // Build transcript context
      const recentTranscript = session.transcript
        .slice(-20)
        .map((t) => `[${t.timestamp}] ${t.text}`)
        .join("\n");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          transcriptContext: recentTranscript,
          apiKey: settings.groqApiKey,
          systemPrompt: settings.chatPrompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Chat error status:", response.status);
        console.error("Chat error body:", errorText);
        try {
          const error = JSON.parse(errorText);
          console.error("Chat error JSON:", error);
        } catch (e) {
          console.error("Could not parse chat error as JSON");
        }
        return;
      }

      // Parse streaming response
      const reader = response.body?.getReader();
      if (!reader) return;

      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                fullResponse += parsed.choices[0].delta.content;
              }
            } catch (e) {
              // Keep processing
            }
          }
        }
      }

      console.log("Chat response received:", fullResponse);
      const latency = Date.now() - startTime;
      updateChatMessageResponse(messageId, fullResponse, latency);
    } catch (error) {
      console.error("Chat response error:", error);
    } finally {
      setChatLoading(false);
    }
  }

  // Set up auto-refresh of suggestions
  useEffect(() => {
    if (isRecording) {
      suggestionsTimerRef.current = setInterval(() => {
        generateSuggestions();
      }, 30000);
    }

    return () => {
      if (suggestionsTimerRef.current) {
        clearInterval(suggestionsTimerRef.current);
      }
    };
  }, [isRecording, session.transcript]);

  // Require API key on page load
  useEffect(() => {
    if (isMounted && !settings.groqApiKey) {
      setSettingsOpen(true);
    }
  }, [isMounted, settings.groqApiKey]);

  // Helper function to repair malformed JSON
  function repairJSON(str: string): string {
    // Remove any markdown code blocks
    str = str.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    // Remove leading/trailing whitespace
    str = str.trim();

    // Fix missing colons between key and value (e.g., "preview "value"" -> "preview":"value")
    str = str.replace(/"(\w+)\s+"([^"]+)"/g, '"$1":"$2"');

    // Fix single quotes to double quotes (but be careful with contractions)
    str = str.replace(/'/g, '"');

    // Fix escaped quotes that might cause issues
    str = str.replace(/\\"/g, '"');

    // Fix newlines in string values
    str = str.replace(/\n/g, " ");

    return str;
  }

  return (
    <main className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">
          TwinMind Live Suggestions
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => downloadSessionJSON(session)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition"
          >
            Export Session
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Left Column */}
        <div className="flex flex-col rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
          <TranscriptPanel transcript={session.transcript} />
          <div className="p-4 border-t border-gray-700 flex flex-col items-center gap-4">
            <MicrophoneButton
              isRecording={isRecording}
              onStart={startRecording}
              onStop={stopRecording}
            />
          </div>
        </div>

        {/* Middle Column */}
        <div className="rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
          <SuggestionsPanel
            suggestionsHistory={session.suggestionsHistory}
            onRefresh={generateSuggestions}
            isLoading={suggestionsLoading}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>

        {/* Right Column */}
        <div className="rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
          <ChatPanel
            chatHistory={session.chatHistory}
            onSendMessage={handleSendMessage}
            isLoading={chatLoading}
          />
        </div>
      </div>

      {/* Settings Modal */}
      <div suppressHydrationWarning>
        <SettingsModal
          settings={settings}
          onSave={setSettings}
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    </main>
  );
}
