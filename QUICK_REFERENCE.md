# TwinMind - Quick Reference Card (One-Page Summary)

## What is TwinMind?
**A real-time meeting assistant that listens, transcribes, suggests questions, and provides detailed answers.**

---

## 5 Simple Steps

```
┌──────────┐
│1. RECORD │ → User clicks mic button
└────┬─────┘
     │
┌────▼─────────────────────┐
│2. TRANSCRIBE             │ → Audio → Text (Groq API)
└────┬──────────────────────┘
     │
┌────▼──────────────────────┐
│3. LIVE SUGGESTIONS        │ → AI generates Q's & points (Groq API)
└────┬──────────────────────┘
     │
┌────▼──────────────────────┐
│4. USER CLICKS SUGGESTION  │ → User wants to know more
└────┬──────────────────────┘
     │
┌────▼──────────────────────┐
│5. DETAILED ANSWER         │ → AI explains deeply (Claude API)
└──────────────────────────┘
```

---

## Three Panels (Displayed Simultaneously)

| Panel 1: TRANSCRIPT | Panel 2: SUGGESTIONS | Panel 3: CHAT |
|---|---|---|
| What was said (with time) | Questions to ask | Detailed answers |
| 0:00 "Hi everyone..." | ❓ "What tech?" | "Based on context..." |
| 0:30 "I'm from IIT..." | 💡 "IIT benefits" | [Full explanation] |
| | ❔ "Location?" | |

---

## Three API Endpoints

### 1️⃣ /api/transcribe
- **Input:** Audio (Base64)
- **Process:** Send to Groq's Whisper
- **Output:** Text transcript
- **Called:** Every 30 seconds

### 2️⃣ /api/suggestions  
- **Input:** Transcript text
- **Process:** Send to Groq's LLaMA
- **Output:** Array of {tag, preview}
- **Called:** Every 10 seconds (auto)

### 3️⃣ /api/chat
- **Input:** Question + full context
- **Process:** Send to Claude API
- **Output:** Detailed answer (streamed)
- **Called:** When user clicks a suggestion

---

## Data Types

### Transcript
```
[
  { timestamp: "0:00", text: "Hi everyone, my name is Tarun" },
  { timestamp: "0:30", text: "I am a B.Tech graduate from IIT" }
]
```

### Suggestion
```
{
  tag: "QUESTION" | "TALKING_POINT" | "CLARIFICATION",
  preview: "What tech stack do you know?"
}
```

### Chat Message
```
{
  type: "suggestion" | "user" | "assistant",
  content: "The full response text"
}
```

---

## Key Concepts

**Streaming:**
- Data sent in chunks (not all at once)
- Faster perceived response
- Updates UI in real-time

**Base64:**
- Converts binary audio to text format
- Safe to send over internet
- Backend decodes it back

**JSON:**
- Data format: `{"key": "value"}`
- Must have quotes around keys
- Any formatting error causes parsing to fail

**API Keys:**
- Secret codes to access APIs
- Kept in `.env.local` (not in code!)
- One key per service (Groq, Claude)

---

## Flow Diagram (Visual)

```
┌─────────────────────────────────────────────────┐
│         BROWSER (Frontend / React)              │
│                                                 │
│  ┌──────────┬────────────┬──────────────┐      │
│  │TRANSCRIPT│ SUGGESTIONS│ CHAT ANSWERS │      │
│  └──────────┴────────────┴──────────────┘      │
└─────────────────────────────────────────────────┘
  ↕          ↕                ↕
/transcribe  /suggestions     /chat

┌─────────────────────────────────────────────────┐
│      SERVER (Backend / Node.js API)             │
│                                                 │
│  ┌──────────────────────────────────────┐      │
│  │ Calls External APIs                 │      │
│  │ • Groq (transcribe + suggest)       │      │
│  │ • Claude (detailed answers)         │      │
│  └──────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
  ↕          ↕                ↕
Groq API   Groq API       Claude API
```

---

## File Map (What Goes Where)

```
app/page.tsx
  ↓
  • Displays UI
  • Shows all 3 panels
  • Handles recording

app/api/transcribe/route.ts      → Calls Groq (audio→text)
app/api/suggestions/route.ts     → Calls Groq (text→questions)
app/api/chat/route.ts            → Calls Claude (answer→detailed)

hooks/useAudioCapture.ts         → Records microphone
contexts/SessionContext.tsx       → Stores session data
components/                       → UI pieces
  • TranscriptPanel
  • SuggestionsPanel
  • ChatPanel
```

---

## Typical Interaction Example

```
User: *Speaks for 30 seconds*
  ↓ (30 seconds pass)
App: Transcribes and shows text
  ↓ (automatically)
App: Generates 3-5 suggestions
  ↓ (User reads them)
User: Clicks "What tech stack do you know?"
  ↓ (Streaming response)
App: Shows detailed answer from Claude
  ↓
User: Continues listening
  ↓ (30 seconds)
App: New transcription arrives
  ↓
Process repeats...
```

---

## Error We Fixed

### Problem
```
Suggestions API returned:
{ tag: "QUESTION" }  ← Unquoted key

JSON.parse() tried to parse:
ERROR: Expected property name or '}'
```

### Why
- JSON requires: `{"tag": "value"}`
- API gave us: `{tag: "value"}`
- Parser failed

### Solution
```javascript
// Regex to add quotes
str.replace(/(\w+):\s+/g, '"$1": ')

// Changed to:
{ "tag": "QUESTION" }  ← Now valid JSON!
```

---

## How to Use (For Interview)

**Question:** "Explain this TwinMind app"

**Your Answer:**
```
"TwinMind is a real-time meeting assistant built with Next.js 
and React. It has 3 main components:

1. TRANSCRIPTION: Uses Groq's Whisper API to convert 
   speech to text every 30 seconds

2. LIVE SUGGESTIONS: Uses Groq's LLaMA model to generate
   questions to ask, talking points, and clarifications

3. DETAILED CHAT: Uses Claude API to provide in-depth 
   answers based on meeting context

The app displays all three in real-time, and uses streaming
to show responses as they're generated. Data flows from 
microphone → backend → AI APIs → UI."
```

---

## API Rate Limits (Approx)

| API | Free Tier | Cost |
|-----|-----------|------|
| Groq | ~5 reqs/min | Free |
| Claude | Based on plan | $0.003-0.15 per 1K tokens |

---

## Security Checklist

✅ API keys in `.env.local` (not uploaded to Git)
✅ Keys never sent to frontend
✅ Backend handles all API calls
✅ User can provide their own keys
✅ Session data stored in memory (not persistent)

---

## Technologies Used

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Next.js API Routes
- **AI/APIs:** Groq, Anthropic (Claude)
- **Audio:** Browser Web Audio API

---

## Deployment Consideration

**Current:** Runs locally only
**To deploy:** Would need
  - Server (Vercel, AWS, etc.)
  - Environment variables for API keys
  - HTTPS (required for microphone access)
  - CORS configuration

---

## What You Learned

1. How to build full-stack AI applications
2. How to work with streaming APIs
3. How to handle real-time data in React
4. How to debug complex data flows
5. How to integrate multiple AI services
6. Security best practices with API keys

---

## Ready for Interview? ✅

You can now explain:
- What the app does
- How data flows
- What each component does
- How to debug it
- What technologies are used
- Problems faced and how you solved them
