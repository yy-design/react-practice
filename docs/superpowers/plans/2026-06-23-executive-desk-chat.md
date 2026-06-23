# Executive Desk Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing React chat prototype into a polished Executive Desk AI workbench while preserving current chat behavior.

**Architecture:** Keep the current `ChatPage` parent and `ChatView` child structure. `ChatPage` remains responsible for conversation state and sidebar behavior, while `ChatView` remains responsible for AI SDK chat behavior, message rendering, error rendering, and input submission. Styling stays in `src/pages/ChatPage.css` with global body defaults in `src/index.css`.

**Tech Stack:** React 19, Vite 8, `@ai-sdk/react`, `react-markdown`, `remark-gfm`, plain CSS.

## Global Constraints

- No backend or AI SDK behavior changes are required.
- Keep `useChat` usage in `ChatView`.
- Keep message persistence through `onMessagesChange`.
- Keep conversation creation and switching in `ChatPage`.
- Derive the active conversation title for the workspace header from the current conversation.
- Desktop is the primary demo target.
- At tablet/mobile widths, the sidebar remains collapsible and the chat workspace fills the viewport.
- Text and controls must not overlap or resize unexpectedly.
- Out of scope: authentication, backend changes, persistent database storage, new conversation management features beyond current create/switch/collapse behavior, and mobile-native app interface.

---

## File Structure

- Modify `src/pages/ChatPage.jsx`: add a compact workspace header data surface, improve sidebar copy/classes, and pass the active conversation title into `ChatView`.
- Modify `src/pages/ChatView.jsx`: render the workspace header, improve empty/error/loading UI semantics, and preserve existing AI chat flow.
- Replace most of `src/pages/ChatPage.css`: implement the Executive Desk visual system, responsive behavior, message styling, markdown styling, and fixed-size input controls.
- Modify `src/index.css`: set the page background, typography, smoothing, and root sizing for the redesigned shell.

---

### Task 1: Workspace Structure And Copy

**Files:**
- Modify: `src/pages/ChatPage.jsx`
- Modify: `src/pages/ChatView.jsx`

**Interfaces:**
- Consumes: existing `conversations`, `activeConversationId`, `handleSaveMessages`, `createNewConversation`, `switchConversation`, and `useChat` behavior.
- Produces: `ChatView` prop `conversationTitle: string`; classes `.workspace-header`, `.workspace-title`, `.workspace-status`, `.empty-state`, `.error-bubble`, `.status-dot`, and `.message-meta` for styling.

- [ ] **Step 1: Update `ChatPage.jsx` to pass the active title and refine sidebar labels**

```jsx
<div className="sidebar-logo">
  <div className="logo-icon" aria-hidden="true">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
      <path d="M12 8v8" />
      <path d="m8.5 10 3.5 2 3.5-2" />
    </svg>
  </div>
  <div className="logo-copy">
    <h1 className="logo-text">Nexus AI</h1>
    <span className="logo-subtitle">Executive Desk</span>
  </div>
</div>
```

```jsx
<ChatView
  key={activeConversationId}
  conversationId={activeConversationId}
  conversationTitle={activeConversation?.title || '新的聊天'}
  initialMessages={activeConversation?.messages || []}
  onMessagesChange={handleSaveMessages}
/>
```

- [ ] **Step 2: Update `ChatView.jsx` props and workspace header**

```jsx
function ChatView({ conversationId, conversationTitle, initialMessages, onMessagesChange }) {
```

```jsx
<section className="chat-card">
  <header className="workspace-header">
    <div>
      <p className="workspace-kicker">AI Workbench</p>
      <h2 className="workspace-title">{conversationTitle}</h2>
    </div>
    <div className="workspace-status" aria-live="polite">
      <span className={`status-dot ${isLoading ? 'active' : ''}`} />
      <span>{isLoading ? 'Streaming' : 'Ready'}</span>
    </div>
  </header>

  <div className="chat-messages" ref={messagesRef}>
```

- [ ] **Step 3: Add empty, error, and message metadata markup in `ChatView.jsx`**

