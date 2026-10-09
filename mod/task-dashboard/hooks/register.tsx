// 任務儀表板：一個面板看所有專案的 Claude 狀態，不用一直切換。
// 資料：scan/scan_projects.py 掃 ~/.claude/projects 每個專案最新的對話紀錄（只讀），每 30 秒一次。
// 輸入框上方一列：只列「執行中」的專案與它的進度（工作清單「目前狀態」第一條，沒有就是 Claude 最後一句）。
// 指令：/dashboard 打開完整面板（含等你回覆、閒置的專案；點專案名展開）。
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Board, Plan, Project } from '../types'

const PANE = 'task-dashboard'
const board = atom({ plugin: 'task-dashboard', key: 'board' } as const, null)
const expanded = atom({ plugin: 'task-dashboard', key: 'expanded' } as const, null)

const MARK: Record<Project['state'], string> = { running: '● 執行中', waiting: '● 等你回覆', idle: '○ 閒置' }
const COLOR: Record<Project['state'], string> = { running: 'green', waiting: 'yellow', idle: 'gray' }

/** 「剛剛」「5 分鐘前」「3 小時前」「2 天前」 */
export const agoText = (s: number): string => {
  if (s < 60) return '剛剛'
  if (s < 3600) return `${Math.floor(s / 60)} 分鐘前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小時前`
  return `${Math.floor(s / 86400)} 天前`
}

export const parseBoard = (stdout: string): Board => {
  const d = JSON.parse(stdout) as { at: number; projects: Project[] }
  return { at: d.at, projects: d.projects }
}

const scan = async ($: EngineInterface): Promise<void> => {
  try {
    const r = await $.process.run(['py', `${$.plugin.root}/scan/scan_projects.py`, '7'], {
      env: { PYTHONIOENCODING: 'utf-8' },
      timeoutMs: 20_000,
    })
    if (r.exitCode !== 0) throw new Error(r.stderr.slice(0, 200) || `exit ${r.exitCode}`)
    const b = parseBoard(r.stdout)
    await update($, board, () => b)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await update($, board, prev => ({ at: prev?.at ?? 0, projects: prev?.projects ?? [], error: msg }))
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'dashboard', description: '打開任務儀表板：所有專案的 Claude 狀態一覽' })
    void scan($)
    $.clock.every(30_000, () => void scan($))
    return next(e)
  })

  on('command.run', { command: 'dashboard' }, async $ => {
    void scan($)
    await $.ui.open({ id: PANE, title: '任務儀表板' })
    return { text: '任務儀表板已打開（每 30 秒自動更新）。' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)                         // 別的 mod（token 用量）畫的那一列
    const b = await read($, board)
    if (b === null || e.props.hasSurvey) return below
    const { Box, Text } = $.ui.resolve(e)
    const running = b.projects.filter(p => p.state === 'running')
    // 沒在執行、還沒做完的：dashboard.json 的進度，或還在動的對話工作清單（暫停中、工作清單.md 勾選框不列，免得一直佔位）
    const pending = b.projects.filter(p => p.state !== 'running' && p.plan != null && p.plan.done < p.plan.total
      && p.plan.source !== 'md' && p.plan.paused !== true)
    // 一個專案一行：狀態標籤 → 專案名 → 進度（有設定才有）→ 最近一句；名稱與標籤不縮，最後一段超出就截斷
    const rows = [...running.map(p => ({ p, run: true })), ...pending.map(p => ({ p, run: false }))]
    const shown = rows.slice(0, MAX_ROWS)
    const mine = (
      <Box flexDirection="column">
        {rows.length === 0 && (
          <Box columnGap={2}>
            <Text color="green" wrap="truncate">執行中 0</Text>
            <Text dimColor wrap="truncate">目前沒有執行中的專案</Text>
          </Box>
        )}
        {shown.map(({ p, run }) => (
          <Box key={p.cwd} columnGap={1}>
            <Box flexShrink={0}><Text color={run ? 'green' : 'yellow'}>{run ? '● 執行中' : '◐ 未完成'}</Text></Box>
            <Box flexShrink={0}><Text bold>{p.name}</Text></Box>
            {p.plan != null && <Box flexShrink={0}><Text color="cyan">{planText(p.plan)}</Text></Box>}
            {(run || p.plan == null) && (
              <Box flexShrink={1} minWidth={0}><Text dimColor wrap="truncate">{runningText(p)}</Text></Box>
            )}
          </Box>
        ))}
        {rows.length > MAX_ROWS && <Text dimColor wrap="truncate">{`還有 ${rows.length - MAX_ROWS} 個專案（/dashboard 看全部）`}</Text>}
        {b.error !== undefined && <Text color="red" wrap="truncate">掃描失敗</Text>}
      </Box>
    )
    return isEngine(below) ? mine : <Box flexDirection="column">{below}{mine}</Box>
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const b = await read($, board)
    const open = await read($, expanded)
    const now = Math.floor((await $.clock.now()) / 1000)
    const width = e.props.bodyColumns ?? 60

    if (b === null) return <Text dimColor>掃描中…</Text>
    const count = (s: Project['state']) => b.projects.filter(p => p.state === s).length
    const age = b.at ? now - b.at : 0

    return (
      <Box flexDirection="column" rowGap={1}>
        <Box columnGap={2}>
          <Text color="green">{`執行中 ${count('running')}`}</Text>
          <Text color="yellow">{`等你回覆 ${count('waiting')}`}</Text>
          <Text dimColor>{`閒置 ${count('idle')}`}</Text>
          <Button key="refresh" label="重新整理" plain onPress={() => scan($)} />
        </Box>
        {b.error !== undefined && <Text color="red">{`掃描失敗：${b.error}`}</Text>}
        {b.projects.length === 0 && <Text dimColor>最近 7 天沒有任何專案的對話紀錄。</Text>}
        {b.projects.map(p => {
          const isOpen = open === p.cwd
          return (
            <Box key={p.cwd} flexDirection="column">
              <Box columnGap={1}>
                <Text color={COLOR[p.state]}>{MARK[p.state]}</Text>
                <Button key={`p-${p.cwd}`} label={p.name} plain onPress={() => update($, expanded, v => (v === p.cwd ? null : p.cwd))} />
                <Text dimColor>{agoText(p.ago + age)}</Text>
                {p.open > 0 && <Text dimColor>{`未完成 ${p.open}`}</Text>}
              </Box>
              {p.plan != null
                ? <Text color="cyan">{`  ${planText(p.plan, true)}`}</Text>
                : <Text dimColor>{'  進度：沒有工作清單，不估算'}</Text>}
              {p.title !== '' && <Text dimColor wrap="truncate">{`  ${p.title}`}</Text>}
              {p.state === 'waiting' && p.lastClaude !== '' && (
                <Text wrap={isOpen ? 'wrap' : 'truncate'}>{`  Claude：${plain(p.lastClaude)}`}</Text>
              )}
              {isOpen && p.lastUser !== '' && <Text dimColor wrap="wrap">{`  你：${p.lastUser}`}</Text>}
              {isOpen && p.state !== 'waiting' && p.lastClaude !== '' && (
                <Text dimColor wrap="wrap">{`  Claude：${plain(p.lastClaude)}`}</Text>
              )}
              {isOpen && p.status.map((s, i) => <Text key={`s${i}`} wrap="wrap">{`  · ${s}`}</Text>)}
              {isOpen && <Text dimColor wrap="truncate">{`  ${p.cwd}`}</Text>}
            </Box>
          )
        })}
        <Text dimColor>{width >= 40 ? '點專案名展開／收合；/dashboard 重新打開' : '/dashboard'}</Text>
      </Box>
    )
  })
}

