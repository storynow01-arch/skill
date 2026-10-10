/* 廣J 字型：原作的圓體 Zen Maru Gothic（日文字型，700／900）＋英數 Fredoka（LIVE、觀看人數、網址、Ft.）。
   Zen Maru Gothic 只有日本漢字，換文本常缺繁體字：字型串接 Zen Maru Gothic → Noto Sans TC，缺的字自動退回下一套。
   兩套中文字型都只載入「文本實際用到的字」所在的子集（allText 由 timeline.py 收集，換文本自動跟著換）。 */
import {getInfo as zInfo, loadFont as zLoad} from '@remotion/google-fonts/ZenMaruGothic';
import {getInfo as nInfo, loadFont as nLoad} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as fLoad} from '@remotion/google-fonts/Fredoka';
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

const zm = zLoad('normal', {weights: ['700', '900'], subsets: need(zInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const noto = nLoad('normal', {weights: ['700', '900'], subsets: need(nInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const fr = fLoad('normal', {weights: ['600', '700'], subsets: ['latin']} as never);
export const ZM = `${zm.fontFamily}, ${noto.fontFamily}, sans-serif`;
export const FR = `${fr.fontFamily}, ${zm.fontFamily}, ${noto.fontFamily}, sans-serif`;
