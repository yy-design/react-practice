# Chat Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Prisma/SQLite-backed server persistence so chat conversations and messages survive refreshes while preserving the current streaming AI experience.

**Architecture:** Add a Prisma data layer to the existing Express server and split server responsibilities into small route/helper modules. The frontend will load conversations and messages from `/api` endpoints, while `POST /api/chat` will save the latest user message, stream the assistant response, then persist the assistant message when the stream completes. Authentication remains out of scope for this phase.

**Tech Stack:** React 19, Vite 8, Express 5, AI SDK 6, Prisma, SQLite, plain CSS.

## Global Constraints

- This phase implements persistence without login.
- All records belong to a temporary demo user boundary represented implicitly by the single local database.
- User accounts, authentication, and per-user access control are reserved for the next phase.
- Included: Prisma with SQLite for local development persistence.
- Included: Conversation and message database models.
- Included: Conversation CRUD APIs.
- Included: Message loading API.
- Included: Chat streaming API that saves both user and assistant messages.
- Included: Frontend state refactor so the sidebar and active chat load from the server.
- Excluded: Registration, login, logout, JWT, cookies, or password hashing.
- Excluded: Multi-user data isolation.
- Excluded: Search, export, folders, tags, model settings, and AI-generated titles.
- Excluded: Deploy-time database provisioning.
- The endpoint must preserve the current streaming user experience.

---

## File Structure

- Create `prisma/schema.prisma`: SQLite datasource and `Conversation` / `Message` models.
- Create `.env` if missing or update `.env.local` usage so Prisma can read `DATABASE_URL="file:./dev.db"`.
- Create `server/db.js`: exports one Prisma client.
- Create `server/title.js`: shared title helper based on first user message.
- Create `server/conversations.js`: Express router for conversation CRUD and message loading.
- Create `server/chat.js`: Express router for streaming chat persistence.
- Modify `server/index.js`: route registration and shared middleware only.
- Modify `src/pages/ChatPage.jsx`: load/create/delete server conversations and pass refresh hooks into `ChatView`.
- Modify `src/pages/ChatView.jsx`: fetch messages from server and send `conversationId` in chat request body.
- Modify `src/pages/ChatPage.css`: add small loading/delete button/error styles needed by the new states.
- Modify `package.json` and `package-lock.json`: add Prisma runtime/dev dependencies and scripts.

---

### Task 1: Prisma Data Layer

**Files:**
- Create: `prisma/schema.prisma`
- Create/Modify: `.env`
- Create: `server/db.js`
- Create: `server/title.js`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `prisma.conversation`, `prisma.message`, and `getConversationTitleFromText(text: string): string`.
- Consumes: no app-specific previous task outputs.

- [ ] **Step 1: Install dependencies**

Run: `npm install @prisma/client && npm install -D prisma`

Expected: `package.json` contains `@prisma/client` in dependencies and `prisma` in devDependencies.

- [ ] **Step 2: Add Prisma scripts to `package.json`**

Add these scripts while preserving existing scripts:

```json
{
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio"
}
```

- [ ] **Step 3: Create `.env` for Prisma**

Create `.env` with:

```env
DATABASE_URL="file:./dev.db"
```

Keep `.env.local` for `DEEPSEEK_API_KEY`; do not move the API key.

- [ ] **Step 4: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Conversation {
  id        String    @id @default(cuid())
  title     String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  role           String
  content        String
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
}
```

- [ ] **Step 5: Create `server/db.js`**

```js
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

- [ ] **Step 6: Create `server/title.js`**

```js
export function getConversationTitleFromText(text) {
  const normalized = String(text || '').trim().replace(/\s+/g, ' ')
  if (!normalized) return '新的聊天'
  return normalized.length > 20 ? `${normalized.slice(0, 20)}...` : normalized
}
```

- [ ] **Step 7: Generate and migrate database**

Run: `npx prisma migrate dev --name init_chat_persistence`

Expected: Prisma creates `prisma/dev.db`, a migration folder under `prisma/migrations/`, and generates the client.

- [ ] **Step 8: Run verification**

Run: `npm run lint`

Expected: lint exits `0`.

---

### Task 2: Conversation And Message APIs

**Files:**
- Create: `server/conversations.js`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: `prisma` from `server/db.js`; `getConversationTitleFromText` remains available for Task 3.
- Produces: Express router mounted at `/api` with `GET /conversations`, `POST /conversations`, `GET /conversations/:id/messages`, `PATCH /conversations/:id`, and `DELETE /conversations/:id`.

