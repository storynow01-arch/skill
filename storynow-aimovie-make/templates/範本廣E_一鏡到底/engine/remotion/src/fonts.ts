/* 廣E 字型：霞鶩文楷 TC（手寫楷體，繁體字齊全）。只載入「文本實際用到的字」所在的子集（換文本自動跟著換）；
   萬一有字不在字型裡，退回 Noto Sans TC／系統黑體。原作用同一套字型，但字表是手寫在程式裡的。 */
import {getInfo, loadFont} from '@remotion/google-fonts/LXGWWenKaiTC';
import T from './timeline.json';

const parseRanges = (s: string): [number, number][] =>
  s.split(',').map((p) => {
    const [a, b] = p.trim().replace(/^U\+/i, '').split('-');
    const lo = parseInt(a, 16);
    return [lo, b ? parseInt(b, 16) : lo];
  });
const codes = Array.from(new Set(Array.from(T.allText as string))).map((c) => c.codePointAt(0) as number);
const need = (ranges: Record<string, string>) =>
  Object.keys(ranges).filter((key) => {
    const rs = parseRanges(ranges[key]);
    return codes.some((c) => rs.some(([lo, hi]) => c >= lo && c <= hi));
  });

const wk = loadFont('normal', {weights: ['400', '700'], subsets: need(getInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
export const WENKAI = `${wk.fontFamily}, "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
