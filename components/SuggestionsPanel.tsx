"use client";

import { SuggestionBatch, Suggestion } from "@/lib/types";
import { useState, useEffect } from "react";

interface SuggestionsPanelProps {
  suggestionsHistory: SuggestionBatch[];
  onRefresh: () => void;
  isLoading?: boolean;
  onSuggestionClick: (suggestion: Suggestion) => void;
}

export function SuggestionsPanel({
  suggestionsHistory,
  onRefresh,
  isLoading = false,
  onSuggestionClick,
}: SuggestionsPanelProps) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 30 : c - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const tagColors: Record<string, string> = {
    ANSWER: "bg-green-900 text-green-200",
    QUESTION: "bg-blue-900 text-blue-200",
    TALKING_POINT: "bg-yellow-900 text-yellow-200",
    FACT_CHECK: "bg-purple-900 text-purple-200",
    CLARIFICATION: "bg-pink-900 text-pink-200",
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">
          2. LIVE SUGGESTIONS
        </h2>
        <span className="text-xs text-gray-500">
          {suggestionsHistory.length} BATCHES
        </span>
      </div>

      <div className="px-4 py-3 border-b border-gray-700 flex gap-3">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition"
        >
          {isLoading ? "Loading..." : "Reload suggestions"}
        </button>
        <span className="text-xs text-gray-500">auto-refresh in {countdown}s</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {suggestionsHistory.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            Suggestions will appear every ~30 seconds
          </div>
        ) : (
          suggestionsHistory.map((batch, batchIdx) => (
            <div
              key={batch.id}
              className={`space-y-2 ${
                batchIdx > 0 ? "opacity-50" : "opacity-100"
              }`}
            >
              <div className="text-xs text-gray-500">
                Batch {suggestionsHistory.length - batchIdx}
              </div>

              <div className="grid gap-2">
                {batch.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSuggestionClick(suggestion)}
                    className="p-3 border border-gray-700 rounded hover:border-gray-600 hover:bg-gray-800 transition text-left"
                  >
                    <div
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-2 ${
                        tagColors[suggestion.tag] ||
                        "bg-gray-700 text-gray-200"
                      }`}
                    >
                      {suggestion.tag}
                    </div>
                    <div className="text-sm text-gray-200">
                      {suggestion.preview}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
