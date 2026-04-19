import { createGroqClient } from "@/lib/groq";
import { SuggestionBatch, Suggestion } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { transcript, apiKey, systemPrompt, recentBatches } =
      await request.json();

    if (!transcript || !apiKey || !systemPrompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const groq = createGroqClient(apiKey);

    // Build prompt that avoids recent suggestions
    let prompt = systemPrompt;
    if (recentBatches && recentBatches.length > 0) {
      const recentSuggestions = recentBatches
        .slice(0, 3)
        .flatMap((b: SuggestionBatch) => b.suggestions.map((s: Suggestion) => s.preview))
        .join("; ");
      prompt += `\n\nDO NOT repeat these recent suggestions: ${recentSuggestions}`;
    }

    const stream = await groq.generateSuggestions(transcript, prompt);

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
    console.error("Suggestions error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Suggestions generation failed",
      },
      { status: 500 }
    );
  }
}
