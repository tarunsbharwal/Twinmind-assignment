"use client";

import { useEffect, useRef } from "react";
import { TranscriptChunk } from "@/lib/types";

interface TranscriptPanelProps {
  transcript: TranscriptChunk[];
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">
          1. MIC & TRANSCRIPT
        </h2>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {transcript.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            Transcript will appear here...
          </div>
        ) : (
          transcript.map((chunk) => (
            <div key={chunk.id} className="text-sm">
              <div className="text-xs text-gray-500">{chunk.timestamp}</div>
              <div className="text-gray-200 mt-1">{chunk.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
