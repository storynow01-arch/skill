/* 廣G 字型：原作的繪本圓體 HachiMaruPop（日文字型，圓圓的手寫感）＋霞鶩文楷 TC 補字。
   HachiMaruPop 只有日本漢字，換文本時常缺繁體字：字型串接 HachiMaruPop → 霞鶩文楷 TC → Noto Sans TC，缺的字自動退回下一套。
   兩套中文字型都只載入「文本實際用到的字」所在的子集（allText 由 timeline.py 收集，換文本自動跟著換）。 */
import {getInfo as hInfo, loadFont as hLoad} from '@remotion/google-fonts/HachiMaruPop';
import {getInfo as wInfo, loadFont as wLoad} from '@remotion/google-fonts/LXGWWenKaiTC';
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

const hm = hLoad('normal', {weights: ['400'], subsets: need(hInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const wk = wLoad('normal', {weights: ['400'], subsets: need(wInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
export const FONT = `${hm.fontFamily}, ${wk.fontFamily}, "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
