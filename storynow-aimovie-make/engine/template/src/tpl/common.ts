/* 範本風格共用：場景語彙、cue、文字換行與自動字級。
   三個範本（A 闖關遊戲／B 創客手稿／C 動態字體快剪）都吃同一份 spec，場景型別一律是：
   title, scenario, definition, cards, vs, quiz, stat, recap, qaEnd
   （欄位定義見 templates/範本風格_場景語彙.md） */
import type {Spec} from '../Video';

export type TplSpec = Spec & {qa?: boolean; tplName?: string; brand?: {logo?: string; cover?: string; intro?: string} | null};
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

/** 依每行最多 n 個全形字寬換行（優先在標點後斷） */
export const wrap = (s: string, n: number): string[] => {
  const out: string[] = [];
  let cur = '';
  for (const ch of Array.from(s)) {
    if (textW(cur + ch) > n) { out.push(cur); cur = ''; }
    cur += ch;
    if (/[，。、：；！？]/.test(ch) && textW(cur) > n * 0.6) { out.push(cur); cur = ''; }
  }
  if (cur) out.push(cur);
  return out;
};

/** 目前這一格要顯示的字幕 */
export const captionAt = (spec: Spec, f: number, tail = 6) => spec.captions.find((c) => f >= c.from && f < c.to + tail);

/** 目前的場景索引 */
export const sceneIndex = (spec: Spec, f: number) => Math.max(0, spec.scenes.findIndex((s) => f >= s.from && f < s.from + s.dur));
