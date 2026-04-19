"use client";

import { ChatMessage } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
}

export function ChatPanel({
  chatHistory,
  onSendMessage,
  isLoading = false,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(input);
      setInput("");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">
          3. CHAT (DETAILED ANSWERS)
        </h2>
        <p className="text-xs text-gray-500 mt-1">Session-only</p>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {chatHistory.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            Click a suggestion or type a question below.
          </div>
        ) : (
          chatHistory.map((msg) => (
            <div key={msg.id} className="space-y-2">
              <div className="bg-blue-900 bg-opacity-50 rounded p-3">
                <div className="text-xs text-blue-300 mb-1">
                  {msg.source === "user" ? "You" : "Suggestion"}
                </div>
                <div className="text-sm text-gray-200">{msg.message}</div>
              </div>

              {msg.response && (
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-xs text-gray-400 mb-1">
                    Response ({msg.responseLatencyMs}ms)
                  </div>
                  <div className="text-sm text-gray-200">{msg.response}</div>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="text-sm text-gray-500 italic">Thinking...</div>
        )}
      </div>

      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            rows={3}
            disabled={isSending}
          />
          <button
            onClick={handleSendMessage}
            disabled={isSending || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition self-end"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
