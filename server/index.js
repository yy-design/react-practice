import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
console.log('DEEPSEEK_API_KEY loaded:', process.env.DEEPSEEK_API_KEY ? 'yes' : 'no')
import express from 'express'
import cors from 'cors'
import { createOpenAI } from '@ai-sdk/openai'
import conversationsRouter from './conversations.js'
import { createChatRouter } from './chat.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

app.use('/api', conversationsRouter)
app.use('/api', createChatRouter({ deepseek }))

app.use((error, _req, res, _next) => {
  void _next
  console.error('API Error:', error)
  res.status(500).json({ error: error.message || 'Internal server error' })
})

const server = app.listen(PORT)

server.on('listening', () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

server.on('error', (error) => {
  console.error(`Server failed to start on port ${PORT}:`, error.message)
  process.exitCode = 1
})
