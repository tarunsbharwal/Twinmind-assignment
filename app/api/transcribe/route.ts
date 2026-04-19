import { createGroqClient } from "@/lib/groq";
import { TranscribeRequest, TranscribeResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { audioBase64, apiKey } = (await request.json()) as TranscribeRequest & { apiKey: string };

    if (!audioBase64 || !apiKey) {
      return NextResponse.json(
        { error: "Missing audioBase64 or apiKey" },
        { status: 400 }
      );
    }

    const groq = createGroqClient(apiKey);
    const text = await groq.transcribe(audioBase64);

    const response: TranscribeResponse = {
      text,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 500 }
    );
  }
}
