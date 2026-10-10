// edit-guard：多個對話同時改同一個檔案時先問使用者。
// 每次 Write／Edit／NotebookEdit 成功後，把「檔名、時間、對話 ID、專案資料夾」記到所有對話共用的
// ~/.claude/edit-ledger.json（只留最近 30 分鐘）。每次要寫之前先查：30 分鐘內有別的對話改過同一個檔案，
// 就跳出對話框問「繼續／取消」。同一個檔案按過「繼續」後，除非別的對話又改了，不會再問。
import type { EngineInterface, Register } from 'claude-code'

export type Entry = { file: string; shown: string; at: number; session: string; cwd: string }

const WINDOW_MS = 30 * 60 * 1000
const TOOLS = new Set(['Write', 'Edit', 'NotebookEdit'])

/** 比對用的路徑：反斜線換成斜線；Windows 磁碟路徑不分大小寫 */
export const norm = (p: string): string => {
  const s = p.replace(/\\/g, '/').replace(/\/+$/, '')
  return /^[a-z]:\//i.test(s) ? s.toLowerCase() : s
}

/** 只留 30 分鐘內、格式正確的紀錄 */
export const prune = (list: unknown, now: number): Entry[] =>
  (Array.isArray(list) ? list : []).filter(
    (x): x is Entry =>
      !!x && typeof x === 'object' && typeof (x as Entry).file === 'string' &&
      typeof (x as Entry).at === 'number' && now - (x as Entry).at < WINDOW_MS && (x as Entry).at <= now + 60_000,
  )

/** 30 分鐘內別的對話改過這個檔案的紀錄（新的在前） */
export const othersOn = (list: Entry[], file: string, me: string): Entry[] =>
  list.filter(x => x.file === file && x.session !== me).sort((a, b) => b.at - a.at)

const minutesAgo = (at: number, now: number): string => {
  const m = Math.max(0, Math.round((now - at) / 60000))
  return m === 0 ? '不到 1 分鐘前' : `${m} 分鐘前`
}

const pathOf = (e: { tool: string }): string | undefined => {
  const x = e as unknown as { file_path?: unknown; notebook_path?: unknown }
  const p = x.file_path ?? x.notebook_path
  return typeof p === 'string' && p !== '' ? p : undefined
}

/** 共用紀錄檔：~/.claude/edit-ledger.json */
async function ledgerPath($: EngineInterface): Promise<string> {
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '.'
  return `${home.replace(/\\/g, '/')}/.claude/edit-ledger.json`
}

/** 讀紀錄（只留 30 分鐘內）；還沒有紀錄檔或檔案壞了就當作沒有 */
async function loadLedger($: EngineInterface, where: string): Promise<Entry[]> {
  try {
    return prune(JSON.parse(await $.fs.read(where)), await $.clock.now())
  } catch {
    return []
  }
}

export const register: Register = on => {
  // 這個對話已經同意過的檔案：檔案 → 同意時看到的「別的對話最新一次修改時間」
  const accepted = new Map<string, number>()

  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    return {
      sections: [
        ...r.sections,
        {
          id: 'edit-guard:about',
          scope: 'session',
          text:
            '已安裝 edit-guard mod：每次用 Write／Edit／NotebookEdit 寫檔前，它會查所有對話共用的紀錄（~/.claude/edit-ledger.json，只留 30 分鐘）。' +
            '若 30 分鐘內有別的對話改過同一個檔案，會跳出對話框請使用者選「繼續」或「取消」；被取消時工具會回報錯誤，' +
            '這時不要換別的方式（例如 Bash）硬寫同一個檔案，先告訴使用者哪個檔案和別的對話撞到，等使用者決定。',
        },
      ],
    }
  })

  on('tool.call', async ($, e, next) => {
    if (!TOOLS.has(String(e.tool))) return next(e)
    const raw = pathOf(e)
    if (raw === undefined) return next(e)

    const cwd = await $.session.cwd()
    const abs = /^([a-z]:[\\/]|[\\/])/i.test(raw) ? raw : `${cwd}/${raw}`
    const file = norm(abs)
    const me = await $.session.id()
    const where = await ledgerPath($)

    // 寫之前：查 30 分鐘內別的對話有沒有改過
    const now = await $.clock.now()
    const others = othersOn(await loadLedger($, where), file, me)
    const o = others[0]
    if (o !== undefined && (accepted.get(file) ?? -1) < o.at) {
      const sessions = new Set(others.map(x => x.session)).size
      const who = sessions > 1 ? `${sessions} 個別的對話` : `另一個對話（ID ${o.session.slice(0, 8)}，專案 ${o.cwd}）`
      let answer = ''
      try {
        answer = await $.ui.ask(
          `「${o.shown}」${minutesAgo(o.at, now)}被${who}改過。要繼續寫入，還是取消？`,
          { header: '檔案撞到', options: ['繼續寫入', '取消'] },
        )
      } catch {
        answer = '取消' // 對話框被關掉或沒有人可以問：當作取消
      }
      if (answer !== '繼續寫入') {
        return {
          deny:
            `edit-guard：使用者取消寫入。${o.shown} 在 ${minutesAgo(o.at, now)}被${who}改過。` +
            '不要用其他方式寫這個檔案，先向使用者說明並等他決定。',
        }
      }
      accepted.set(file, o.at)
    }

    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true) return ran

    // 寫成功之後：記下來（重新讀一次，盡量不蓋掉別的對話剛寫的紀錄）
    const at = await $.clock.now()
    const list = (await loadLedger($, where)).filter(x => !(x.file === file && x.session === me))
    const shown = /^[a-z]:[\\/]/i.test(abs) ? abs.replace(/\//g, '\\') : abs
    list.push({ file, shown, at, session: me, cwd })
    try {
      await $.fs.write(where, JSON.stringify(list, null, 1))
    } catch (err) {
      $.ui.log(`edit-guard：寫不進紀錄檔 ${where}：${String(err)}`, { to: 'debug' })
    }
    return ran
  }).catch(($, e, next) => next(e)) // 守門程式自己出錯時不擋使用者工作（放行）
}
