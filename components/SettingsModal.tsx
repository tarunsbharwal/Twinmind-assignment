"use client";

import { SessionSettings } from "@/lib/types";
import { useState } from "react";
import { DEFAULT_PROMPTS, DEFAULT_CONTEXT_WINDOWS } from "@/lib/prompts";

interface SettingsModalProps {
  settings: SessionSettings;
  onSave: (settings: SessionSettings) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  onSave,
  isOpen,
  onClose,
}: SettingsModalProps) {
  const [formData, setFormData] = useState(settings);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validateError, setValidateError] = useState("");

  const handleSave = async () => {
    if (!formData.groqApiKey.trim()) {
      setValidateError("API key is required");
      return;
    }

    setValidateError("");
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-y-auto w-full mx-4">
        <h2 className="text-xl font-bold text-white mb-6">Settings</h2>

        <div className="space-y-6">
          {/* API Key */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Groq API Key
            </label>
            <input
              type="password"
              value={formData.groqApiKey}
              onChange={(e) =>
                setFormData({ ...formData, groqApiKey: e.target.value })
              }
              placeholder="gsk_..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Get your key from console.groq.com
            </p>
            {validateError && (
              <p className="text-xs text-red-400 mt-1">{validateError}</p>
            )}
          </div>

          {/* Context Windows */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Suggestion Context (tokens)
              </label>
              <input
                type="number"
                min="100"
                max="1000"
                value={formData.contextWindowSuggestions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contextWindowSuggestions: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Chat Context (tokens)
              </label>
              <input
                type="number"
                min="200"
                max="2000"
                value={formData.contextWindowChat}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contextWindowChat: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Advanced Section */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
            >
              {showAdvanced ? "▼" : "▶"} Advanced Prompts
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Suggestion Prompt
                  </label>
                  <textarea
                    value={formData.suggestionPrompt}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        suggestionPrompt: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                    rows={6}
                  />
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        suggestionPrompt: DEFAULT_PROMPTS.suggestions,
                      })
                    }
                    className="text-xs text-gray-400 hover:text-gray-300 mt-2"
                  >
                    Reset to default
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Chat Prompt
                  </label>
                  <textarea
                    value={formData.chatPrompt}
                    onChange={(e) =>
                      setFormData({ ...formData, chatPrompt: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                    rows={4}
                  />
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        chatPrompt: DEFAULT_PROMPTS.chat,
                      })
                    }
                    className="text-xs text-gray-400 hover:text-gray-300 mt-2"
                  >
                    Reset to default
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            Save Settings
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
