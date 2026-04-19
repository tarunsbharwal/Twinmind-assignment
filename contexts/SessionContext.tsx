"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  SessionState,
  TranscriptChunk,
  SuggestionBatch,
  ChatMessage,
  SessionSettings,
} from "@/lib/types";
import { DEFAULT_PROMPTS, DEFAULT_CONTEXT_WINDOWS } from "@/lib/prompts";

const SESSION_STORAGE_KEY = "twinmind_session";
const SETTINGS_STORAGE_KEY = "twinmind_settings";

interface SessionContextType {
  session: SessionState;
  settings: SessionSettings;
  addTranscriptChunk: (chunk: TranscriptChunk) => void;
  addSuggestionBatch: (batch: SuggestionBatch) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateChatMessageResponse: (
    messageId: string,
    response: string,
    latencyMs: number
  ) => void;
  setSettings: (settings: SessionSettings) => void;
  resetSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

function createInitialSession(): SessionState {
  return {
    sessionId: Math.random().toString(36).substring(2, 11),
    startTime: new Date().toISOString(),
    isRecording: false,
    transcript: [],
    suggestionsHistory: [],
    chatHistory: [],
  };
}

function createInitialSettings(): SessionSettings {
  if (typeof window === "undefined") {
    return {
      groqApiKey: "",
      suggestionPrompt: DEFAULT_PROMPTS.suggestions,
      chatPrompt: DEFAULT_PROMPTS.chat,
      contextWindowSuggestions: DEFAULT_CONTEXT_WINDOWS.suggestions,
      contextWindowChat: DEFAULT_CONTEXT_WINDOWS.chat,
    };
  }

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load settings from localStorage", e);
  }

  return {
    groqApiKey: "",
    suggestionPrompt: DEFAULT_PROMPTS.suggestions,
    chatPrompt: DEFAULT_PROMPTS.chat,
    contextWindowSuggestions: DEFAULT_CONTEXT_WINDOWS.suggestions,
    contextWindowChat: DEFAULT_CONTEXT_WINDOWS.chat,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(createInitialSession());
  const [settings, setSettingsState] = useState<SessionSettings>(
    createInitialSettings()
  );

  const addTranscriptChunk = useCallback((chunk: TranscriptChunk) => {
    setSession((prev) => ({
      ...prev,
      transcript: [...prev.transcript, chunk],
    }));
  }, []);

  const addSuggestionBatch = useCallback((batch: SuggestionBatch) => {
    setSession((prev) => ({
      ...prev,
      suggestionsHistory: [batch, ...prev.suggestionsHistory],
    }));
  }, []);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setSession((prev) => ({
      ...prev,
      chatHistory: [...prev.chatHistory, message],
    }));
  }, []);

  const updateChatMessageResponse = useCallback(
    (messageId: string, response: string, latencyMs: number) => {
      setSession((prev) => ({
        ...prev,
        chatHistory: prev.chatHistory.map((msg) =>
          msg.id === messageId
            ? { ...msg, response, responseLatencyMs: latencyMs }
            : msg
        ),
      }));
    },
    []
  );

  const setSettings = useCallback((newSettings: SessionSettings) => {
    setSettingsState(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error("Failed to save settings to localStorage", e);
    }
  }, []);

  const resetSession = useCallback(() => {
    setSession(createInitialSession());
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        settings,
        addTranscriptChunk,
        addSuggestionBatch,
        addChatMessage,
        updateChatMessageResponse,
        setSettings,
        resetSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
