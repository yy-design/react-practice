import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getNextConversationIdAfterDelete,
  normalizeConversationTitle,
} from './conversationActions.js'

test('normalizeConversationTitle trims whitespace', () => {
  assert.equal(normalizeConversationTitle('  面试项目演示  '), '面试项目演示')
})

test('normalizeConversationTitle rejects empty titles', () => {
  assert.equal(normalizeConversationTitle('   '), '')
})

test('getNextConversationIdAfterDelete keeps current active id when deleting another conversation', () => {
  const conversations = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  assert.equal(getNextConversationIdAfterDelete(conversations, 'c', 'a'), 'a')
})

test('getNextConversationIdAfterDelete chooses the next available conversation', () => {
  const conversations = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  assert.equal(getNextConversationIdAfterDelete(conversations, 'b', 'b'), 'c')
})

test('getNextConversationIdAfterDelete falls back to the previous conversation', () => {
  const conversations = [{ id: 'a' }, { id: 'b' }]

  assert.equal(getNextConversationIdAfterDelete(conversations, 'b', 'b'), 'a')
})
