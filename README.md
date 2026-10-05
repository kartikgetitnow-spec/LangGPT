# 🤖 ChatGPT UI - Modern Next.js Frontend

A high-performance, pixel-perfect frontend replica of the **OpenAI ChatGPT interface**, built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS**, and **Lucide Icons**.

This frontend is designed as a standalone UI layer with an easy-to-use plug-and-play service to connect your custom backend.

---

## 🚀 Quick Start

The development server is already running! You can open:
```
http://localhost:3000
```

To run manually:
```bash
# Run development server
npm run dev

# Run production build
npm run build
npm start
```

---

## 🎨 Implemented Features

### 1. **ChatGPT Navigation & Layout**
- **Collapsible Sidebar**: Smooth sliding animation with toggle button (`PanelLeft`). Mobile responsive with backdrop drawer.
- **Categorized Chat History**: Automatically groups conversations into *Pinned*, *Today*, *Yesterday*, *Previous 7 Days*, and *Previous 30 Days*.
- **Conversation Actions**:
  - ✨ Create New Chat
  - ✏️ Inline Rename Conversation Title
  - 📌 Pin / Unpin Conversations
  - 🗑️ Delete Chat
  - 🔍 Live Search through past conversations
- **User Profile**:
  - Plan status badge (*Free Plan*)
  - Theme toggle popover
  - Settings Modal trigger

### 2. **Chat Feed & Interaction**
- **Model Selector Dropdown**: Switch between `GPT-4o`, `GPT-4o mini`, `o1-preview`, and `o1-mini` with badges and capability descriptions.
- **Empty State (Welcome Screen)**:
  - OpenAI mark
  - "What can I help with today?"
  - 4 Interactive prompt suggestion cards (click to auto-fill or ask).
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
- Full ChatGPT Settings Modal (`Ctrl/Cmd + ,` or Profile menu):
  - **Theme**: Dark (authentic ChatGPT `#212121` canvas), Light, or System.
  - **Backend API**: Custom backend URL configuration.
  - **Data Controls**: Export chat history to JSON, Clear all chats.

---

## 🔌 Connecting Your Backend

The backend integration layer is completely decoupled in:
📁 **[`src/services/chatService.ts`](file:///home/kartik/Documents/Projects/LangGpt/src/services/chatService.ts)**

### Step 1: Set your backend URL
Create or edit `.env.local`:
```bash
NEXT_PUBLIC_BACKEND_URL="http://localhost:8000/api/chat"
NEXT_PUBLIC_USE_MOCK=false
```

### Step 2: Streaming Protocol
The `streamChatResponse` function in [`src/services/chatService.ts`](file:///home/kartik/Documents/Projects/LangGpt/src/services/chatService.ts) supports standard HTTP streaming, Server-Sent Events (SSE), or WebSockets.

Expected payload format sent to your backend:
```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "model": "gpt-4o"
}
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── globals.css         # ChatGPT dark/light theme variables & prose styling
│   ├── layout.tsx          # Root layout with ThemeProvider
│   └── page.tsx            # Main shell combining Sidebar + ChatArea
├── components/
│   ├── chat/
│   │   ├── ChatArea.tsx    # Header, message feed, prompt input
│   │   ├── ChatInput.tsx   # Textarea, file attachments, tool pills, send/stop
│   │   ├── CodeBlock.tsx   # Code container with language label and copy action
│   │   ├── MessageItem.tsx # Formatted message with markdown and action toolbar
│   │   ├── MessageList.tsx # Auto-scrolling message history
│   │   ├── ModelSelector.tsx # GPT-4o / o1 selector dropdown
│   │   └── WelcomeScreen.tsx # Prompt cards and greeting
│   ├── sidebar/
│   │   ├── Sidebar.tsx     # Collapsible sidebar shell with search
│   │   ├── ChatHistory.tsx # Date-grouped conversations
│   │   ├── ChatItem.tsx    # Editable title, options menu, pin toggle
│   │   └── UserProfile.tsx # Avatar, plan status, theme/settings popover
│   └── modals/
│       └── SettingsModal.tsx # Settings dialog (Theme, Backend URL, Data Export)
├── context/
│   └── ThemeContext.tsx    # Dark/Light theme provider with localStorage sync
├── hooks/
│   └── useChat.ts          # State management hook for messages, streaming, and chats
├── lib/
│   ├── mockData.ts         # Sample conversations, prompt cards, model list
│   └── utils.ts            # Helper functions
├── services/
│   └── chatService.ts      # Backend connection layer & mock streamer
└── types/
    └── chat.ts             # TypeScript interfaces for messages, chats, models
```
