import { expect, test } from 'claude-code/testing'

import { agoText, parseBoard, runningText } from '../hooks/register'

test('多久以前', async () => {
  expect(agoText(5)).toBe('剛剛')
  expect(agoText(300)).toBe('5 分鐘前')
  expect(agoText(7300)).toBe('2 小時前')
  expect(agoText(200000)).toBe('2 天前')
})

test('讀掃描程式的輸出', async () => {
  const b = parseBoard(JSON.stringify({
    at: 100,
    projects: [{ name: '01教學影片AI製作', cwd: 'D:/claude/01', state: 'running', ago: 3, title: '', lastUser: '早安',
      lastClaude: '進度如下', status: ['EP3 完成'], open: 2 }],
  }))
  expect(b.projects.length).toBe(1)
  expect(b.projects[0]?.state).toBe('running')
  expect(b.projects[0]?.open).toBe(2)
})

test('執行中那一列：先用工作清單目前狀態，太長截斷', async () => {
  const base = { name: 'x', cwd: 'x', state: 'running' as const, ago: 1, title: '', lastUser: '', open: 0 }
  expect(runningText({ ...base, lastClaude: 'Claude 說的', status: ['EP5 待合併'] })).toBe('EP5 待合併')
  expect(runningText({ ...base, lastClaude: '', status: ['EP5 待合併'], bg: '[08:39] 4-7 ✓' })).toBe('背景 [08:39] 4-7 ✓')
  expect(runningText({ ...base, lastClaude: 'Claude 說的', status: [] })).toBe('Claude 說的')
  expect(runningText({ ...base, lastClaude: '字'.repeat(50), status: [] }).length).toBe(41)
})
