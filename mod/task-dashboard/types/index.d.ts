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
}

export type Board = { at: number; projects: Project[]; error?: string }

declare module 'claude-code' {
  interface PluginState {
    'task-dashboard': { board: Board | null; expanded: string | null }
  }
}
