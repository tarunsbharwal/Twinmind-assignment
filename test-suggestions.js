// Test script to debug suggestions API
const testSuggestions = async () => {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    console.error("GROQ_API_KEY environment variable not set");
    return;
  }

  const systemPrompt = `You are TwinMind, an AI meeting suggestion engine. Your role is to analyze live meeting conversations and surface the most useful, actionable suggestions at each moment.

CRITICAL: You must return ONLY a valid JSON array. No markdown, no code blocks, no extra text.

Your suggestions should be:
1. DIVERSE - Mix of questions, answers, talking points, fact-checks, and clarifications
2. CONTEXTUAL - Based on what was just said, not generic
3. ACTIONABLE - Each suggestion should be immediately useful
4. CONCISE - Previews must be 30-40 chars max

Analyze the recent conversation and generate exactly 3 suggestions that would be most helpful RIGHT NOW.

Consider these types:
- ANSWER: If someone just asked a question, provide the answer
- QUESTION: If there's an opening to dig deeper, ask a relevant follow-up
- TALKING_POINT: If there's a useful fact or perspective relevant to the discussion
- FACT_CHECK: If a claim was made, offer to verify or provide context
- CLARIFICATION: If something was vague, ask for or offer clarification

Return ONLY this exact JSON format with NO extra characters:
[
  {"tag":"TYPE","preview":"Short text"},
  {"tag":"TYPE","preview":"Short text"},
  {"tag":"TYPE","preview":"Short text"}
]

Do not repeat suggestions from recent batches that are still visible.`;

  const transcript = `[10:30:45] John: I think we should migrate to TypeScript
[10:30:50] Sarah: That's a big change, what's the benefit?
[10:31:00] John: Type safety and better IDE support
[10:31:15] Mike: But won't it slow down development?`;

  console.log("Testing Groq Suggestions API...");
  console.log("Sending request to https://api.groq.com/openai/v1/chat/completions");
  console.log("");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
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
      const errorText = await response.text();
      console.error("API Error Status:", response.status);
      console.error("API Error Body:", errorText);
      return;
    }

    console.log("Response Headers:", {
      "content-type": response.headers.get("content-type"),
      "transfer-encoding": response.headers.get("transfer-encoding"),
    });
    console.log("");
    console.log("Streaming response:");
    console.log("---");

    let fullText = "";
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      console.log("Chunk:", JSON.stringify(chunk));

      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.substring(6);
          if (data === "[DONE]") {
            console.log("  -> [DONE]");
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              fullText += content;
              console.log("  -> content:", JSON.stringify(content));
            }
          } catch (e) {
            console.log("  -> (could not parse)");
          }
        }
      }
    }

    console.log("---");
    console.log("");
    console.log("Full accumulated text:");
    console.log(fullText);
    console.log("");

    // Try to parse it
    try {
      const parsed = JSON.parse(fullText);
      console.log("✅ Successfully parsed as JSON:");
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log("❌ Failed to parse as JSON:");
      console.log("Error:", e.message);

      // Try regex extraction
      console.log("");
      console.log("Trying regex extraction...");
      const objectPattern = /\{\s*"tag"\s*:\s*"([^"]+)"\s*,\s*"preview"\s*:\s*"([^"]*?)"\s*\}/g;
      let match;
      const suggestions = [];
      while ((match = objectPattern.exec(fullText)) !== null) {
        suggestions.push({ tag: match[1], preview: match[2] });
      }

      if (suggestions.length > 0) {
        console.log("✅ Extracted suggestions via regex:");
        console.log(JSON.stringify(suggestions, null, 2));
      } else {
        console.log("❌ Could not extract any suggestions");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

testSuggestions();
