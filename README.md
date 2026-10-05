# 🤖 LangGPT - Modern AI Chat Interface with LangChain & Context Memory

A high-performance, pixel-perfect AI chat interface powered by **LangChain**, **Google Gemini**, **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS**.

Featuring **Global Context Awareness** with an asynchronous narrative memory synthesized by Gemini into a local persistent database.

---

## 🚀 Quick Start

The development server runs at:
```
http://localhost:3000
```

To run manually:
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production build
npm run build
npm start
```

### Environment Configuration
Create or configure `.env.local`:
```bash
GOOGLE_API_KEY="your-google-gemini-api-key"
```

---

## 🧠 Global Context Awareness & Dynamic Memory

LangGPT maintains long-term memory about the user across all conversations without rigid key-value forms:

1. **Narrative Paragraph Synthesis**: The user's preferences, background, and goals are stored as a natural language biography (e.g. *"Kartik is a senior software engineer who specializes in Next.js and TypeScript..."*).
2. **Local DB Persistence**: Stored in `data/context_db.json`.
3. **Automatic Asynchronous Updates**: After each chat exchange, Gemini checks in the background whether any new durable facts or preferences were shared and updates the narrative profile.
4. **Editable in Settings**: Users can view, edit, or reset their memory paragraph directly in the LangGPT Settings modal.

---

## 🎨 Implemented Features

### 1. **LangGPT Navigation & Layout**
- **Collapsible Sidebar**: Smooth sliding animation with toggle button (`PanelLeft`). Mobile responsive with backdrop drawer.
- **Categorized Chat History**: Automatically groups conversations into *Pinned*, *Today*, *Yesterday*, *Previous 7 Days*, and *Previous 30 Days*.
- **Conversation Actions**:
  - ✨ Create New Chat
  - ✏️ Inline Rename Conversation Title
  - 📌 Pin / Unpin Conversations
  - 🗑️ Delete Chat
  - 🔍 Live Search through past conversations
- **User Profile**:
  - Plan status badge (*LangGPT Pro*)
  - Theme toggle popover
  - Settings Modal trigger

### 2. **Chat Feed & Interaction**
- **Model Selector Dropdown**: Switch between `Gemini 2.5 Flash`, `Gemini 2.5 Pro`, `Gemini Flash Latest`, and `Gemini Pro Latest`.
- **Empty State (Welcome Screen)**:
  - LangGPT branding
  - "What can I help with today?"
  - Interactive prompt suggestion cards.
- **Conversation Stream**:
  - Authentic markdown formatting (`react-markdown` + `remark-gfm`).
  - Syntax highlighted code blocks with language badge and one-click copy button.
  - Streaming cursor animation (`▋`) with **Stop Generating** support.
  - Action toolbar under AI responses: *Copy response*, *Read aloud (TTS)*, *Thumbs up/down*, *Regenerate*, *Share*.
  - Floating *Scroll to Bottom* button when viewing history.

### 3. **Input Prompt Bar**
- Auto-expanding multiline textarea (up to 200px max height).
- Keyboard shortcuts: `Enter` to send, `Shift + Enter` for new lines.
- **File Attachments**: Upload multiple files with preview chips and remove buttons.
- **Tool Pills**:
  - 🌐 *Search the web* toggle
  - 🧠 *Reason / Deep think* toggle
  - 🎙️ *Voice input* toggle
- Dynamic send button (Arrow Up -> Stop Square during generation).

### 4. **Settings & Themes**
- Full LangGPT Settings Modal (`Ctrl/Cmd + ,` or Profile menu):
  - **Memory & Context**: View, edit, or reset the local DB context awareness narrative paragraph.
  - **Theme**: Dark (authentic `#212121` canvas), Light, or System.
  - **Data Controls**: Export chat history to JSON, Clear all chats.
  - **About**: Version information and architecture overview.

---

## 📁 Architecture & Step-by-Step Backend Structure

The server-side implementation is organized into modular steps under `src/server/`:

```
src/server/
├── config/
│   └── env.ts                  # STEP 1: Environment validation & configuration
├── models/
│   └── geminiProvider.ts       # STEP 2: LangChain Google GenAI model factory
├── db/
│   └── contextDb.ts            # STEP 3: Local JSON database for narrative profile memory
├── context/
│   ├── globalContext.ts        # STEP 4: Global system prompt & context injector
│   └── profileUpdater.ts       # STEP 5: LLM background synthesizer for narrative profile
├── memory/
│   └── memoryManager.ts        # STEP 6: Multi-turn sliding window conversation buffer
└── orchestrator/
    └── conversationOrchestrator.ts # STEP 7: Coordinates context, memory, model streaming & updates
```

The Next.js API controller at `src/app/api/chat/route.ts` serves as the HTTP boundary layer (STEP 8), delegating orchestrations and returning real-time response streams.

---

## 📄 License
MIT License.
