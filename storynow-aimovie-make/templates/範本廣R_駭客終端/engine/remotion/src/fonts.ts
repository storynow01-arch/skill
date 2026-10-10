/* 廣R 字型：原作的 IBM Plex Mono 400／700（英數、指令、介面字）＋霞鶩文楷 Mono TC 400／700（中文，等寬楷體）。
   IBM Plex Mono 只有拉丁字：用它的地方一律串接 → 霞鶩文楷 Mono TC → Noto Sans TC（楷體缺字時的備援）。
   霞鶩文楷 Mono TC 與 Noto Sans TC 都只載入「文本實際用到的字」所在的子集（allText 由 timeline.py 收集，換文本自動跟著換）。
   ASCII 方塊大字與文字進度條是用 div 畫的格子，不靠字型裡的 █ ░。 */
import {loadFont as pLoad} from '@remotion/google-fonts/IBMPlexMono';
import {getInfo as kInfo, loadFont as kLoad} from '@remotion/google-fonts/LXGWWenKaiMonoTC';
import {getInfo as nInfo, loadFont as nLoad} from '@remotion/google-fonts/NotoSansTC';
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

const plex = pLoad('normal', {weights: ['400', '700'], subsets: ['latin', 'latin-ext'], ignoreTooManyRequestsWarning: true} as never);
const kai = kLoad('normal', {weights: ['400', '700'], subsets: need(kInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const noto = nLoad('normal', {weights: ['700'], subsets: need(nInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
/** 英文／數字用 IBM Plex Mono，中文退到霞鶩文楷等寬，再退到黑體 */
export const MONO = `'${plex.fontFamily}', '${kai.fontFamily}', '${noto.fontFamily}', monospace`;
/** 中文為主的大字 */
export const KAI = `'${kai.fontFamily}', '${plex.fontFamily}', '${noto.fontFamily}', monospace`;
/** 全字測試圖用：單獨一種字型（看缺字） */
export const FAM = {plex: plex.fontFamily, kai: kai.fontFamily, noto: noto.fontFamily};
