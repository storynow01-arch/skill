/* 廣H 字型：原作的像素字 DotGothic16（日文點陣字型）＋英文像素字 Silkscreen。
   DotGothic16 只有日本漢字，換文本常缺繁體字：字型串接 DotGothic16 → Noto Sans TC，缺的字自動退回下一套。
   兩套中文字型都只載入「文本實際用到的字」所在的子集（allText 由 timeline.py 收集，換文本自動跟著換）。
   Silkscreen 只有英數：用在網址、封裝蓋右下小字、地標編號；裡面有中文時一樣退回 DotGothic16 → Noto Sans TC。 */
import {getInfo as dInfo, loadFont as dLoad} from '@remotion/google-fonts/DotGothic16';
import {getInfo as nInfo, loadFont as nLoad} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as sLoad} from '@remotion/google-fonts/Silkscreen';
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

const dot = dLoad('normal', {weights: ['400'], subsets: need(dInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const noto = nLoad('normal', {weights: ['500'], subsets: need(nInfo().unicodeRanges as Record<string, string>) as never[], ignoreTooManyRequestsWarning: true} as never);
const silk = sLoad('normal', {weights: ['400'], subsets: ['latin']} as never);
export const PIX = `${dot.fontFamily}, ${noto.fontFamily}, monospace`;
export const SILK = `${silk.fontFamily}, ${dot.fontFamily}, ${noto.fontFamily}, monospace`;
