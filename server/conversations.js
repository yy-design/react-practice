import express from 'express'
import { prisma } from './db.js'
import { serializeConversation, serializeMessage } from './serializers.js'

const router = express.Router()

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