```jsx
{messages.length === 0 && !error && (
  <div className="empty-state">
    <p className="empty-eyebrow">Start a focused session</p>
    <h3>Ask, refine, and present your work from one clean desk.</h3>
    <p>Try asking for a summary, a draft, or a sharper way to explain an idea.</p>
  </div>
)}
```

```jsx
<div className="message-meta">
  {message.role === 'user' ? 'You' : 'Nexus AI'}
</div>
```

```jsx
{error && (
  <div className="message-row bot">
    <div className="error-bubble" role="alert">
      {error.message || '请求失败，请稍后重试'}
    </div>
  </div>
)}
```

- [ ] **Step 4: Run build to catch JSX mistakes**

Run: `npm run build`

Expected: build completes successfully and produces `dist/` output.

---

### Task 2: Executive Desk Visual System

**Files:**
- Modify: `src/pages/ChatPage.css`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: classes produced by Task 1 and existing sidebar/message/input classes.
- Produces: complete Executive Desk styling for desktop and mobile.

- [ ] **Step 1: Replace `src/index.css` global shell styles**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f5f7fa;
  color: #17202e;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-width: 320px;
  min-height: 100vh;
  overflow: hidden;
  background: #f5f7fa;
}

button,
textarea {
  font: inherit;
}

#root {
  min-height: 100vh;
  overflow: hidden;
}
```

- [ ] **Step 2: Replace `src/pages/ChatPage.css` with Executive Desk tokens and layout**

Use CSS custom properties for the selected visual system, remove aurora and glass pseudo-elements, and make `.app-container`, `.sidebar`, `.chat-page`, and `.chat-card` stable full-height product surfaces.

- [ ] **Step 3: Style sidebar and collapsed state**

Implement dark sidebar colors, crisp active states, icon-only collapsed layout, readable hover/focus states, and a compact bottom user profile. Keep `.collapse-btn` visible and keyboard focusable.

- [ ] **Step 4: Style workspace header, messages, markdown, error, and streaming states**

Implement `.workspace-header`, `.workspace-status`, `.empty-state`, `.message-meta`, user and assistant message treatment, markdown blocks, tables, inline code, code blocks, `.error-bubble`, and `.streaming::after`.

- [ ] **Step 5: Style command input with fixed-size send button**

Implement `.chat-input-area textarea` and `.chat-input-area button` so the input is polished, focused states are visible, and the button remains fixed-size for send/loading icons.

- [ ] **Step 6: Add responsive CSS**

At `max-width: 860px`, convert the sidebar into the existing compact collapsed rail behavior and keep the workspace full-width. At `max-width: 640px`, reduce padding, message width, and header spacing.

- [ ] **Step 7: Run build after CSS changes**

Run: `npm run build`

Expected: build completes successfully.

---

### Task 3: Verification And Polish

**Files:**
- Modify only if verification reveals issues: `src/pages/ChatPage.jsx`, `src/pages/ChatView.jsx`, `src/pages/ChatPage.css`, `src/index.css`

**Interfaces:**
- Consumes: finished UI from Tasks 1-2.
- Produces: verified local page with desktop and mobile layout checks.

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: lint completes successfully, or reports only pre-existing unrelated warnings that are documented in the final response.

- [ ] **Step 2: Start the Vite dev server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite serves the app at the configured port, likely `http://127.0.0.1:3000/` because `vite.config.js` currently sets port `3000` and `strictPort: true`.

- [ ] **Step 3: Inspect desktop viewport**

Open `http://127.0.0.1:3000/` at around `1440x900`. Verify the dark sidebar, bright workspace, header, empty state, and command bar appear without overlap.

- [ ] **Step 4: Inspect mobile viewport**

Resize to around `390x844`. Verify the sidebar behavior, chat surface, header text, and input controls do not overlap.

- [ ] **Step 5: Commit implementation**

```bash
git add src/pages/ChatPage.jsx src/pages/ChatView.jsx src/pages/ChatPage.css src/index.css docs/superpowers/plans/2026-06-23-executive-desk-chat.md
git commit -m "Redesign chat as Executive Desk workbench"
```

Only include files changed for this implementation. Do not stage `.DS_Store` or the existing `vite.config.js` changes unless explicitly requested.
