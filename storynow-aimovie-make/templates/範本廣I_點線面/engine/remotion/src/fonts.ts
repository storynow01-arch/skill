/* 廣I 字型：原作的極細幾何黑體 Noto Sans TC（100／300／400）＋英數 Space Grotesk。
   Noto Sans TC 只載入「文本實際用到的字」所在的子集（allText 由 timeline.py 收集，換文本自動跟著換）；
   Space Grotesk 只有英數，用在維度標籤 0D～4D、座標 P (0, 0)、片中片 REC／SCENE、網址，缺字時退回 Noto Sans TC。 */
import {getInfo as nInfo, loadFont as nLoad} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as sLoad} from '@remotion/google-fonts/SpaceGrotesk';
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

const noto = nLoad('normal', {weights: ['100', '300', '400'], subsets: need(nInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const sg = sLoad('normal', {weights: ['300', '400'], subsets: ['latin']} as never);
export const NOTO = `${noto.fontFamily}, sans-serif`;
export const SG = `${sg.fontFamily}, ${noto.fontFamily}, sans-serif`;
