/* 範本風格共用：場景語彙、cue、文字換行與自動字級。
   三個範本（A 闖關遊戲／B 創客手稿／C 動態字體快剪）都吃同一份 spec，場景型別一律是：
   title, scenario, definition, cards, vs, quiz, stat, recap, qaEnd
   （欄位定義見 templates/範本風格_場景語彙.md） */
import type {Spec} from '../Video';

export type TplSpec = Spec & {qa?: boolean; tplName?: string; brand?: {logo?: string; cover?: string; intro?: string; logoWidth?: number; mascot?: string} | null; pen?: string | null; outro?: boolean | null};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TplScene = {p: any; cues: number[]; dur: number; from: number; id: string};

export const TPL_TYPES = ['title', 'scenario', 'definition', 'cards', 'vs', 'quiz', 'stat', 'recap', 'qaEnd'];

/** 第 i 句旁白的起始 frame（場景內），沒有就用 fb */
export const cue = (cues: number[], i: number | undefined, fb: number) =>
  i !== undefined && i !== null && i >= 0 && cues && cues[i] !== undefined ? cues[i] : fb;

/** 字元寬度估計（全形 1、半形 0.55） */
export const textW = (s: string) => Array.from(s).reduce((w, ch) => w + (/[\u0000-ÿ]/.test(ch) ? 0.56 : 1), 0);

/** 在 maxW 內放得下的字級（不超過 base） */
export const fit = (s: string, maxW: number, base: number, min = 28) => Math.max(min, Math.min(base, maxW / Math.max(1, textW(s))));

/** 依每行最多 n 個全形字寬換行（2026-10-09 改版，跟字幕 split_caption 同一套想法）：
 *  先求最少行數，再在這個行數裡挑最自然的切點——標點、空白（含全形空白）後面最好；英數字串不拆；標點不放行首；
 *  不留 ≤3 字的尾巴行；各行盡量等長。舊版「塞滿 n 字才斷」會切出「……一組　是｜幾進制？」「L｜形」。 */
export const wrap = (s: string, n: number): string[] => {
  const t = s.trim();
  if (!t) return [''];
  if (textW(t) <= n) return [t];
  const ch = Array.from(t), L = ch.length;
  const ascii = (c?: string) => !!c && /[A-Za-z0-9.%+\-_/#@]/.test(c);
  const punct = (c?: string) => !!c && /[，。、：；！？,.:;!?）」』】]/.test(c);
  const gap = (c?: string) => !!c && /[\s　]/.test(c);
  // 在 i 之前斷（第 i 個字開新行）的代價；Infinity＝不准
  const cost = (i: number) => {
    const a = ch[i - 1], b = ch[i];
    if (punct(b)) return Infinity;                         // 標點不放行首
    if (ascii(a) && ascii(b)) return Infinity;             // 英數字串不拆（3.14、ADC、5-1）
    if (punct(a) || a === '　' || b === '　') return 0;   // 標點、全形空白（字幕去標點後留下的）後面最好
    if (gap(a) || gap(b)) return 3;                        // 半形空白只是中英文間距（「每 3 個」），不是斷句處
    if (/[（「『【]/.test(a ?? '')) return Infinity;       // 左括號不放行尾
    return 2.2;                                            // 一般的字與字之間
  };
  const width = (i: number, j: number) => textW(ch.slice(i, j).join('').trim());
  // DP：best[j]＝前 j 個字切好的 [行數, 代價, 上一個切點]
  const best: [number, number, number][] = Array(L + 1).fill([Infinity, Infinity, -1]);
  best[0] = [0, 0, -1];
  for (let j = 1; j <= L; j++) {
    for (let i = 0; i < j; i++) {
      if (best[i][0] === Infinity) continue;
      const w = width(i, j);
      if (w > n || w === 0) continue;
      const brk = j === L ? 0 : cost(j);
      if (brk === Infinity) continue;
      const short = j === L && i > 0 ? (w <= 2 ? 6 : w <= 3 ? 1 : 0) : 0;   // 尾巴行太短（≤2 字很醜，3 字還可以）
      const even = ((n - w) / n) ** 2 * 0.5;
      const c: [number, number, number] = [best[i][0] + 1, best[i][1] + brk + short + even, i];
      if (c[0] < best[j][0] || (c[0] === best[j][0] && c[1] < best[j][1])) best[j] = c;
    }
  }
  if (best[L][0] === Infinity) {                           // 找不到合法切法（例如超長英文字）→ 退回硬切
    const out: string[] = []; let cur = '';
    for (const c of ch) { if (textW(cur + c) > n) { out.push(cur); cur = ''; } cur += c; }
    if (cur) out.push(cur);
    return out;
  }
  const cuts: number[] = [];
  for (let j = L; j > 0; j = best[j][2]) cuts.unshift(j);
  let prev = 0;
  return cuts.map((j) => { const ln = ch.slice(prev, j).join('').trim(); prev = j; return ln; });
};

/** 目前這一格要顯示的字幕 */
export const captionAt = (spec: Spec, f: number, tail = 6) => {
  // 下一句 10 格內就出現時直接接上，不讓字幕帶空 1～2 格（最終品檢 F1 字幕閃爍；2026-10-07 範本C 30 秒示範抓到）
  const cs = spec.captions;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i], nx = cs[i + 1];
    const end = nx && nx.from - c.to <= 10 ? Math.max(nx.from, c.to + Math.min(tail, nx.from - c.to)) : c.to + tail;
    if (f >= c.from && f < end) return c;
  }
  return undefined;
};

/** 目前的場景索引 */
export const sceneIndex = (spec: Spec, f: number) => Math.max(0, spec.scenes.findIndex((s) => f >= s.from && f < s.from + s.dur));
