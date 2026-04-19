// Session and transcript types
export interface TranscriptChunk {
  id: string;
  text: string;
  timestamp: string;
  duration: number; // seconds
  startTime: number; // Date.now() when chunk started
}

export interface Suggestion {
  tag: "ANSWER" | "QUESTION" | "TALKING_POINT" | "FACT_CHECK" | "CLARIFICATION";
  preview: string; // 30-40 chars
  fullResponse?: string; // detailed answer when clicked
}

export interface SuggestionBatch {
  id: string;
  generatedAt: string;
  suggestions: Suggestion[];
  sourcedFromTranscript: TranscriptChunk[];
}

export interface ChatMessage {
  id: string;
  timestamp: string;
  source: "user" | "suggestion" | "direct"; // direct = typed by user
  message: string;
  response?: string;
  responseLatencyMs?: number;
  relatedSuggestion?: string; // suggestion ID if clicked
}

export interface SessionState {
  sessionId: string;
  startTime: string;
  isRecording: boolean;
  transcript: TranscriptChunk[];
  suggestionsHistory: SuggestionBatch[];
  chatHistory: ChatMessage[];
}

export interface SessionSettings {
  groqApiKey: string;
  suggestionPrompt: string;
  chatPrompt: string;
  contextWindowSuggestions: number;
  contextWindowChat: number;
}

export interface ExportedSession {
  exportedAt: string;
  sessionDurationMinutes: number;
  transcript: Array<{
    timestamp: string;
    text: string;
    duration: number;
  }>;
  suggestionBatches: Array<{
    batchId: string;
    generatedAt: string;
    suggestions: Array<{
      tag: string;
      preview: string;
      fullResponse?: string;
    }>;
  }>;
  chatHistory: Array<{
    timestamp: string;
    source: string;
    message: string;
    response?: string;
    responseLatencyMs?: number;
  }>;
}

// API request/response types
export interface TranscribeRequest {
  audioBase64: string;
}

export interface TranscribeResponse {
  text: string;
  timestamp: string;
}

export interface SuggestionsRequest {
  transcript: string;
  recentBatches: SuggestionBatch[];
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
}

export interface ChatRequest {
  message: string;
  transcriptContext: string;
  relatedSuggestion?: string;
}
