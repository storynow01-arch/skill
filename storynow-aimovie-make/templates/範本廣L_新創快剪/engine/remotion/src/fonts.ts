/* 廣L 字型：原作的 Geist（英數、數字、介面小標）＋ Noto Sans TC（思源黑體 300／500，中文）。
   Geist 只有拉丁字：用 Geist 的地方一律串接 Geist → Noto Sans TC，中文與符號自動退回思源黑體。
   Noto Sans TC 只載入「文本實際用到的字」所在的子集（allText 由 timeline.py 收集，換文本自動跟著換）。 */
import {getInfo as nInfo, loadFont as nLoad} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as gLoad} from '@remotion/google-fonts/Geist';
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

const noto = nLoad('normal', {weights: ['300', '500'], subsets: need(nInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const geist = gLoad('normal', {weights: ['300', '400', '500'], subsets: ['latin']} as never);
export const TC = `${noto.fontFamily}, sans-serif`;
export const GE = `${geist.fontFamily}, ${noto.fontFamily}, sans-serif`;
