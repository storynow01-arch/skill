/* 廣C 字型：打字機英文 Special Elite（中文退回 Noto Serif TC）、手寫霞鶩文楷 TC、印章 Noto Serif TC 900。
   中文字型只載入「文本實際用到的字」所在的子集（換文本自動跟著換）。
   原作印章用日文字型 Zen Antique；通用範本改用 Noto Serif TC 900，避免換文本時缺繁體字。 */
import {getInfo as serifInfo, loadFont as loadSerif} from '@remotion/google-fonts/NotoSerifTC';
import {loadFont as loadElite} from '@remotion/google-fonts/SpecialElite';
import {getInfo as kaiInfo, loadFont as loadKai} from '@remotion/google-fonts/LXGWWenKaiTC';
import T from './timeline.json';

const parseRanges = (s: string): [number, number][] =>
  s.split(',').map((p) => {
    const [a, b] = p.trim().replace('U+', '').split('-');
    const lo = parseInt(a, 16);
    return [lo, b ? parseInt(b, 16) : lo];
  });
const codes = Array.from(new Set(Array.from(T.allText))).map((c) => c.codePointAt(0) as number);
const need = (ranges: Record<string, string>) =>
  Object.keys(ranges).filter((key) => {
    const rs = parseRanges(ranges[key]);
    return codes.some((c) => rs.some(([lo, hi]) => c >= lo && c <= hi));
  });

export const SERIF = loadSerif('normal', {weights: ['500', '900'], subsets: need(serifInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never).fontFamily;
export const ELITE = loadElite('normal', {weights: ['400'], subsets: ['latin']}).fontFamily;
export const KAI = loadKai('normal', {weights: ['400', '700'], subsets: need(kaiInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never).fontFamily;
export const STAMP = SERIF;
