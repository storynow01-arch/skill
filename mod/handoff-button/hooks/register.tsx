// handoff-button：上下文用到七成時，輸入框上方出現「交接」按鈕。
// 按下去送出「收工」：觸發使用者的 shift-log skill（收工流程），寫回專案的交接文件（HANDOFF.md 等）。
// 上下文百分比來自 $.session.usage()／session.measure（跟狀態列同一份）。
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

export const THRESHOLD = 70

const percent = atom({ plugin: 'handoff-button', key: 'percent' } as const, null)
const isSent = atom({ plugin: 'handoff-button', key: 'isSent' } as const, false)

/** 按下按鈕時送出的訊息 */
export const handoffPrompt = (p: number): string =>
  `收工。上下文已用到 ${p}%，請照 shift-log skill 的收工流程完成交接：` +
  '把這次做的事、原因、遇到的問題與可直接執行的下一步寫進專案交接文件的進度日誌，同步更新開頭的現況摘要；不要 commit 或 push。'

/** 要不要顯示按鈕 */
export const shouldShow = (p: number | null): boolean => p !== null && p >= THRESHOLD

const isEngine = (x: unknown): boolean => x == null || (typeof x === 'object' && (x as { type?: unknown }).type === 'engine')

/** 記下上下文百分比；壓縮或清空後降到門檻以下 10% 就讓按鈕重新可按 */
async function setPercent($: EngineInterface, p: number | undefined): Promise<void> {
  const v = p === undefined ? null : Math.round(p)
  await update($, percent, () => v)
  if (v !== null && v < THRESHOLD - 10) await update($, isSent, () => false)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await setPercent($, (await $.session.usage()).context.percent)
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await setPercent($, e.context.percent)
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    return {
      sections: [
        ...r.sections,
        {
          id: 'handoff-button:about',
          scope: 'session',
          text:
            `已安裝 handoff-button mod：上下文用到 ${THRESHOLD}% 時，輸入框上方會出現「交接」按鈕，` +
            '使用者按下會送出以「收工」開頭的訊息。收到時照 shift-log skill 的收工流程做（找交接文件、寫進度日誌、更新現況摘要、確認可運行、掃機密），不要自己 commit／push。',
        },
      ],
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e) // 其他 mod（token 用量、任務儀表板）畫的列，疊在下面
    const p = await read($, percent)
    if (e.props.hasSurvey || !shouldShow(p)) return below
    const sent = await read($, isSent)
    const { Box, Button, Text } = $.ui.resolve(e)
    const mine = (
      <Box columnGap={1}>
        <Text color="yellow">{`上下文 ${p}%`}</Text>
        {sent ? (
          <Text dimColor>已送出交接（收工）</Text>
        ) : (
          <Button
            key="handoff"
            label="交接（收工）"
            variant="primary"
            onPress={async () => {
              await update($, isSent, () => true)
              await $.prompt.submit({ text: handoffPrompt(p ?? THRESHOLD) })
            }}
          />
        )}
      </Box>
    )
    return isEngine(below) ? mine : (
      <Box flexDirection="column">
        {mine}
        {below}
      </Box>
    )
  })
}
