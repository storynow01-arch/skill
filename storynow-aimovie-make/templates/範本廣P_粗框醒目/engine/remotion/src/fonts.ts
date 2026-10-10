/* 廣P 字型：原作的 Noto Sans TC 700／900（中文粗黑體）＋ Space Grotesk 700（數字、英文大字）＋ IBM Plex Mono 700（等寬介面字）。
   Space Grotesk、IBM Plex Mono 只有拉丁字：用它們的地方一律串接 → Noto Sans TC，中文與 ✓ ★ 這類符號自動退回黑體。
   Noto Sans TC 只載入「文本實際用到的字」所在的子集（allText 由 timeline.py 收集；換文本自動跟著換）。 */
import {getInfo as tInfo, loadFont as tLoad} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as gLoad} from '@remotion/google-fonts/SpaceGrotesk';
import {loadFont as mLoad} from '@remotion/google-fonts/IBMPlexMono';
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
const sg = gLoad('normal', {weights: ['700'], subsets: ['latin', 'latin-ext'], ignoreTooManyRequestsWarning: true} as never);
const mo = mLoad('normal', {weights: ['700'], subsets: ['latin', 'latin-ext'], ignoreTooManyRequestsWarning: true} as never);
export const TC = `"${tc.fontFamily}", sans-serif`;
export const SG = `"${sg.fontFamily}", "${tc.fontFamily}", sans-serif`;
export const MONO = `"${mo.fontFamily}", "${tc.fontFamily}", monospace`;