- [ ] **Step 1: Create `server/conversations.js`**

```js
import express from 'express'
import { prisma } from './db.js'

const router = express.Router()

function serializeConversation(conversation) {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  }
}

function serializeMessage(message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }
}

router.get('/conversations', async (_req, res) => {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
  })
  res.json(conversations.map(serializeConversation))
})

router.post('/conversations', async (req, res) => {
  const title = typeof req.body?.title === 'string' && req.body.title.trim()
    ? req.body.title.trim()
    : '新的聊天'

  const conversation = await prisma.conversation.create({ data: { title } })
  res.status(201).json(serializeConversation(conversation))
})

router.get('/conversations/:id/messages', async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
  })

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' })
    return
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
  })
  res.json(messages.map(serializeMessage))
})

router.patch('/conversations/:id', async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  if (!title) {
    res.status(400).json({ error: 'Title is required' })
    return
  }

  try {
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { title },
    })
    res.json(serializeConversation(conversation))
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }
    throw error
  }
})

router.delete('/conversations/:id', async (req, res) => {
  try {
    await prisma.conversation.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }
    throw error
  }
})

export default router
```

- [ ] **Step 2: Register conversation router in `server/index.js`**

Add:

```js
import conversationsRouter from './conversations.js'
```

After middleware:

```js
app.use('/api', conversationsRouter)
```

- [ ] **Step 3: Add async error middleware in `server/index.js`**

Add this before `app.listen`:

```js
app.use((error, _req, res, _next) => {
  console.error('Server Error:', error)
  res.status(500).json({ error: 'Internal server error' })
})
```

- [ ] **Step 4: Run API smoke check**

Start server: `npm run server`

In another terminal run: `curl -s http://localhost:3001/api/conversations`

Expected: `[]` or a JSON array of conversations.

- [ ] **Step 5: Run verification**

Run: `npm run lint`

Expected: lint exits `0`.

---

### Task 3: Persistent Streaming Chat Route

**Files:**
- Create: `server/chat.js`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: `prisma` from `server/db.js`; `getConversationTitleFromText(text: string): string` from `server/title.js`.
- Produces: `POST /api/chat` that validates `conversationId`, saves the latest user message, streams assistant response, and saves assistant content.

- [ ] **Step 1: Move chat route into `server/chat.js`**

```js
import express from 'express'
import { convertToModelMessages, streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { prisma } from './db.js'
import { getConversationTitleFromText } from './title.js'

const router = express.Router()

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

function getMessageText(message) {
  if (Array.isArray(message?.parts)) {
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
  }
  return message?.content || ''
}

function getLatestUserMessage(messages) {
  return [...messages].reverse().find((message) => message.role === 'user')
}

router.post('/chat', async (req, res, next) => {
  const { conversationId, messages } = req.body

  if (!conversationId || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Missing or invalid conversationId or messages' })
    return
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }

    const latestUserMessage = getLatestUserMessage(messages)
    const latestUserText = getMessageText(latestUserMessage).trim()

    if (!latestUserText) {
      res.status(400).json({ error: 'Latest user message is required' })
      return
    }

    await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: latestUserText,
      },
    })

    if (conversation.title === '新的聊天') {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title: getConversationTitleFromText(latestUserText) },
      })
    }

    const modelMessages = await convertToModelMessages(messages)
    const result = streamText({
      model: deepseek.chat('deepseek-chat'),
      system: '你是一个友好的 AI 助手。请使用 Markdown 回复（标题、列表、加粗、代码块等），便于阅读。',
      messages: modelMessages,
      onFinish: async ({ text }) => {
        const assistantText = String(text || '').trim()
        if (!assistantText) return
        await prisma.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: assistantText,
          },
        })
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        })
      },
    })

    result.pipeUIMessageStreamToResponse(res)
  } catch (error) {
    next(error)
  }
})

export default router
```

- [ ] **Step 2: Update `server/index.js` to use chat router and remove inline chat code**

Keep dotenv, Express setup, CORS, JSON middleware, route registration, error middleware, and listen. Remove direct imports of `convertToModelMessages`, `streamText`, and `createOpenAI` from `server/index.js`.

Register:

```js
import chatRouter from './chat.js'

app.use('/api', conversationsRouter)
app.use('/api', chatRouter)
```

- [ ] **Step 3: Run build-free server syntax check**

Run: `node --check server/index.js && node --check server/chat.js && node --check server/conversations.js`

