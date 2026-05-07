import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [
      react(),
      // DeepSeek API 代理插件
      {
        name: 'deepseek-proxy',
        configureServer(server) {
          server.middlewares.use('/api/chat', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end('Method Not Allowed')
              return
            }

            let body = ''
            req.on('data', (chunk) => {
              body += chunk.toString()
            })

            req.on('end', async () => {
              try {
                const { message, history = [] } = JSON.parse(body)
                const apiKey = env.VITE_DEEPSEEK_API_KEY

                if (!apiKey) {
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: 'API Key 未配置' }))
                  return
                }

                // 构建消息历史
                const messages = [
                  {
                    role: 'system',
                    content:
                      '你是一个友好的 AI 助手。请使用 Markdown 回复（标题、列表、加粗、代码块等），便于阅读。',
                  },
                  ...history.slice(-10), // 保留最近10条历史
                  { role: 'user', content: message },
                ]

                // 调用 DeepSeek API（流式）
                const response = await fetch('https://api.deepseek.com/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                  },
                  body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages,
                    max_tokens: 1000,
                    stream: true,
                  }),
                })

                if (!response.ok) {
                  const errText = await response.text()
                  let payload = errText
                  try {
                    payload = JSON.parse(errText)
                  } catch {
                    /* 保持原文 */
                  }
                  res.statusCode = response.status
                  res.setHeader('Content-Type', 'application/json')
                  res.end(typeof payload === 'string' ? JSON.stringify({ error: payload }) : JSON.stringify(payload))
                  return
                }

                if (!response.body) {
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: '上游未返回可读流' }))
                  return
                }

                res.statusCode = 200
                res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
                res.setHeader('Cache-Control', 'no-cache')
                res.setHeader('Connection', 'keep-alive')
                res.flushHeaders?.()

                const reader = response.body.getReader()
                try {
                  while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    if (value?.length) res.write(Buffer.from(value))
                  }
                } catch (streamErr) {
                  console.error('Stream pipe error:', streamErr)
                } finally {
                  res.end()
                }
              } catch (error) {
                console.error('API Error:', error)
                res.statusCode = 500
                res.end(JSON.stringify({ error: error.message }))
              }
            })
          })
        },
      },
    ],
  }
})
