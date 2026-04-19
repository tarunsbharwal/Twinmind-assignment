import { createGroqClient } from "@/lib/groq";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message, transcriptContext, apiKey, systemPrompt } =
      await request.json();

    if (!message || !apiKey || !systemPrompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const groq = createGroqClient(apiKey);
    const stream = await groq.generateChat(
      message,
      transcriptContext || "",
      systemPrompt
    );

    if (!stream) {
      return NextResponse.json(
        { error: "No stream response" },
        { status: 500 }
      );
    }

    // Create a new Response with streaming body
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Chat failed",
      },
      { status: 500 }
    );
  }
}
