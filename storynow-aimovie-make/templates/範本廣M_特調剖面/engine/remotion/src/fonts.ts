/* 廣M 字型：原作的霞鶩文楷 TC（手寫楷體，中文與標點）＋ Fredoka（圓體，數字、份量、網址）。
   Fredoka 只有拉丁字：用 Fredoka 的地方一律串接 Fredoka → 霞鶩文楷 TC → Noto Sans TC，中文自動退回楷體。
   霞鶩文楷 TC 與 Noto Sans TC 都只載入「文本實際用到的字」所在的子集（allText 由 timeline.py 收集，換文本自動跟著換）；
   Noto Sans TC 只當楷體缺字時的備援。 */
import {getInfo as kInfo, loadFont as kLoad} from '@remotion/google-fonts/LXGWWenKaiTC';
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

const kai = kLoad('normal', {weights: ['400', '700'], subsets: need(kInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const noto = nLoad('normal', {weights: ['500'], subsets: need(nInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const fre = fLoad('normal', {weights: ['500', '600'], subsets: ['latin']} as never);
export const KAI = `${kai.fontFamily}, ${noto.fontFamily}, sans-serif`;
export const FRE = `${fre.fontFamily}, ${kai.fontFamily}, ${noto.fontFamily}, sans-serif`;
