import { useState, useCallback } from 'react'
import ChatView from './ChatView'
import './ChatPage.css'

function getConversationTitle(msgs) {
  if (!msgs || msgs.length === 0) return '新的聊天'
  const userMsg = msgs.find((m) => m.role === 'user')
  return userMsg ? userMsg.text.substring(0, 20) + '...' : '新的聊天'
}

function ChatPage() {
  const [conversations, setConversations] = useState([
    { id: 1, title: '新的聊天', active: true, messages: [] },
  ])
  const [activeConversationId, setActiveConversationId] = useState(1)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleSaveMessages = useCallback((conversationId, messages) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages, title: getConversationTitle(messages) }
          : conv,
      ),
    )
  }, [])

  const createNewConversation = () => {
    const newId = Date.now()
    setConversations((prev) =>
      prev
        .map((conv) => ({ ...conv, active: false }))
        .concat({
          id: newId,
          title: '新的聊天',
          active: true,
          messages: [],
        }),
    )
    setActiveConversationId(newId)
  }

  const switchConversation = (id) => {
    setConversations((prev) =>
      prev.map((conv) => ({ ...conv, active: conv.id === id })),
    )
    setActiveConversationId(id)
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  return (
    <div className="app-container">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
              <path d="M12 8v8" />
              <path d="m8.5 10 3.5 2 3.5-2" />
            </svg>
          </div>
          <div className="logo-copy">
            <h1 className="logo-text">Nexus AI</h1>
            <span className="logo-subtitle">Executive Desk</span>
          </div>
        </div>

        <button className="new-chat-btn" onClick={createNewConversation}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>新建会话</span>
        </button>

        <nav className="conversation-list">
          <h3 className="list-title">历史会话</h3>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${conv.active ? 'active' : ''}`}
              onClick={() => switchConversation(conv.id)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="conv-icon">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="conv-title">{conv.title}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="user-info">
              <span className="user-name">用户</span>
              <span className="user-email">user@example.com</span>
            </div>
          </div>
        </div>

        <button
          className="collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {sidebarCollapsed
              ? <polyline points="9 18 15 12 9 6" />
              : <polyline points="15 18 9 12 15 6" />
            }
          </svg>
        </button>
      </aside>

      <ChatView
        key={activeConversationId}
        conversationId={activeConversationId}
        conversationTitle={activeConversation?.title || '新的聊天'}
        initialMessages={activeConversation?.messages || []}
        onMessagesChange={handleSaveMessages}
      />
    </div>
  )
}

export default ChatPage
