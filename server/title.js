export function getConversationTitleFromText(text) {
  const normalized = String(text || '').trim().replace(/\s+/g, ' ')
  if (!normalized) return '新的聊天'
  return normalized.length > 20 ? `${normalized.slice(0, 20)}...` : normalized
}
