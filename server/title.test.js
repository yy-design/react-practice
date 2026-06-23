import test from 'node:test'
import assert from 'node:assert/strict'
import { getConversationTitleFromText } from './title.js'

test('returns default title for empty input', () => {
  assert.equal(getConversationTitleFromText('  '), '新的聊天')
})

test('normalizes whitespace in conversation title', () => {
  assert.equal(getConversationTitleFromText('  帮我   总结  React 项目  '), '帮我 总结 React 项目')
})

test('truncates long conversation titles', () => {
  assert.equal(getConversationTitleFromText('这是一段超过二十个字符的会话标题内容用于测试'), '这是一段超过二十个字符的会话标题内容用于...')
})
