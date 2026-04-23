# TwinMind Live Suggestions

A real-time AI meeting copilot that listens to live audio and continuously surfaces 3 useful suggestions based on what's being said.

## Quick Start

### Prerequisites
- Node.js 18+
- Groq API key (free from [console.groq.com](https://console.groq.com))

### Installation & Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

1. Click ⚙️ **Settings** button
2. Paste your Groq API key
3. Click the blue **microphone button** to start recording
4. Wait ~30 seconds for first transcript chunk
5. Suggestions will auto-generate every ~30 seconds
6. Click any suggestion card to expand in the chat panel

## Project Structure

```
src/
├── app/
│   ├── page.tsx           # Main 3-column layout & orchestration
│   ├── layout.tsx         # Root layout with SessionProvider
│   └── api/
│       ├── transcribe/    # Whisper V3 transcription endpoint
│       ├── suggestions/   # GPT-OSS suggestion generation endpoint
│       └── chat/          # Chat response streaming endpoint
├── components/
│   ├── MicrophoneButton.tsx      # Recording control
│   ├── TranscriptPanel.tsx       # Left column: transcript display
│   ├── SuggestionsPanel.tsx      # Middle column: suggestion cards
│   ├── ChatPanel.tsx             # Right column: chat interface
│   └── SettingsModal.tsx         # Settings configuration
├── contexts/
│   └── SessionContext.tsx        # Global session state management
├── hooks/
│   └── useAudioCapture.ts        # Web Audio API integration
├── lib/
│   ├── types.ts          # TypeScript type definitions
│   ├── groq.ts           # Groq API client
│   ├── prompts.ts        # System prompts and defaults
│   └── export.ts         # Session export utilities
└── styles/
    └── globals.css       # Tailwind styles
```

## Architecture & Technical Decisions

### Tech Stack
- **Frontend:** Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes (serverless)
- **LLM Provider:** Groq (Whisper Large V3 + Mixtral 8x7B)
- **Audio:** Web Audio API (MediaRecorder)
- **State:** React Context + localStorage
- **Deployment:** Vercel

### Audio Pipeline

1. **Capture:** Web Audio API captures 30-second chunks from user's microphone
2. **Transcribe:** Each 30s chunk sent to `/api/transcribe` endpoint
3. **Groq Integration:** Uses Whisper Large V3 for fast, accurate transcription
4. **Auto-append:** Transcript chunks displayed immediately, no clearing
5. **Auto-scroll:** UI scrolls to latest transcript entry

### Suggestion Generation Strategy

**Prompt Engineering Approach:**

The system generates 3 diverse suggestions every ~30 seconds based on recent conversation context. Key strategies:

1. **Context-Aware Variation:** Suggestions type based on what was just discussed
   - **ANSWER**: If a question was asked → provide the answer
   - **QUESTION**: If a statement was made → ask a clarifying follow-up
   - **FACT_CHECK**: If a claim needs verification
   - **TALKING_POINT**: Relevant insight or industry best practice
   - **CLARIFICATION**: Request details on vague points

2. **Avoiding Repetition:** System tracks last 3 suggestion batches and explicitly excludes them from new generations

3. **Concise but Specific Previews:** Each card preview is kept to 70-100 characters to provide highly specific, technical insights (e.g. "Topic: Insight") rather than generic summaries.
4. **Context Window:** Includes last 10 transcript chunks (~2-3 minutes) for continuity without overwhelming the model

5. **Smart Prompt Design:**
   ```
   "You are TwinMind, an AI meeting suggestion engine...
   HIGHLY SPECIFIC - Previews must be 70-100 chars. Include specific technical details, numbers, or architectural insights. Never over-summarize into generic phrases. Use a 'Topic: Detailed Insight' format."
   ```
   - Enforces specific technical depth over generic summaries
   - Explicit instruction for "exactly 3"
   - "RIGHT NOW" emphasizes recency bias
   - JSON output format specified for structured parsing

### Latency Optimization

**Target: 2-5 seconds from audio chunk arrival to suggestions rendered**

1. **Streaming Responses:** API endpoints stream tokens using Server-Sent Events format
2. **Non-blocking UI:** Frontend doesn't wait for full response before rendering
3. **First Token Latency:** <2s for chat responses (critical for perceived responsiveness)
4. **Token Accumulation:** Suggestions and chat responses accumulate incrementally

**Measured Breakdown:**
- 0-1s: Audio sent to Groq Whisper
- 1-2s: Transcription received
- 2-3s: Sent to suggestion endpoint
- 3-4s: First tokens from GPT-OSS 120B
- 4-5s: Rendered in UI

### API Routes

#### `POST /api/transcribe`
- Input: Audio chunk (base64)
- Model: Whisper Large V3 Turbo
- Output: Plain text transcription with timestamp
- Latency: ~1-2 seconds

#### `POST /api/suggestions`
- Input: Recent transcript, system prompt, previous batches
- Model: Mixtral-8x7B-32768 (GPT-OSS compatible)
- Output: Streaming JSON array of 3 suggestions
- Latency: 2-4 seconds (streamed)
- **Exclusion Logic:** Tracks `recentBatches` parameter, explicitly asks model not to repeat

#### `POST /api/chat`
- Input: User message, full transcript context, system prompt
- Model: Mixtral-8x7B-32768
- Output: Streaming detailed answer
- Latency: 1-3 seconds to first token
- **Context:** Includes last 20 transcript chunks for coherent answers

### State Management

**SessionContext** (React Context + localStorage):
- `session.transcript[]`: All transcript chunks with timestamps
- `session.suggestionsHistory[]`: Last N suggestion batches (newest first)
- `session.chatHistory[]`: Chat messages with responses and latencies
- **Persistence:** Settings stored in localStorage; session data cleared on page reload (by design - "session-only" requirement)

### Recent Architecture Fixes
1. **Audio Latency:** Switched `MediaRecorder` Blob encoding to `audio/webm` to prevent 20-second FFmpeg demuxing stalls in Whisper API.
2. **State Management:** Converted suggestion generation from a brittle `setInterval` to a reactive `useEffect` tied to `session.transcript.length`.
3. **JSON Parsing:** Removed destructive regex "repairs" that corrupted valid JSON strings containing colons (e.g., `Topic: Insight`).

### Export Format

Clicking **Export Session** downloads `twinmind-session-${date}-${timestamp}.json`:

```json
{
  "exportedAt": "2026-04-19T14:32:45.123Z",
  "sessionDurationMinutes": 15.5,
  "transcript": [
    { "timestamp": "14:30:15", "text": "...", "duration": 30 }
  ],
  "suggestionBatches": [
    {
      "batchId": "abc123",
      "generatedAt": "2026-04-19T14:32:00Z",
      "suggestions": [
        { "tag": "QUESTION", "preview": "...", "fullResponse": "..." }
      ]
    }
  ],
  "chatHistory": [
    {
      "timestamp": "2026-04-19T14:32:30Z",
      "source": "user|suggestion|direct",
      "message": "...",
      "response": "...",
      "responseLatencyMs": 2150
    }
  ]
}
```

## Settings & Configuration

All settings are user-configurable and persisted to browser localStorage:

- **Groq API Key** (required): Validates on save
- **Context Windows:** Adjustable token limits for suggestions (300-1000) and chat (500-2020)
- **Advanced Prompts:** Editable system prompts for suggestions and chat with reset-to-defaults option

**Default Prompts** (hardcoded in `lib/prompts.ts`):
- Optimized for meeting context
- Emphasis on actionable, concise output
- Built-in variation instructions

## Deployment

Deploy to Vercel with a single command:

```bash
npm i -g vercel
vercel deploy --prod
```

No environment variables needed - API key is user-provided.

## Troubleshooting

- **No mic access:** Check browser permissions chrome://settings/privacy/microphone
- **No suggestions:** Verify API key and wait for first 30s transcript chunk
- **Slow responses:** Check network latency in DevTools

## Code Quality

- TypeScript throughout
- No dead code
- Sensible abstractions (SessionContext, custom hooks)
- Error handling with graceful degradation
- Stream-based responses for latency optimization

---

**Built for TwinMind** | See plan file for prompt strategy and architectural decisions

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