/** 執行中的專案在一列裡顯示什麼：背景工作最後一行 → 工作清單「目前狀態」第一條 → Claude 最後一句（去掉 Markdown 符號，限 40 字） */
export const runningText = (p: Project): string => {
  const raw = p.bg ? `背景 ${p.bg}` : (p.status[0] ?? p.lastClaude)
  const t = plain(raw)
  return t.length > 40 ? t.slice(0, 40) + '…' : t
}

/** 去掉 Markdown 記號（** ## ` > -）與多餘空白，一列裡才不會出現符號 */
export const plain = (s: string): string =>
  s.replace(/\*\*|__|`/g, '').replace(/\s*#{1,6}\s+/g, '').replace(/(^|\s)[>\-]\s+/g, '$1').replace(/\s+/g, ' ').trim()

/** 輸入框上方最多列幾個專案，其餘收成「還有 N 個」 */
export const MAX_ROWS = 4

/** 進度來源的前綴：對話工作清單「清單」、工作清單.md「勾選」；dashboard.json 不加 */
const SOURCE: Record<NonNullable<Plan['source']>, string> = { tasks: '清單 ', md: '勾選 ' }

/** 「84% 47/56節 · 預計 17:47 完成」；long 加上其他單位與每項分鐘數。工作清單來的前面加「清單」 */
export const planText = (pl: Plan, long = false): string => {
  const parts = [`${pl.source ? SOURCE[pl.source] : ''}${pl.pct}% ${pl.done}/${pl.total}${pl.label}`]
  if (long) for (const x of pl.extra) parts.push(`${x.label} ${x.done}/${x.total}`)
  if (pl.done >= pl.total) parts.push('已完成')
  else if (pl.paused) parts.push('暫停中')
  else if (pl.source === 'md') parts.push('不估完成時間')
  else if (pl.waitUntil) parts.push(`等 ${pl.waitUntil} 繼續`, ...(pl.etaText !== '' ? [`預計 ${pl.etaText} 完成`] : []))
  else if (pl.etaText !== '') parts.push(`預計 ${pl.etaText} 完成`)
  else parts.push('完成時間估算中')
  if (long && pl.perMin > 0 && pl.done < pl.total) parts.push(`每${pl.label}約 ${pl.perMin} 分`)
  return parts.join(' · ')
}

const isEngine = (x: unknown): boolean => x == null || (typeof x === 'object' && (x as { type?: unknown }).type === 'engine')