Expected: no syntax errors.

- [ ] **Step 4: Run verification**

Run: `npm run lint`

Expected: lint exits `0`.

---

### Task 4: Frontend Server-Backed Conversations

**Files:**
- Modify: `src/pages/ChatPage.jsx`
- Modify: `src/pages/ChatView.jsx`
- Modify: `src/pages/ChatPage.css`

**Interfaces:**
- Consumes: APIs from Tasks 2-3.
- Produces: UI that loads, creates, switches, deletes, and refreshes conversations from the server; `ChatView` fetches messages and passes `conversationId` to `/api/chat`.

- [ ] **Step 1: Add API helpers inside `ChatPage.jsx`**

Create functions for `fetchConversations`, `createConversation`, and `deleteConversation` using `fetch('/api/conversations')`.

- [ ] **Step 2: Refactor `ChatPage` state**

Replace the hardcoded conversation state with:

```js
const [conversations, setConversations] = useState([])
const [activeConversationId, setActiveConversationId] = useState(null)
const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
const [isLoadingConversations, setIsLoadingConversations] = useState(true)
const [conversationError, setConversationError] = useState('')
```

- [ ] **Step 3: Load or create initial conversation**

On mount, call `GET /api/conversations`. If the response is empty, call `POST /api/conversations`, then set that conversation active. If not empty, set the first conversation active.

- [ ] **Step 4: Implement server-backed new/delete/switch/refresh**

`createNewConversation` calls `POST /api/conversations`. `switchConversation` only sets active ID. `handleDeleteConversation(id)` calls `DELETE /api/conversations/:id`, then selects the next available conversation or creates a new one. `refreshConversations` reloads the server list without forcing active ID unless the active conversation no longer exists.

- [ ] **Step 5: Update sidebar rendering**

Show loading and error states. Add a delete icon button inside each conversation item. Prevent delete button clicks from also switching the conversation.

- [ ] **Step 6: Refactor `ChatView` to load messages from server**

Add message loading state. Fetch `GET /api/conversations/:conversationId/messages` when `conversationId` changes. Convert database messages to UI messages using `content` and `role`. Configure `useChat` with `body: { conversationId }` or the AI SDK equivalent request body option supported by this version. Call `onConversationUpdated` after streaming completes so the sidebar title/order refreshes.

- [ ] **Step 7: Add CSS for loading, error, and delete controls**

Add classes `.sidebar-state`, `.conversation-delete`, `.chat-loading-state`, and refine empty/error states if needed.

- [ ] **Step 8: Run verification**

Run: `npm run build && npm run lint`

Expected: build and lint exit `0`.

---

### Task 5: Manual Persistence Verification

**Files:**
- Modify only if verification reveals issues: `server/*.js`, `src/pages/*.jsx`, `src/pages/ChatPage.css`, `prisma/schema.prisma`.

**Interfaces:**
- Consumes: full implementation from Tasks 1-4.
- Produces: verified persistence flow.

- [ ] **Step 1: Start backend server**

Run: `npm run server`

Expected: server starts on `http://localhost:3001` and logs whether `DEEPSEEK_API_KEY` is loaded.

- [ ] **Step 2: Start frontend dev server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite serves the app, likely at `http://127.0.0.1:3000/` because the current `vite.config.js` sets port `3000` and `strictPort: true`.

- [ ] **Step 3: Verify API persistence with curl**

Run:

```bash
curl -s -X POST http://localhost:3001/api/conversations \
  -H 'Content-Type: application/json' \
  -d '{"title":"Persistence smoke"}'
```

Expected: JSON object with `id`, `title`, `createdAt`, and `updatedAt`.

- [ ] **Step 4: Verify browser persistence**

Open `http://127.0.0.1:3000/`, create a conversation, send a message, wait for the assistant response, reload, and confirm the conversation and messages still render.

- [ ] **Step 5: Verify delete behavior**

Delete a conversation from the sidebar. Confirm it disappears and either the next conversation becomes active or a new blank conversation is created.

- [ ] **Step 6: Final verification**

Run: `npm run build && npm run lint`

Expected: build and lint exit `0`.

- [ ] **Step 7: Commit implementation**

```bash
git add package.json package-lock.json .env prisma server src/pages docs/superpowers/plans/2026-06-23-chat-persistence.md
git commit -m "Persist chat conversations with Prisma"
```

Do not stage `.DS_Store`, `docs/.DS_Store`, or unrelated `vite.config.js` changes.
