export type Project = {
  name: string
  cwd: string
  /** running：90 秒內有動作；waiting：Claude 講完在等你；idle：閒置 */
  state: 'running' | 'waiting' | 'idle'
  /** 最後動作距今秒數（掃描當下） */
  ago: number
  title: string
  lastUser: string
  lastClaude: string
  /** 工作清單.md「目前狀態」或 進度.md 前幾條 */
  status: string[]
  /** 工作清單.md 還沒勾的項目數 */
  open: number
  /** 背景工作（.claude/dashboard.json 登記的紀錄檔）30 分鐘內的最後一行；沒有就空字串 */
  bg?: string
  /** 全部進度與預計完成時間（.claude/dashboard.json 的 progress）；沒設定就是 null */
  plan?: Plan | null
}

export type Plan = {
  label: string
  done: number
  total: number
  /** done／total 的百分比（整數） */
  pct: number
  /** 只顯示數量的其他單位，例：集 5/8 */
  extra: { label: string; done: number; total: number }[]
  /** 估算用的每項分鐘數（0＝還量不出來） */
  perMin: number
  /** 預計完成時間（epoch 秒）；量不出來是 null */
  eta: number | null
  /** 「17:47」「明天 09:10」「10/09 14:00」 */
  etaText: string
}

export type Board = { at: number; projects: Project[]; error?: string }

declare module 'claude-code' {
  interface PluginState {
    'task-dashboard': { board: Board | null; expanded: string | null }
  }
}
