import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { DefaultChatTransport } from 'ai'
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
    role: m.role,
    content: m.content,
    parts: [{ type: 'text', text: m.content }],
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

function ChatView({ conversationId, conversationTitle, isBooting, pageError, onRefreshConversations }) {
  const [input, setInput] = useState('')
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messageLoadError, setMessageLoadError] = useState('')
  const messagesRef = useRef(null)
  const stopRef = useRef(null)
  const isFirstRender = useRef(true)

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    body: { conversationId },
  }), [conversationId])

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    id: String(conversationId),
    transport,
    onFinish: () => {
      onRefreshConversations()
    },
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }

    let ignore = false

    async function loadMessages() {
      try {
        setIsLoadingMessages(true)
        setMessageLoadError('')
        const response = await fetch(`/api/conversations/${conversationId}/messages`)
        if (!response.ok) throw new Error('消息记录加载失败')
        const history = await response.json()
        if (!ignore) {
          setMessages(convertToUIMessages(history))
          isFirstRender.current = true
        }
      } catch (loadError) {
        if (!ignore) setMessageLoadError(loadError.message || '消息记录加载失败')
      } finally {
        if (!ignore) setIsLoadingMessages(false)
      }
    }

    loadMessages()

    return () => {
      ignore = true
    }
  }, [conversationId, setMessages])

  useEffect(() => {
    stopRef.current = stop
  }, [stop])

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

  useEffect(() => {
    return () => {
      stopRef.current?.()
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!conversationId || !input.trim() || isLoading || isLoadingMessages) return
    sendMessage({ text: input })
    setInput('')
  }

  const visibleError = messageLoadError || pageError

  return (
    <main className="chat-page">
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
          {(isBooting || isLoadingMessages) && (
            <div className="chat-loading-state">加载工作台...</div>
          )}

          {!isBooting && !isLoadingMessages && messages.length === 0 && !error && !visibleError && (
            <div className="empty-state">
              <p className="empty-eyebrow">Start a focused session</p>
              <h3>Ask, refine, and present your work from one clean desk.</h3>
              <p>Try asking for a summary, a draft, or a sharper way to explain an idea.</p>
            </div>
          )}

          {messages.map((message, index) => {
            const isStreamingBubble =
              isLoading && message.role === 'assistant' && index === messages.length - 1
            return (
              <div
                key={message.id}
                className={`message-row ${message.role === 'user' ? 'user' : 'bot'}`}
              >
                <div className="message-meta">
                  {message.role === 'user' ? 'You' : 'Nexus AI'}
                </div>
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
              <div className="error-bubble" role="alert">
                {error.message || '请求失败，请稍后重试'}
              </div>
            </div>
          )}
          {visibleError && (
            <div className="message-row bot">
              <div className="error-bubble" role="alert">
                {visibleError}
              </div>
            </div>
          )}
        </div>

        <form className="chat-input-area" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? '' : 'Ask Nexus AI anything...'}
            rows={1}
            disabled={!conversationId || isLoading || isLoadingMessages}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <button type="submit" disabled={!conversationId || isLoading || isLoadingMessages}>
            {isLoading ? <LoaderIcon /> : <SendIcon />}
          </button>
        </form>
      </section>
    </main>
  )
}

export default ChatView
