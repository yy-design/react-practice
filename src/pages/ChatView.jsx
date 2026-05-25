import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function getMessageText(message) {
  if (message.parts) {
    return message.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('')
  }
  return message.content || ''
}

function convertToUIMessages(messages) {
  return messages.map((m) => ({
    id: m.id,
    role: m.role === 'bot' ? 'assistant' : 'user',
    content: m.text,
    parts: [{ type: 'text', text: m.text }],
  }))
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function LoaderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="spin-icon">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function ChatView({ conversationId, initialMessages, onMessagesChange }) {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status, error, stop } = useChat({
    id: String(conversationId),
    messages: convertToUIMessages(initialMessages),
  })

  const messagesRef = useRef(null)
  const stopRef = useRef(stop)
  stopRef.current = stop
  const isFirstRender = useRef(true)
  const lastSavedRef = useRef('')

  const isLoading = status === 'submitted' || status === 'streaming'

  // 首次渲染：绘制前直接设置 scrollTop，无任何可见滚动
  useLayoutEffect(() => {
    if (isFirstRender.current && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
      isFirstRender.current = false
    }
  }, [messages])

  // 后续新消息：平滑滚动到底部（仅操作消息容器，不影响页面）
  useEffect(() => {
    if (!isFirstRender.current && messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages])

  // 保存消息到父组件（仅在内容真正变化时才触发）
  useEffect(() => {
    if (messages.length === 0) return
    const snapshot = JSON.stringify(messages.map((m) => ({
      r: m.role,
      t: getMessageText(m),
    })))
    if (snapshot === lastSavedRef.current) return
    lastSavedRef.current = snapshot
    onMessagesChange(
      conversationId,
      messages.map((m) => ({
        id: m.id,
        role: m.role === 'assistant' ? 'bot' : 'user',
        text: getMessageText(m),
      })),
    )
  }, [messages, conversationId, onMessagesChange])

  useEffect(() => {
    return () => {
      stopRef.current?.()
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <main className="chat-page">
      <section className="chat-card">
        <div className="chat-messages" ref={messagesRef}>
          {messages.map((message, index) => {
            const isStreamingBubble =
              isLoading && message.role === 'assistant' && index === messages.length - 1
            return (
              <div
                key={message.id}
                className={`message-row ${message.role === 'user' ? 'user' : 'bot'}`}
              >
                <div
                  className={`message-bubble md-reply${isStreamingBubble ? ' streaming' : ''}`}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {getMessageText(message)}
                    </ReactMarkdown>
                  ) : (
                    getMessageText(message)
                  )}
                </div>
              </div>
            )
          })}
          {error && (
            <div className="message-row bot">
              <div className="message-bubble">
                {error.message || '请求失败，请稍后重试'}
              </div>
            </div>
          )}
        </div>

        <form className="chat-input-area" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? '' : '输入消息，按 Enter 发送'}
            rows={1}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? <LoaderIcon /> : <SendIcon />}
          </button>
        </form>
      </section>
    </main>
  )
}

export default ChatView
