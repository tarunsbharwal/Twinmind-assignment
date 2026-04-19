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

  const [settingsOpen, setSettingsOpen] = useState(!settings.groqApiKey);
  const [suggestionsLoading, setLoadingSuggestions] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const suggestionsTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        const error = await response.json();
        console.error("Transcription error:", error);
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
        const error = await response.json();
        console.error("Suggestions error:", error);
        return;
      }

      // Parse streaming response
      const reader = response.body?.getReader();
      if (!reader) return;

      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        buffer += chunk;
        fullText += chunk;

        try {
          const lines = buffer.split("\n");
          buffer = lines[lines.length - 1];
        } catch (e) {
          // Keep buffering
        }
      }

      // Try to extract JSON array from response text
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const batch: SuggestionBatch = {
            id: Math.random().toString(),
            generatedAt: new Date().toISOString(),
            suggestions: parsed,
            sourcedFromTranscript: session.transcript.slice(-3),
          };
          addSuggestionBatch(batch);
        } catch (e) {
          console.error("Failed to parse suggestions JSON:", e);
        }
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
        const error = await response.json();
        console.error("Chat error:", error);
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
        try {
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring(6);
              if (data === "[DONE]") continue;

              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                fullResponse += parsed.choices[0].delta.content;
              }
            }
          }
        } catch (e) {
          // Keep processing
        }
      }

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
    if (!settings.groqApiKey) {
      setSettingsOpen(true);
    }
  }, []);

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
      <SettingsModal
        settings={settings}
        onSave={setSettings}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}
