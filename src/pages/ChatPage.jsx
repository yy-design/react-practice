import { useEffect, useState, useCallback } from 'react'
import ChatView from './ChatView'
import './ChatPage.css'

function ChatPage() {
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isBooting, setIsBooting] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [pageError, setPageError] = useState('')

  const loadConversations = useCallback(async ({ ensureConversation = false } = {}) => {
    const response = await fetch('/api/conversations')
    if (!response.ok) throw new Error('会话列表加载失败')

    const list = await response.json()
    if (list.length === 0 && ensureConversation) {
      const created = await createConversationRequest()
      setConversations([created])
      setActiveConversationId(created.id)
      return [created]
    }

    setConversations(list)
    setActiveConversationId((currentId) => {
      if (currentId && list.some((conversation) => conversation.id === currentId)) {
        return currentId
      }
      return list[0]?.id || null
    })
    return list
  }, [])

  const refreshConversations = useCallback(async () => {
    try {
      await loadConversations()
    } catch (error) {
      setPageError(error.message || '会话列表刷新失败')
    }
  }, [loadConversations])

  useEffect(() => {
    let ignore = false

    async function boot() {
      try {
        setPageError('')
        const response = await fetch('/api/conversations')
        if (!response.ok) throw new Error('会话列表加载失败')
        let list = await response.json()

        if (list.length === 0) {
          list = [await createConversationRequest()]
        }

        if (!ignore) {
          setConversations(list)
          setActiveConversationId(list[0]?.id || null)
        }
      } catch (error) {
        if (!ignore) setPageError(error.message || '服务连接失败')
      } finally {
        if (!ignore) setIsBooting(false)
      }
    }

    boot()

    return () => {
      ignore = true
    }
  }, [])

  const createNewConversation = async () => {
    if (isCreating) return

    try {
      setIsCreating(true)
      setPageError('')
      const created = await createConversationRequest()
      setConversations((prev) => [created, ...prev])
      setActiveConversationId(created.id)
    } catch (error) {
      setPageError(error.message || '新建会话失败')
    } finally {
      setIsCreating(false)
    }
  }

  const switchConversation = (id) => {
    setActiveConversationId(id)
  }

  const deleteConversation = async (id) => {
    if (deletingId) return

    try {
      setDeletingId(id)
      setPageError('')
      const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('删除会话失败')

      const remaining = conversations.filter((conversation) => conversation.id !== id)
      if (remaining.length === 0) {
        const created = await createConversationRequest()
        setConversations([created])
        setActiveConversationId(created.id)
        return
      }

      setConversations(remaining)
      if (activeConversationId === id) {
        setActiveConversationId(remaining[0].id)
      }
    } catch (error) {
      setPageError(error.message || '删除会话失败')
    } finally {
      setDeletingId(null)
    }
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

        <button className="new-chat-btn" onClick={createNewConversation} disabled={isCreating}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{isCreating ? '创建中' : '新建会话'}</span>
        </button>

        <nav className="conversation-list">
          <h3 className="list-title">历史会话</h3>
          {isBooting && <div className="sidebar-state">加载会话中...</div>}
          {!isBooting && conversations.length === 0 && (
            <div className="sidebar-state">暂无会话</div>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              role="button"
              tabIndex={0}
              className={`conversation-item ${conv.id === activeConversationId ? 'active' : ''}`}
              onClick={() => switchConversation(conv.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  switchConversation(conv.id)
                }
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="conv-icon">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="conv-title">{conv.title}</span>
              <button
                type="button"
                className="conversation-delete"
                aria-label="删除会话"
                onClick={(event) => {
                  event.stopPropagation()
                  deleteConversation(conv.id)
                }}
              >
                {deletingId === conv.id ? '...' : '×'}
              </button>
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
        isBooting={isBooting}
        pageError={pageError}
        onRefreshConversations={refreshConversations}
      />
    </div>
  )
}

async function createConversationRequest() {
  const response = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) throw new Error('新建会话失败')
  return response.json()
}

export default ChatPage
