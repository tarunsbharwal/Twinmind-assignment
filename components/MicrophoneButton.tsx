"use client";

import { useState, useEffect } from "react";

interface MicrophoneButtonProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function MicrophoneButton({
  isRecording,
  onStart,
  onStop,
}: MicrophoneButtonProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={isRecording ? onStop : onStart}
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 shadow-lg animate-pulse"
            : "bg-blue-500 hover:bg-blue-600 shadow-lg"
        }`}
      >
        <svg
          className="w-10 h-10 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 16.91c-1.48 1.46-3.51 2.36-5.75 2.36s-4.27-.9-5.75-2.36L4 18c1.86 1.86 4.41 3 7.25 3s5.39-1.14 7.25-3l-1.5-1.09zM12 20c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1z" />
        </svg>
      </button>
      <div className="text-sm text-gray-400 text-center">
        {isRecording ? "Recording..." : "Stopped. Click to resume."}
      </div>
    </div>
  );
}
