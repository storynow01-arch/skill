/* 廣N 字型：原作的 Noto Sans TC 700／900（中文）＋ Space Mono（等寬介面字、數字）＋ Rubik Glitch（故障縮寫、NO SIGNAL）＋ VT323（頻道 OSD）。
   Space Mono、Rubik Glitch、VT323 只有拉丁字：用它們的地方一律串接 → Noto Sans TC，中文自動退回黑體。
   Noto Sans TC 只載入「文本實際用到的字」所在的子集（allText 由 timeline.py 收集，含亂碼解碼的跳動字池；換文本自動跟著換）。 */
import {getInfo as nInfo, loadFont as nLoad} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as mLoad} from '@remotion/google-fonts/SpaceMono';
import {loadFont as gLoad} from '@remotion/google-fonts/RubikGlitch';
import {loadFont as vLoad} from '@remotion/google-fonts/VT323';
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

const noto = nLoad('normal', {weights: ['700', '900'], subsets: need(nInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const mono = mLoad('normal', {weights: ['400', '700'], subsets: ['latin'], ignoreTooManyRequestsWarning: true} as never);
const gl = gLoad('normal', {weights: ['400'], subsets: ['latin'], ignoreTooManyRequestsWarning: true} as never);
const vt = vLoad('normal', {weights: ['400'], subsets: ['latin'], ignoreTooManyRequestsWarning: true} as never);
export const TC = `${noto.fontFamily}, sans-serif`;
export const MONO = `${mono.fontFamily}, ${noto.fontFamily}, monospace`;
export const GL = `${gl.fontFamily}, ${noto.fontFamily}, sans-serif`;
export const VT = `${vt.fontFamily}, ${noto.fontFamily}, monospace`;
