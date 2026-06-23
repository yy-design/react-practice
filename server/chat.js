import express from 'express'
import { convertToModelMessages, streamText } from 'ai'
import { prisma } from './db.js'
import { getConversationTitleFromText } from './title.js'
import { serializeConversation } from './serializers.js'

const SYSTEM_PROMPT = '你是一个友好的 AI 助手。请使用 Markdown 回复（标题、列表、加粗、代码块等），便于阅读。'

export function createChatRouter({ deepseek }) {
  const router = express.Router()

  router.post('/chat', async (req, res) => {
    const { conversationId, messages } = req.body

    if (!conversationId || typeof conversationId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid conversationId' })
      return
    }

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Missing or invalid messages' })
      return
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }

    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')
    const latestUserText = getUiMessageText(latestUserMessage)

    if (!latestUserText.trim()) {
      res.status(400).json({ error: 'Latest user message is empty' })
      return
    }

    await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: latestUserText,
      },
    })

    let nextConversation
    if (conversation.title === '新的聊天') {
      nextConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: { title: getConversationTitleFromText(latestUserText) },
      })
    } else {
      nextConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      })
    }

    const modelMessages = await convertToModelMessages(messages)
    const result = streamText({
      model: deepseek.chat('deepseek-chat'),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      onFinish: async ({ text }) => {
        const assistantText = text.trim()
        if (!assistantText) return

        await prisma.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: assistantText,
          },
        })
      },
    })

    res.setHeader('X-Conversation', encodeURIComponent(JSON.stringify(serializeConversation(nextConversation))))
    result.pipeUIMessageStreamToResponse(res)
  })

  return router
}

function getUiMessageText(message) {
  if (!message) return ''

  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text || '')
      .join('')
  }

  return message.content || ''
}
