import { expect, test } from 'claude-code/testing'

import { agoText, parseBoard, plain, planText, runningText } from '../hooks/register'

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

test('全部進度與預計完成時間', async () => {
  const pl = { label: '節', done: 47, total: 56, pct: 84, extra: [{ label: '集', done: 5, total: 8 }], perMin: 27, eta: 1, etaText: '17:47' }
  expect(planText(pl)).toBe('84% 47/56節 · 預計 17:47 完成')
  expect(planText(pl, true)).toBe('84% 47/56節 · 集 5/8 · 預計 17:47 完成 · 每節約 27 分')
  expect(planText({ ...pl, eta: null, etaText: '', perMin: 0 })).toBe('84% 47/56節 · 完成時間估算中')
  expect(planText({ ...pl, done: 56, pct: 100 })).toBe('100% 56/56節 · 已完成')
  expect(planText({ ...pl, done: 51, pct: 91, waitUntil: '15:05', etaText: '17:40' })).toBe('91% 51/56節 · 等 15:05 繼續 · 預計 17:40 完成')
})

test('一列裡不出現 Markdown 符號', async () => {
  expect(plain('全部查清並修好了。先給你**今天的戰報結論**，## 一、')).toBe('全部查清並修好了。先給你今天的戰報結論，一、')
  expect(plain('用 `final_qa.py` 檢查')).toBe('用 final_qa.py 檢查')
})
