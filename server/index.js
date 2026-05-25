import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
console.log('DEEPSEEK_API_KEY loaded:', process.env.DEEPSEEK_API_KEY ? 'yes' : 'no')
import express from 'express'
import cors from 'cors'
import { convertToModelMessages, streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Missing or invalid messages' })
    return
  }

  try {
    const modelMessages = await convertToModelMessages(messages)
    const result = streamText({
      model: deepseek.chat('deepseek-chat'),
      system: '你是一个友好的 AI 助手。请使用 Markdown 回复（标题、列表、加粗、代码块等），便于阅读。',
      messages: modelMessages,
    })

    result.pipeUIMessageStreamToResponse(res)
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
