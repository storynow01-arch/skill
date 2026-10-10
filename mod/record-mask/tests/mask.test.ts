import { expect, test } from 'claude-code/testing'

import { mask, maskDeep } from '../hooks/register'

test('email 遮掉', async () => {
  expect(mask('寄到 someone@example.com 謝謝')).toBe('寄到 •••@••• 謝謝')
})

test('API key 留前綴、後面遮掉', async () => {
  expect(mask('sk-ant-api03-AbCdEfGhIjKlMnOpQrStUv')).toBe('sk-ant-api03-••••••')
  expect(mask('key=AIzaSyA1234567890abcdefghijklmnopqrstu')).not.toContain('1234567890abc')
  expect(mask('GEMINI_API_KEY=abcdefgh12345678')).toBe('GEMINI_API_KEY=••••••')
  expect(mask('Authorization: Bearer abcdefghijklmnop.qrs')).not.toContain('abcdefghijklmnop')
  expect(mask('sb_secret_abcdEFGH1234')).toBe('sb_secret_••••••')
  expect(mask('ghp_abcdefghijklmnopqrstuvwxyz0123')).toBe('ghp_••••••')
})

test('電話遮數字、保留格式', async () => {
  expect(mask('電話 (07) 123-4567 轉 660')).toBe('電話 (••) •••-•••• 轉 660')
  expect(mask('手機 0912-345678')).toBe('手機 ••••-••••••')
  expect(mask('02-2345-6789')).toBe('••-••••-••••')
  expect(mask('+886 912 345 678')).not.toMatch(/\d{3}/)
})

test('日期、時間、版本號、一般數字不動', async () => {
  const s = '2026-10-10 12:10～15:10，v2.1.295，限 30 名，藏書 3000 冊，commit e2977ce'
  expect(mask(s)).toBe(s)
})

test('物件裡的字串都遮、結構不變', async () => {
  const v = maskDeep({ command: 'echo someone@example.com', n: 3, ok: true, list: ['0912-345-678'] })
  expect(v).toEqual({ command: 'echo •••@•••', n: 3, ok: true, list: ['••••-•••-•••'] })
})
