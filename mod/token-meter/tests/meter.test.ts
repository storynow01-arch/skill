import { expect, test } from 'claude-code/testing'

import { bar, num, resetIn, short, toMeter } from '../hooks/register'

test('進度條 10 格，四捨五入、不超出範圍', async () => {
  expect(bar(0)).toBe('░░░░░░░░░░')
  expect(bar(41)).toBe('▓▓▓▓░░░░░░')
  expect(bar(100)).toBe('▓▓▓▓▓▓▓▓▓▓')
  expect(bar(130)).toBe('▓▓▓▓▓▓▓▓▓▓')
})

test('數字加千分位', async () => {
  expect(num(82310)).toBe('82,310')
  expect(num(200000)).toBe('200,000')
  expect(num(950)).toBe('950')
})

test('重置倒數用中文', async () => {
  const now = Date.parse('2026-10-07T08:00:00Z')
  expect(resetIn('2026-10-07T10:05:00Z', now)).toBe('2 小時 5 分後重置')
  expect(resetIn('2026-10-10T12:00:00Z', now)).toBe('3 天 4 小時後重置')
  expect(resetIn('2026-10-07T08:20:30Z', now)).toBe('20 分後重置')
  expect(resetIn('2026-10-07T07:00:00Z', now)).toBe('即將重置')
  expect(resetIn(undefined, now)).toBe('')
})

test('用量轉成畫面要的欄位', async () => {
  const m = toMeter({
    startedAt: 0,
    context: { tokens: 82310, window: 200000, percent: 41 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 23.5, resetsAt: '2026-10-07T10:05:00Z' }],
    cost: { usd: 1.234 },
  })
  expect(m.percent).toBe(41)
  expect(m.limits[0]?.kind).toBe('five_hour')
  expect(m.usd).toBe(1.234)
})

test('重置時間縮短成一列放得下', async () => {
  expect(short('2 小時 5 分後重置')).toBe('2時5分')
  expect(short('6 天 16 小時後重置')).toBe('6天16時')
  expect(short('20 分後重置')).toBe('20分')
})
