export type Meter = {
  /** 上下文已用 token（最後一次回應的輸入側）；新對話第一次回應前沒有 */
  tokens?: number
  /** 模型的上下文視窗大小 */
  window: number
  /** 已用百分比 0～100 */
  percent?: number
  /** 用量上限視窗：five_hour、seven_day… */
  limits: { kind: string; percentUsed: number; resetsAt?: string }[]
  /** 本次對話花費（美元） */
  usd?: number
}

declare module 'claude-code' {
  interface PluginState {
    'token-meter': { meter: Meter | null; isHidden: boolean }
  }
}
