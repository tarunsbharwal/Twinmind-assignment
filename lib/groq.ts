import { Readable } from "stream";

export class GroqClient {
  private apiKey: string;
  private baseUrl = "https://api.groq.com/openai/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audioBase64: string): Promise<string> {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([Buffer.from(audioBase64, "base64")], { type: "audio/wav" }),
      "audio.wav"
    );
    formData.append("model", "whisper-large-v3-turbo");

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Transcription failed: ${JSON.stringify(error)}`);
    }

    const result = (await response.json()) as { text: string };
    return result.text;
  }

  async generateSuggestions(
    transcript: string,
    systemPrompt: string
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Recent meeting transcript:\n\n${transcript}\n\nGenerate 3 suggestions now.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Suggestions failed: ${JSON.stringify(error)}`);
    }

    return response.body as ReadableStream<Uint8Array>;
  }

  async generateChat(
    message: string,
    transcriptContext: string,
    systemPrompt: string
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Meeting context:\n${transcriptContext}\n\nUser question: ${message}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Chat failed: ${JSON.stringify(error)}`);
    }

    return response.body as ReadableStream<Uint8Array>;
  }

  validateApiKey = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  };
}

export function createGroqClient(apiKey: string): GroqClient {
  return new GroqClient(apiKey);
}
