import { expect, test } from 'claude-code/testing'

import { norm, othersOn, prune } from '../hooks/register'

test('路徑比對：反斜線、大小寫（Windows）一致', async () => {
  expect(norm('D:\\Claude\\A\\B.md')).toBe('d:/claude/a/b.md')
  expect(norm('d:/claude/a/b.md')).toBe('d:/claude/a/b.md')
  expect(norm('/home/u/A.md')).toBe('/home/u/A.md')
})

test('只留 30 分鐘內、格式正確的紀錄', async () => {
  const now = 10_000_000
  const list = [
    { file: 'a', shown: 'a', at: now - 29 * 60_000, session: 's1', cwd: 'x' },
    { file: 'a', shown: 'a', at: now - 31 * 60_000, session: 's1', cwd: 'x' },
    { bad: true },
    null,
  ]
  expect(prune(list, now).length).toBe(1)
  expect(prune('壞掉的檔案', now).length).toBe(0)
})

test('只找別的對話改過同一個檔案，新的在前', async () => {
  const list = [
    { file: 'a', shown: 'a', at: 1, session: 'me', cwd: 'x' },
    { file: 'a', shown: 'a', at: 2, session: 'other', cwd: 'x' },
    { file: 'a', shown: 'a', at: 5, session: 'other2', cwd: 'y' },
    { file: 'b', shown: 'b', at: 9, session: 'other', cwd: 'x' },
  ]
  const o = othersOn(list, 'a', 'me')
  expect(o.length).toBe(2)
  expect(o[0]?.session).toBe('other2')
  expect(othersOn(list, 'a', 'other2').length).toBe(2)
  expect(othersOn(list, 'c', 'me').length).toBe(0)
})
