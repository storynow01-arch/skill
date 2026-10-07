// 任務儀表板：一個面板看所有專案的 Claude 狀態，不用一直切換。
// 資料：scan/scan_projects.py 掃 ~/.claude/projects 每個專案最新的對話紀錄（只讀），每 30 秒一次。
// 輸入框上方一列：只列「執行中」的專案與它的進度（工作清單「目前狀態」第一條，沒有就是 Claude 最後一句）。
// 指令：/dashboard 打開完整面板（含等你回覆、閒置的專案；點專案名展開）。
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Board, Project } from '../types'

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
    const mine = (
      <Box columnGap={2}>
        <Text color="green">{`執行中 ${running.length}`}</Text>
        {running.length === 0 && <Text dimColor>目前沒有執行中的專案</Text>}
        {running.map(p => (
          <Box key={p.cwd} columnGap={1}>
            <Text bold>{p.name}</Text>
            <Text dimColor wrap="truncate">{runningText(p)}</Text>
          </Box>
        ))}
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
              {p.title !== '' && <Text dimColor wrap="truncate">{`  ${p.title}`}</Text>}
              {p.state === 'waiting' && p.lastClaude !== '' && (
                <Text wrap={isOpen ? 'wrap' : 'truncate'}>{`  Claude：${p.lastClaude}`}</Text>
              )}
              {isOpen && p.lastUser !== '' && <Text dimColor wrap="wrap">{`  你：${p.lastUser}`}</Text>}
              {isOpen && p.state !== 'waiting' && p.lastClaude !== '' && (
                <Text dimColor wrap="wrap">{`  Claude：${p.lastClaude}`}</Text>
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

/** 執行中的專案在一列裡顯示什麼：背景工作最後一行 → 工作清單「目前狀態」第一條 → Claude 最後一句（限 40 字） */
export const runningText = (p: Project): string => {
  const t = p.bg ? `背景 ${p.bg}` : (p.status[0] ?? p.lastClaude)
  return t.length > 40 ? t.slice(0, 40) + '…' : t
}

const isEngine = (x: unknown): boolean => x == null || (typeof x === 'object' && (x as { type?: unknown }).type === 'engine')
