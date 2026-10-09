/* 廣B 字型：報紙宋體 Noto Serif TC（400／500／900）＋英文報頭 Playfair Display。
   中文字型只載入「文本實際用到的字」所在的子集（換文本自動跟著換）。 */
import {getInfo as serifInfo, loadFont as loadSerif} from '@remotion/google-fonts/NotoSerifTC';
import {loadFont as loadPlayfair} from '@remotion/google-fonts/PlayfairDisplay';
import T from './timeline.json';

const parseRanges = (s: string): [number, number][] =>
  s.split(',').map((p) => {
    const [a, b] = p.trim().replace('U+', '').split('-');
    const lo = parseInt(a, 16);
    return [lo, b ? parseInt(b, 16) : lo];
  });

const ranges = serifInfo().unicodeRanges as Record<string, string>;
const codes = Array.from(new Set(Array.from(T.allText))).map((c) => c.codePointAt(0) as number);
const need = Object.keys(ranges).filter((key) => {
  const rs = parseRanges(ranges[key]);
  return codes.some((c) => rs.some(([lo, hi]) => c >= lo && c <= hi));
});

loadSerif('normal', {weights: ['400', '500', '900'], subsets: need as never[], ignoreTooManyRequestsWarning: true} as never);
loadPlayfair('normal', {weights: ['400', '700', '900'], subsets: ['latin']});
loadPlayfair('italic', {weights: ['400', '700'], subsets: ['latin']});

export const SERIF = '"Noto Serif TC", serif';
export const PLAY = '"Playfair Display", "Noto Serif TC", serif';
