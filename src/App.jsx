import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** 从流式 chunk 中取出应追加的正文（兼容 OpenAI / DeepSeek） */
function deltaTextFromJson(json) {
  const d = json.choices?.[0]?.delta
  if (!d || typeof d !== 'object') return ''
  if (typeof d.content === 'string' && d.content.length) return d.content
  // 少数兼容实现会把文本放在 message.content
  const msg = d.message
  if (msg && typeof msg.content === 'string' && msg.content.length) return msg.content
  return ''
}

/** 解析 OpenAI / DeepSeek 兼容的 SSE 文本，累积 delta content */
function parseSseChunk(buffer, onDelta) {
  const normalized = buffer.replace(/\r\n/g, '\n')
  let rest = normalized
  let cut
  while ((cut = rest.indexOf('\n\n')) !== -1) {
    const block = rest.slice(0, cut)
    rest = rest.slice(cut + 2)
    for (const line of block.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.replace(/^data:\s*/, '').trim()
      if (payload === '' || payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const piece = deltaTextFromJson(json)
        if (piece.length) onDelta(piece)
      } catch {
        /* 当前帧 JSON 不完整或非标：留在缓冲区由下次拼接，不在此丢弃 */
      }
    }
  }
  return rest
}

function App() {
  // 会话列表状态
  const [conversations, setConversations] = useState([
    { id: 1, title: '新的聊天', active: true, messages: [] },
  ])
  const [activeConversationId, setActiveConversationId] = useState(1)
  const activeConversationIdRef = useRef(activeConversationId)
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: '你好，我是一个机器人。试着给我发一条消息吧。',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 创建新会话
  const createNewConversation = () => {
    const newId = Date.now()
    const newConversation = {
      id: newId,
      title: '新的聊天',
      active: true,
      messages: [
        {
          id: Date.now(),
          role: 'bot',
          text: '你好，我是一个机器人。试着给我发一条消息吧。',
        },
      ],
    }
    
    activeConversationIdRef.current = newId
    setConversations(prev => prev.map(conv => ({ ...conv, active: false })).concat(newConversation))
    setActiveConversationId(newId)
    setMessages(newConversation.messages)
  }

  // 切换会话
  const switchConversation = (id) => {
    activeConversationIdRef.current = id
    setConversations(prev => {
      const conversation = prev.find(conv => conv.id === id)
      if (conversation) {
        setMessages(conversation.messages)
      }
      return prev.map(conv => ({ ...conv, active: conv.id === id }))
    })
    setActiveConversationId(id)
  }

  // 更新会话消息
  const updateConversationMessages = (newMessages, conversationId = activeConversationId) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, messages: newMessages, title: newMessages.length > 0 ? getConversationTitle(newMessages) : '新的聊天' }
          : conv
      )
    )
  }

  // 获取会话标题
  const getConversationTitle = (msgs) => {
    const userMsg = msgs.find(m => m.role === 'user')
    return userMsg ? userMsg.text.substring(0, 20) + '...' : '新的聊天'
  }

  const sendMessage = async () => {
    const content = input.trim()
    if (!content || isLoading) return

    const sendingConversationId = activeConversationId

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: content,
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    updateConversationMessages(newMessages, sendingConversationId)
    setInput('')
    setIsLoading(true)

    const historyPayload = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))

    const botMessageId = Date.now() + 1

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          history: historyPayload,
        }),
      })

      const contentType = response.headers.get('Content-Type') || ''

      if (!response.ok) {
        let errText = 'API 请求失败'
        try {
          const err = await response.json()
          errText = err.error?.message || err.error || err.message || JSON.stringify(err)
        } catch {
          errText = await response.text()
        }
        const errorMessages = [...newMessages, { id: botMessageId, role: 'bot', text: errText || '请求失败' }]
        setMessages(errorMessages)
        updateConversationMessages(errorMessages, sendingConversationId)
        return
      }

      if (!contentType.includes('text/event-stream')) {
        const data = await response.json()
        const finalMessages = [...newMessages, {
          id: botMessageId,
          role: 'bot',
          text: data.reply || '抱歉，我无法理解。',
        }]
        setMessages(finalMessages)
        updateConversationMessages(finalMessages, sendingConversationId)
        return
      }

      const streamMessages = [...newMessages, { id: botMessageId, role: 'bot', text: '' }]
      setMessages(streamMessages)
      updateConversationMessages(streamMessages, sendingConversationId)

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('浏览器不支持流式读取')
      }

      const decoder = new TextDecoder()
      let carry = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        carry += decoder.decode(value, { stream: true })
        carry = parseSseChunk(carry, (delta) => {
          fullText += delta
          const snapshot = fullText
          const updatedMessages = streamMessages.map((m) => 
            m.id === botMessageId ? { ...m, text: snapshot } : m
          )
          if (activeConversationIdRef.current === sendingConversationId) {
            setMessages(updatedMessages)
          }
          updateConversationMessages(updatedMessages, sendingConversationId)
        })
      }

      carry += decoder.decode()
      if (carry.length) {
        parseSseChunk(carry + '\n\n', (delta) => {
          fullText += delta
          const snapshot = fullText
          const updatedMessages = streamMessages.map((m) => 
            m.id === botMessageId ? { ...m, text: snapshot } : m
          )
          if (activeConversationIdRef.current === sendingConversationId) {
            setMessages(updatedMessages)
          }
          updateConversationMessages(updatedMessages, sendingConversationId)
        })
      }

      if (!fullText.trim()) {
        const fallbackMessages = streamMessages.map((m) =>
          m.id === botMessageId ? { ...m, text: '抱歉，我无法理解。' } : m
        )
        if (activeConversationIdRef.current === sendingConversationId) {
          setMessages(fallbackMessages)
        }
        updateConversationMessages(fallbackMessages, sendingConversationId)
      }
    } catch (error) {
      console.error('Error:', error)
      const hasPlaceholder = messages.some((m) => m.id === botMessageId)
      const fallback = '抱歉，网络出现问题，请稍后重试。'
      const errorMessages = hasPlaceholder
        ? messages.map((m) => (m.id === botMessageId ? { ...m, text: fallback } : m))
        : [...messages, { id: botMessageId, role: 'bot', text: fallback }]
      
      if (activeConversationIdRef.current === sendingConversationId) {
        setMessages(errorMessages)
      }
      updateConversationMessages(errorMessages, sendingConversationId)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="app-container">
      {/* 左侧边栏 */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">🤖</div>
          <h1 className="logo-text">AI Assistant</h1>
        </div>

        {/* 新建会话按钮 */}
        <button className="new-chat-btn" onClick={createNewConversation}>
          <span className="btn-icon">+</span>
          新建会话
        </button>

        {/* 历史会话列表 */}
        <nav className="conversation-list">
          <h3 className="list-title">历史会话</h3>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${conv.active ? 'active' : ''}`}
              onClick={() => switchConversation(conv.id)}
            >
              <span className="conv-icon">💬</span>
              <span className="conv-title">{conv.title}</span>
            </div>
          ))}
        </nav>

        {/* 底部用户头像 */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              <span>👤</span>
            </div>
            <div className="user-info">
              <span className="user-name">用户</span>
              <span className="user-email">user@example.com</span>
            </div>
          </div>
        </div>

        {/* 折叠按钮 */}
        <button 
          className="collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? '▶' : '◀'}
        </button>
      </aside>

      {/* 右侧聊天区域 */}
      <main className="chat-page">
        <section className="chat-card">
          <header className="chat-header">
            {conversations.find(c => c.id === activeConversationId)?.title || 'AI聊天'}
          </header>

          <div className="chat-messages">
            {messages.map((message, index) => {
              const isStreamingBubble =
                isLoading &&
                message.role === 'bot' &&
                index === messages.length - 1
              return (
                <div
                  key={message.id}
                  className={`message-row ${message.role === 'user' ? 'user' : 'bot'}`}
                >
                  <div
                    className={`message-bubble md-reply${isStreamingBubble ? ' streaming' : ''}`}
                  >
                    {message.role === 'bot' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.text}
                      </ReactMarkdown>
                    ) : (
                      message.text
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? 'AI 正在输入...' : '输入消息，按 Enter 发送'}
              rows={2}
              disabled={isLoading}
            />
            <button type="button" onClick={sendMessage} disabled={isLoading}>
              {isLoading ? '回复中...' : '发送'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App