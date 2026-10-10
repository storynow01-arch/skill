import { expect, test } from 'claude-code/testing'

import { THRESHOLD, handoffPrompt, shouldShow } from '../hooks/register'

test('七成才顯示按鈕', async () => {
  expect(THRESHOLD).toBe(70)
  expect(shouldShow(null)).toBe(false)
  expect(shouldShow(69)).toBe(false)
  expect(shouldShow(70)).toBe(true)
  expect(shouldShow(92)).toBe(true)
})

test('按鈕送出的訊息以「收工」開頭、指名 shift-log、不 commit', async () => {
  const t = handoffPrompt(73)
  expect(t.startsWith('收工')).toBe(true)
  expect(t).toContain('73%')
  expect(t).toContain('shift-log')
  expect(t).toContain('不要 commit')
})
