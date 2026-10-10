/* 廣K 字型：原作的思源宋體 Noto Serif TC 900（高反差宋體，主標與中文）＋ Anton 窄體（縮寫、數字、網址）。
   Anton 只有拉丁字：用 Anton 的地方一律串接 Anton → Noto Serif TC，中文自動退回宋體。
   Noto Serif TC 只載入「文本實際用到的字」所在的子集（allText 由 timeline.py 收集，換文本自動跟著換）。 */
import {getInfo as sInfo, loadFont as sLoad} from '@remotion/google-fonts/NotoSerifTC';
import {loadFont as aLoad} from '@remotion/google-fonts/Anton';
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

const serif = sLoad('normal', {weights: ['900'], subsets: need(sInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const anton = aLoad('normal', {weights: ['400'], subsets: ['latin']} as never);
export const SERIF = `${serif.fontFamily}, serif`;
export const ANTON = `${anton.fontFamily}, ${serif.fontFamily}, sans-serif`;
