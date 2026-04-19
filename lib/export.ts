import {
  SessionState,
  ExportedSession,
  SuggestionBatch,
  ChatMessage,
} from "./types";

export function exportSession(session: SessionState): ExportedSession {
  const startTime = new Date(session.startTime);
  const endTime = new Date();
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;

  return {
    exportedAt: new Date().toISOString(),
    sessionDurationMinutes: Math.round(durationMinutes * 100) / 100,
    transcript: session.transcript.map((chunk) => ({
      timestamp: chunk.timestamp,
      text: chunk.text,
      duration: chunk.duration,
    })),
    suggestionBatches: session.suggestionsHistory.map((batch) => ({
      batchId: batch.id,
      generatedAt: batch.generatedAt,
      suggestions: batch.suggestions.map((s) => ({
        tag: s.tag,
        preview: s.preview,
        fullResponse: s.fullResponse,
      })),
    })),
    chatHistory: session.chatHistory.map((msg) => ({
      timestamp: msg.timestamp,
      source: msg.source,
      message: msg.message,
      response: msg.response,
      responseLatencyMs: msg.responseLatencyMs,
    })),
  };
}

export function downloadSessionJSON(session: SessionState): void {
  const exported = exportSession(session);
  const jsonString = JSON.stringify(exported, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `twinmind-session-${new Date().toISOString().split("T")[0]}-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
