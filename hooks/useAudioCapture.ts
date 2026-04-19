"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseAudioCaptureOptions {
  chunkDurationMs?: number;
  onChunkReady?: (audioBase64: string) => void;
  onError?: (error: Error) => void;
}

export function useAudioCapture({
  chunkDurationMs = 30000, // 30 seconds
  onChunkReady,
  onError,
}: UseAudioCaptureOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onerror = (e) => {
        if (onError) {
          onError(new Error(`MediaRecorder error: ${e.error}`));
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Set interval to capture chunks every 30 seconds
      chunkTimerRef.current = setInterval(() => {
        if (mediaRecorder.state === "recording") {
          // Stop current recording to get data
          mediaRecorder.stop();

          // Wait a bit for ondataavailable to fire, then restart
          setTimeout(() => {
            if (chunksRef.current.length > 0) {
              const blob = new Blob(chunksRef.current, { type: "audio/wav" });
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = (reader.result as string).split(",")[1];
                if (onChunkReady) {
                  onChunkReady(base64);
                }
              };
              reader.readAsDataURL(blob);
            }

            chunksRef.current = [];

            // Restart recording
            if (streamRef.current && mediaRecorderRef.current) {
              mediaRecorderRef.current.start();
            }
          }, 100);
        }
      }, chunkDurationMs);
    } catch (error) {
      if (onError) {
        onError(
          error instanceof Error
            ? error
            : new Error("Failed to access microphone")
        );
      }
    }
  }, [chunkDurationMs, onChunkReady, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      mediaRecorderRef.current = null;
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
