export function normalizeConversationTitle(title) {
  return String(title || '').trim()
}

export function getNextConversationIdAfterDelete(conversations, deletedId, activeId) {
  if (deletedId !== activeId) return activeId

  const deletedIndex = conversations.findIndex((conversation) => conversation.id === deletedId)
  const remaining = conversations.filter((conversation) => conversation.id !== deletedId)
  if (remaining.length === 0) return null

  return remaining[Math.min(deletedIndex, remaining.length - 1)]?.id || null
}
