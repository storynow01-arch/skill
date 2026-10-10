/* 廣S 字型：原作的 Noto Sans TC 700／900（中文）＋ Archivo Black（數字、英文大字）＋ Space Grotesk 500／700（小標、介面字）。
   Archivo Black、Space Grotesk 只有拉丁字：用它們的地方一律串接 → Noto Sans TC，中文與 ● ・ — 這類符號自動退回黑體。
   Noto Sans TC 只載入「文本實際用到的字」所在的子集（allText 由 timeline.py 收集；換文本自動跟著換）。 */
import {getInfo as tInfo, loadFont as tLoad} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as aLoad} from '@remotion/google-fonts/ArchivoBlack';
import {loadFont as gLoad} from '@remotion/google-fonts/SpaceGrotesk';
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

const tc = tLoad('normal', {weights: ['700', '900'], subsets: need(tInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const ar = aLoad('normal', {weights: ['400'], subsets: ['latin', 'latin-ext'], ignoreTooManyRequestsWarning: true} as never);
const sg = gLoad('normal', {weights: ['500', '700'], subsets: ['latin', 'latin-ext'], ignoreTooManyRequestsWarning: true} as never);
export const TC = `"${tc.fontFamily}", sans-serif`;
export const ARCH = `"${ar.fontFamily}", "${tc.fontFamily}", sans-serif`;
export const SG = `"${sg.fontFamily}", "${tc.fontFamily}", sans-serif`;
/** 全字測試圖用 */
export const FAM = {tc: tc.fontFamily, ar: ar.fontFamily, sg: sg.fontFamily};
