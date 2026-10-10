// record-mask：/record 開啟「錄影遮罩」，畫面上的 email、API key、電話號碼換成遮罩；再打一次 /record 關閉。
// 只改畫面（ui.render 改 props），存起來的對話與 Claude 讀到的內容完全不動。
// 遮的地方：我打的訊息（UserMessage）、Claude 的回答（AssistantMessage）、工具呼叫與結果（ToolUse、ToolResult）、
// 斜線指令輸出（CommandOutput）。
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const isOn = atom({ plugin: 'record-mask', key: 'isOn' } as const, false)

const DOT = '••••••'

/** 各種 API key／token：保留辨識用的前綴，後面遮掉 */
const KEY_PATTERNS: RegExp[] = [
  /\b(sk-ant-[a-z0-9]{3,}-)[A-Za-z0-9_-]{8,}/g,
  /\b(sk-(?:proj-|live-|test-)?)[A-Za-z0-9_-]{16,}/g,
  /\b(sb_(?:secret|publishable)_)[A-Za-z0-9_-]{8,}/g,
  /\b(AIza)[0-9A-Za-z_-]{30,}/g,
  /\b(gh[pousr]_)[A-Za-z0-9]{20,}/g,
  /\b(github_pat_)[A-Za-z0-9_]{20,}/g,
  /\b(xox[abposr]-)[A-Za-z0-9-]{10,}/g,
  /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g,
  /\b(glpat-)[A-Za-z0-9_-]{16,}/g,
  /\b(hf_)[A-Za-z0-9]{20,}/g,
  /\b(eyJ)[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, // JWT
]
/** 「API_KEY=xxxx」「"token": "xxxx"」「Bearer xxxx」這類：只遮值 */
const ASSIGN = /\b([A-Za-z0-9_]*(?:api[_-]?key|secret|token|password|passwd|pwd|auth)[A-Za-z0-9_]*["']?\s*[:=]\s*["']?)([^\s"'`,;]{8,})/gi
const BEARER = /\b(Bearer\s+)([A-Za-z0-9._~+/=-]{12,})/g
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g
/** 電話：台灣手機、市話（含括號區碼）、+國碼；日期、時間、版本號不會被當成電話 */
const PHONES: RegExp[] = [
  /(?:\+?886[\s-]?|\b0)9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g,
  /\(0\d{1,3}\)\s?\d{3,4}[\s-]?\d{3,4}\b/g,
  /\b0\d{1,3}-\d{3,4}-\d{4}\b/g,
  /\+\d{1,3}[\s-]?\(?\d{1,4}\)?(?:[\s-]?\d{2,4}){2,4}\b/g,
]

/** 把一段文字裡的 email、API key、電話換成遮罩 */
export const mask = (s: string): string => {
  let t = s
  for (const re of KEY_PATTERNS) t = t.replace(re, (_, pre: string) => `${pre}${DOT}`)
  t = t.replace(ASSIGN, (_, pre: string) => `${pre}${DOT}`)
  t = t.replace(BEARER, (_, pre: string) => `${pre}${DOT}`)
  t = t.replace(EMAIL, '•••@•••')
  for (const re of PHONES) t = t.replace(re, m => m.replace(/\d/g, '•'))
  return t
}

/** 整個物件裡的字串都遮（鍵名、數字、布林不動，結構不變） */
export const maskDeep = (v: unknown, depth = 0): unknown => {
  if (typeof v === 'string') return mask(v)
  if (depth > 30 || v === null || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(x => maskDeep(x, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, x] of Object.entries(v)) out[k] = maskDeep(x, depth + 1)
  return out
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'record',
      description: '錄影遮罩開關：畫面上的 email、API key、電話號碼換成遮罩（只改畫面，不改 Claude 讀到的內容）',
    })
    if (await read($, isOn)) $.ui.status('● 錄影遮罩中')
    return next(e)
  })

  on('command.run', { command: 'record' }, async $ => {
    const on2 = await update($, isOn, v => !v)
    $.ui.status(on2 ? '● 錄影遮罩中' : undefined)
    return {
      text: on2
        ? '錄影遮罩已開啟：畫面上的 email、API key、電話號碼會換成遮罩（Claude 讀到的內容不變）。再打 /record 關閉。'
        : '錄影遮罩已關閉。',
    }
  })

  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    return {
      sections: [
        ...r.sections,
        {
          id: 'record-mask:about',
          scope: 'session',
          text:
            '已安裝 record-mask mod：使用者打 /record 會開關「錄影遮罩」，開啟時畫面上的 email、API key、電話號碼換成遮罩，' +
            '只改畫面、不改你讀到的內容。使用者說要錄影、截圖、分享畫面時，可以提醒他先打 /record；' +
            '遮罩不涵蓋輸入框裡正在打的字、狀態列與面板。',
        },
      ],
    }
  })

  // 我打的訊息、Claude 的回答、斜線指令輸出：改 text
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (!(await read($, isOn))) return next(e)
    const text = mask(e.props.text)
    return text === e.props.text ? next(e) : next({ ...e, props: { ...e.props, text } })
  })
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!(await read($, isOn))) return next(e)
    const text = mask(e.props.text)
    return text === e.props.text ? next(e) : next({ ...e, props: { ...e.props, text } })
  })
  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => {
    if (!(await read($, isOn))) return next(e)
    const text = mask(e.props.text)
    return text === e.props.text ? next(e) : next({ ...e, props: { ...e.props, text } })
  })

  // 工具呼叫那一列：輸入（指令、路徑）與內嵌的結果
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!(await read($, isOn))) return next(e)
    const input = maskDeep(e.props.input)
    const output = e.props.output === undefined ? undefined : maskDeep(e.props.output)
    if (same(input, e.props.input) && same(output, e.props.output)) return next(e)
    return next({ ...e, props: { ...e.props, input, ...(output === undefined ? {} : { output }) } })
  })

  // 工具結果區塊
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    if (!(await read($, isOn))) return next(e)
    const output = maskDeep(e.props.output)
    return same(output, e.props.output) ? next(e) : next({ ...e, props: { ...e.props, output } })
  })
}
