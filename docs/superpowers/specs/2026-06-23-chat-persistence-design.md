# Chat Persistence Design

## Goal

Add server-side chat persistence to the existing AI workbench so conversations and messages survive page refreshes and can be managed from the sidebar. This is the first backend-focused milestone for turning the prototype into an interview-ready full-stack AI chat project.

## Scope

This phase implements persistence without login. All records belong to a temporary demo user boundary represented implicitly by the single local database. User accounts, authentication, and per-user access control are reserved for the next phase.

Included:

- Prisma with SQLite for local development persistence.
- Conversation and message database models.
- Conversation CRUD APIs.
- Message loading API.
- Chat streaming API that saves both user and assistant messages.
- Frontend state refactor so the sidebar and active chat load from the server.

Excluded:

- Registration, login, logout, JWT, cookies, or password hashing.
- Multi-user data isolation.
- Search, export, folders, tags, model settings, and AI-generated titles.
- Deploy-time database provisioning.

## Current Architecture

The project currently has:

- React/Vite frontend in `src/`.
- Express server in `server/index.js`.
- DeepSeek-compatible OpenAI client through `@ai-sdk/openai`.
- `POST /api/chat` for streaming AI responses.
- Conversations stored only in React state inside `ChatPage.jsx`.

The missing piece is a durable server data layer. Refreshing the page loses all conversations because no conversation or message API exists.

## Data Model

Use Prisma with SQLite. Store the SQLite database in a local development path such as `prisma/dev.db` through `DATABASE_URL="file:./dev.db"`.

### Conversation

- `id`: string cuid primary key.
- `title`: string.
- `createdAt`: datetime default now.
- `updatedAt`: datetime updated automatically.
- `messages`: relation to `Message`.

### Message

- `id`: string cuid primary key.
- `conversationId`: string foreign key.
- `role`: string, constrained by application code to `user` or `assistant`.
- `content`: string.
- `createdAt`: datetime default now.
- `conversation`: relation to `Conversation` with cascade delete.

## API Design

All persistence APIs live under `/api` on the existing Express server.

### `GET /api/conversations`

Returns all conversations ordered by `updatedAt desc`.

Response:

```json
[
  {
    "id": "conversation_id",
    "title": "新的聊天",
    "createdAt": "2026-06-23T00:00:00.000Z",
    "updatedAt": "2026-06-23T00:00:00.000Z"
  }
]
```

### `POST /api/conversations`

Creates a conversation with title `新的聊天` unless a valid non-empty `title` is provided.

Request:

```json
{ "title": "新的聊天" }
```

Response: the created conversation.

### `GET /api/conversations/:id/messages`

Returns messages for a conversation ordered by `createdAt asc`.

If the conversation does not exist, return `404`.

Response:

```json
[
  {
    "id": "message_id",
    "conversationId": "conversation_id",
    "role": "user",
    "content": "hello",
    "createdAt": "2026-06-23T00:00:00.000Z"
  }
]
```

### `PATCH /api/conversations/:id`

Updates a conversation title. Empty titles are rejected with `400`.

Request:

```json
{ "title": "New title" }
```

Response: the updated conversation.

### `DELETE /api/conversations/:id`

Deletes a conversation and its messages. If the conversation does not exist, return `404`.

Response:

```json
{ "ok": true }
```

### `POST /api/chat`

Extends the current endpoint. It accepts a `conversationId` plus the UI message payload required by the AI SDK.

Request shape:

```json
{
  "conversationId": "conversation_id",
  "messages": []
}
```

Behavior:

1. Validate `conversationId` and `messages`.
2. Confirm the conversation exists.
3. Extract the latest user message from `messages`.
4. Save the latest user message to `Message` if it has not already been saved for this request.
5. Stream the assistant response to the frontend.
6. Accumulate assistant text on the server while streaming.
7. When streaming completes, save the assistant message and update the conversation `updatedAt`.
8. If the conversation title is still `新的聊天`, update it from the first user message using the existing title heuristic.

The endpoint must preserve the current streaming user experience.

## Frontend Design

### Conversation State

`ChatPage` becomes the owner of server-backed conversation list state:

- Load conversations from `GET /api/conversations` on mount.
- If no conversations exist, create one through `POST /api/conversations`.
- Store `activeConversationId` separately.
- Create new conversations through the server API.
- Delete conversations through the server API.
- Keep active conversation title in sync with the server response.

### Message State

`ChatView` loads initial messages from the server for the active conversation:

- Fetch `GET /api/conversations/:id/messages` when `conversationId` changes.
- Convert database messages to AI SDK UI messages.
- Pass `conversationId` in the chat request body.
- After a response completes, refresh the conversation list so title and `updatedAt` order are current.

The existing `onMessagesChange` callback should be removed or reduced to a refresh notification because persistence moves to the server.

### Loading And Error States

- Show a sidebar loading state while conversations load.
- Show a message loading state while active messages load.
- Show a recoverable error state if an API request fails.
- Keep the current streaming status chip.

## Server Structure

Keep the project small but avoid putting every persistence concern directly in the route body.

Recommended structure:

- `server/index.js`: Express app setup, middleware, route registration, listen.
- `server/db.js`: Prisma client singleton.
- `server/conversations.js`: conversation and message route handlers.
- `server/chat.js`: chat streaming route handler.
- `server/title.js`: shared title generation helper.

This split is enough to make the interview discussion cleaner without over-engineering the project.

## Error Handling

- Invalid request bodies return `400` with `{ "error": "..." }`.
- Missing conversations return `404`.
- AI provider or database failures return `500` with a safe error message.
- Server logs can include the full internal error.
- The frontend displays errors in the existing polished error treatment.

## Testing And Verification

- Run Prisma generation and migration.
- Run `npm run build`.
- Run `npm run lint`.
- Manually verify:
  - New conversation is created when the database is empty.
  - User can send a message and receive a streamed assistant response.
  - Refreshing the browser preserves conversation and message history.
  - Creating, switching, and deleting conversations works.
  - Missing or invalid conversation IDs return safe API errors.

## Interview Talking Points

- The project moves from client-only state to server-backed persistence.
- Prisma schema makes data ownership explicit and prepares the app for authentication.
- Streaming AI response and database persistence are coordinated without losing real-time UX.
- API routes are separated by responsibility so future login can add user scoping cleanly.
- SQLite keeps local demo setup simple while preserving a path to PostgreSQL.

## Future Phase

The next phase adds authentication:

- `User` model.
- Register/login/logout endpoints.
- Password hashing with `bcrypt`.
- `httpOnly` cookie JWT session.
- `userId` on conversations.
- Auth middleware that scopes all conversation and message queries.
