// token-meter：在輸入框上方直接顯示數字與進度條（取代右下角只看得到圖形的用量圈）。
// 上下文 ▓▓▓▓░░░░░░ 41%  82,310 / 200,000 ｜ 5 小時 ▓▓░░░░░░░░ 23%  2 小時 5 分後重置 ｜ 7 天 … ｜ 本次 $1.23
// 數字來源：$.session.usage()（跟狀態列同一份），每次變動由 session.measure 推過來；倒數時間每分鐘更新一次。
import { atom, read, update } from 'claude-code'
import type { Register, SessionMeasureInput, SessionUsage } from 'claude-code'

import type { Meter } from '../types'

const meter = atom({ plugin: 'token-meter', key: 'meter' } as const, null)
const isHidden = atom({ plugin: 'token-meter', key: 'isHidden' } as const, false)

const LIMIT_NAME: Record<string, string> = { five_hour: '5 小時', seven_day: '7 天', spend_limit: '額度' }

export const toMeter = (u: SessionUsage | SessionMeasureInput): Meter => ({
  tokens: u.context.tokens,
  window: u.context.window,
  percent: u.context.percent,
  limits: u.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })),
  usd: u.cost?.usd,
})

/** 10 格進度條 */
export const bar = (percent: number, cells = 10): string => {
  const n = Math.max(0, Math.min(cells, Math.round((percent / 100) * cells)))
  return '▓'.repeat(n) + '░'.repeat(cells - n)
}

/** 千分位 */
export const num = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** 距離重置還有多久：「2 小時 5 分後重置」「3 天 4 小時後重置」 */
export const resetIn = (iso: string | undefined, now: number): string => {
  if (!iso) return ''
  const ms = Date.parse(iso) - now
  if (!Number.isFinite(ms)) return ''
  if (ms <= 0) return '即將重置'
  const min = Math.floor(ms / 60000)
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60
  if (d > 0) return `${d} 天 ${h} 小時後重置`
  if (h > 0) return `${h} 小時 ${m} 分後重置`
  return `${m} 分後重置`
}

/** 用量顏色：80% 以上紅、60% 以上黃、其他綠 */
const tone = (p: number): string => (p >= 80 ? 'red' : p >= 60 ? 'yellow' : 'green')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const u = await $.session.usage()
    await update($, meter, () => toMeter(u))
    await $.command.register({ name: 'token', description: '顯示或隱藏輸入框上方的 token 與用量列' })
    // 重置倒數每分鐘重畫一次（數字本身由 session.measure 推送）
    $.clock.every(60_000, () => {
      void $.session.usage().then(x => update($, meter, () => toMeter(x)))
    })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, meter, () => toMeter(e))
    return next(e)
  })

  on('command.run', { command: 'token' }, async $ => {
    const hidden = await update($, isHidden, v => !v)
    return { text: hidden ? 'token 用量列已隱藏（再打 /token 顯示）' : 'token 用量列已顯示' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)                         // 別的 mod（任務儀表板）畫的那一列，疊在下面
    const m = await read($, meter)
    if (m === null || e.props.hasSurvey || (await read($, isHidden))) return below
    const now = await $.clock.now()
    const { Box, Text } = $.ui.resolve(e)
    const ctxP = m.percent ?? 0
    const mine = (
      <Box columnGap={2}>
        <Box columnGap={1}>
          <Text dimColor>上下文</Text>
          <Text color={tone(ctxP)}>{bar(ctxP, 5)}</Text>
          <Text bold>{m.percent === undefined ? '—' : `${ctxP}%`}</Text>
          <Text dimColor wrap="truncate">{m.tokens === undefined ? '' : `${num(m.tokens)}/${num(m.window)}`}</Text>
        </Box>
        {m.limits.map(l => (
          <Box key={l.kind} columnGap={1}>
            <Text dimColor>{LIMIT_NAME[l.kind] ?? l.kind}</Text>
            <Text color={tone(l.percentUsed)}>{bar(l.percentUsed, 5)}</Text>
            <Text bold>{`${l.percentUsed}%`}</Text>
            <Text dimColor wrap="truncate">{short(resetIn(l.resetsAt, now))}</Text>
          </Box>
        ))}
        {m.usd !== undefined && (
          <Box columnGap={1}>
            <Text dimColor>本次</Text>
            <Text bold>{`$${m.usd.toFixed(2)}`}</Text>
          </Box>
        )}
      </Box>
    )
    return isEngine(below) ? mine : <Box flexDirection="column">{mine}{below}</Box>
  })
}

/** 「2 小時 5 分後重置」→「2時5分」，一列放得下 */
export const short = (s: string): string =>
  s.replace(/後重置$/, '').replace(/ 小時 ?/g, '時').replace(/ 天 ?/g, '天').replace(/ 分$/, '分').replace(/ /g, '')

/** next(e) 沒有東西時回傳的是引擎自己的占位 */
const isEngine = (x: unknown): boolean => x == null || (typeof x === 'object' && (x as { type?: unknown }).type === 'engine')
