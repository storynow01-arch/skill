/* 白板手繪（範本D）：物件先描黑框、再上色並輕彈一下；一支馬克筆的筆尖永遠貼著正在畫的那一筆。
   物件＝資料（DrawItem／TextItem，含開始格、長度、位置），由 TemplateD 依場景排好時間，再交給這裡畫。
   圖示庫 WB_ICONS（扁平上色、黑色描邊，約 -100..100 座標）；沒有對應時退回 lib/sketches 的線稿＋淡色圓底，再沒有就畫圓框＋emoji。 */
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {getLength, getPointAtLength} from '@remotion/paths';
import {EMOJI_TO_SKETCH, sketchFor} from './sketches';

export const WB = {
  ink: '#26313d', blue: '#2b86bf', sky: '#9fd6ee', orange: '#f39a33', yellow: '#f7c94a', red: '#e5543f', green: '#3daa6a',
  white: '#ffffff', gray: '#c9ced4', skin: '#f3c9a6', brown: '#c98f55', kraft: '#d9a868', paper: '#efeff0',
};
/** 寫字用色（2026-10-08，WCAG 2.x AA）：橘、綠、紅、藍原色在淺灰紙面（#efeff0）上對比不足（橘 1.93:1、綠 2.55:1），
 *  寫字時自動換成同色相、調深到剛好合格的版本；圖示填色維持原色。白板字一律 700 以上粗體 → ≥24px 算大字（≥3:1），小字 ≥4.5:1 */
const TEXT_DARK: Record<string, [string, string]> = {
  [WB.orange]: ['#cb720c', '#a25b0a'], [WB.green]: ['#389b61', '#2c7b4d'],
  [WB.red]: ['#e5543f', '#cb321c'], [WB.blue]: ['#2b86bf', '#2472a2'],
};
export const textInk = (c: string, size: number) => {
  const v = TEXT_DARK[c];
  return v ? (size >= 24 ? v[0] : v[1]) : c;
};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.inOut(Easing.cubic);
export const lerp = (f: number, a: number, b: number, from = 0, to = 1, e = ease) =>
  b <= a ? (f >= b ? to : from) : interpolate(f, [a, b], [from, to], {...clamp, easing: e});

/* ---------- 物件 ---------- */
export type Fill = {d: string; c: string; o?: number};
export type Shape = {strokes: string[]; fills?: Fill[]; w?: number; ink?: string; extra?: React.ReactNode; o?: [number, number]};
export type Sfx = 'pop' | 'ding' | 'buzz' | 'none';
export type DrawItem = {kind: 'shape'; at: number; dur: number; x: number; y: number; s?: number; rot?: number; shape: Shape; sfx?: Sfx; boxId?: string; inBox?: string};   // inBox＝放在哪個容器裡（品檢：圖示不可超出、不可被框線穿過，2026-10-09）
export type TextItem = {kind: 'text'; at: number; dur: number; x: number; y: number; text: string; size: number; color?: string;
  bold?: boolean; anchor?: 'start' | 'middle'; sfx?: Sfx; box?: string};   // box＝所屬容器（品檢：字不可超出）
export type Item = DrawItem | TextItem;

const lenCache = new Map<string, number>();
export const plen = (d: string) => {
  let v = lenCache.get(d);
  if (v === undefined) { v = Math.max(1, getLength(d)); lenCache.set(d, v); }
  return v;
};
/** 字寬估計（全形 1、半形 0.56） */
export const wbTextW = (t: string, size: number) =>
  [...t].reduce((w, ch) => w + (/[\x20-\x7e]/.test(ch) ? (ch === ' ' ? 0.3 : 0.56) : 1.0) * size, 0);

/** 某物件在 f 時的筆尖（世界座標）；沒在畫回傳 null */
export const tipOf = (it: Item, f: number): {x: number; y: number} | null => {
  const t = f - it.at;
  if (t < 0 || t > it.dur) return null;
  const p = it.dur ? t / it.dur : 1;
  if (it.kind === 'text') {
    const w = wbTextW(it.text, it.size);
    const x0 = it.anchor === 'middle' ? it.x - w / 2 : it.x;
    return {x: x0 + w * p, y: it.y - it.size * 0.35 + Math.sin(f * 1.7) * it.size * 0.22};
  }
  const {strokes, o = [0, 0]} = it.shape;
  const lens = strokes.map(plen);
  let L = lens.reduce((a, b) => a + b, 0) * p;
  for (let i = 0; i < lens.length; i++) {
    if (L <= lens[i] || i === lens.length - 1) {
      const pt = getPointAtLength(strokes[i], Math.min(L, lens[i]));
      const s = it.s ?? 1, r = ((it.rot ?? 0) * Math.PI) / 180;
      const px = (pt.x + o[0]) * s, py = (pt.y + o[1]) * s;
      return {x: it.x + px * Math.cos(r) - py * Math.sin(r), y: it.y + px * Math.sin(r) + py * Math.cos(r)};
    }
    L -= lens[i];
  }
  return null;
};

export const FILL_DUR = 9;
export const DrawShape: React.FC<{it: DrawItem; f: number}> = ({it, f}) => {
  const t = f - it.at;
  if (t < 0) return null;
  const {shape} = it;
  const lens = shape.strokes.map(plen);
  let L = lens.reduce((a, b) => a + b, 0) * Math.min(1, it.dur ? t / it.dur : 1);
  const fillP = lerp(t, it.dur, it.dur + FILL_DUR);
  const bump = 1 + 0.05 * Math.sin(Math.PI * lerp(t, it.dur, it.dur + 10, 0, 1, Easing.linear));
  const s = (it.s ?? 1) * bump;
  const [ox, oy] = shape.o ?? [0, 0];
  return (
    <g data-qa-box={it.boxId} data-qa-in={it.inBox} transform={`translate(${it.x} ${it.y}) rotate(${it.rot ?? 0}) scale(${s}) translate(${ox} ${oy})`}>
      <g opacity={fillP}>{shape.fills?.map((fl, i) => <path key={i} d={fl.d} fill={fl.c} opacity={fl.o ?? 1} />)}</g>
      {shape.strokes.map((d, i) => {
        const vis = Math.max(0, Math.min(lens[i], L));
        L -= lens[i];
        if (vis <= 0) return null;
        return <path key={i} d={d} fill="none" stroke={shape.ink ?? WB.ink} strokeWidth={(shape.w ?? 7.5) / (it.s ?? 1)}
          strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${lens[i]} ${lens[i] + 10}`} strokeDashoffset={lens[i] - vis} />;
      })}
      {/* 圖示上的數字／字一律無襯線（沒指定字型會掉回新細明體／Times，2026-10-10） */}
      {shape.extra && <g opacity={fillP} style={{fontFamily: '"Noto Sans TC", "Microsoft JhengHei", Arial, sans-serif'}}>{shape.extra}</g>}
    </g>
  );
};

export const DrawText: React.FC<{it: TextItem; f: number; id: string; hand: string; bold: string}> = ({it, f, id, hand, bold}) => {
  const t = f - it.at;
  if (t < 0) return null;
  const p = Math.min(1, it.dur ? t / it.dur : 1);
  const w = wbTextW(it.text, it.size);
  const x0 = it.anchor === 'middle' ? it.x - w / 2 : it.x;
  return (
    <g>
      <clipPath id={id}><rect x={x0 - 40} y={it.y - it.size * 1.3} width={(w + 90) * p} height={it.size * 1.8} /></clipPath>
      <text data-qa-in={it.box} clipPath={`url(#${id})`} x={it.x} y={it.y} textAnchor={it.anchor ?? 'start'} style={{fontFamily: it.bold ? bold : hand}}
        fontWeight={it.bold ? 900 : 700} fontSize={it.size} fill={textInk(it.color ?? WB.ink, it.size)}>{it.text}</text>
    </g>
  );
};

/** 馬克筆（筆尖在原點，朝右下斜放），附淡陰影 */
/** 筆的種類（2026-10-09，系列教學隨章節升級）：pencil 鉛筆、blue 藍色馬克筆（預設）、red 紅色馬克筆、gold 金色鋼筆。
 *  只換筆本身的外觀，畫出來的線與字顏色不變。storyboard 頂層 "pen" 指定。 */
export type PenKind = 'pencil' | 'blue' | 'red' | 'gold';
export const Marker: React.FC<{x: number; y: number; scale: number; tilt: number; kind?: string | null}> = ({x, y, scale, tilt, kind}) => {
  const k = (kind ?? 'blue') as PenKind;
  const shadow = <rect x={48} y={11} width={330} height={30} rx={12} fill="#000" opacity={0.16} transform="translate(0 14)" />;
  let body: React.ReactNode;
  if (k === 'pencil') {
    body = (<>
      <polygon points="2,0 24,-7 24,7" fill="#3a3f45" />
      <path d="M24 -7 L62 -15 L62 15 L24 7 Z" fill="#f2d3a2" stroke={WB.ink} strokeWidth={4} strokeLinejoin="round" />
      <rect x={62} y={-15} width={230} height={30} fill="#f6c23e" stroke={WB.ink} strokeWidth={4} />
      <path d="M62 -5 H292 M62 5 H292" stroke="#d9a422" strokeWidth={3} />
      <rect x={292} y={-16} width={34} height={32} fill="#b9c0c7" stroke={WB.ink} strokeWidth={4} />
      <path d="M302 -16 V16 M314 -16 V16" stroke="#8d959d" strokeWidth={3} />
      <rect x={326} y={-15} width={40} height={30} rx={9} fill="#f29bb0" stroke={WB.ink} strokeWidth={4} />
    </>);
  } else if (k === 'gold') {
    body = (<>
      <path d="M2 0 L34 -10 Q44 0 34 10 Z" fill="#e8b84a" stroke={WB.ink} strokeWidth={4} strokeLinejoin="round" />
      <path d="M10 0 H30" stroke={WB.ink} strokeWidth={3} />
      <path d="M34 -12 L60 -15 L60 15 L34 12 Z" fill="#2b2f3a" stroke={WB.ink} strokeWidth={4} strokeLinejoin="round" />
      <rect x={60} y={-16} width={240} height={32} rx={14} fill="#1f2a44" stroke={WB.ink} strokeWidth={4} />
      <rect x={140} y={-16} width={14} height={32} fill="#e8b84a" stroke={WB.ink} strokeWidth={3} />
      <rect x={288} y={-17} width={78} height={34} rx={14} fill="#1f2a44" stroke={WB.ink} strokeWidth={4} />
      <rect x={288} y={-17} width={12} height={34} fill="#e8b84a" stroke={WB.ink} strokeWidth={3} />
      <path d="M300 -21 H352 Q360 -21 360 -13" fill="none" stroke="#e8b84a" strokeWidth={7} strokeLinecap="round" />
      <path d="M72 -8 H130" stroke="#46557a" strokeWidth={5} strokeLinecap="round" />
    </>);
  } else {
    const c = k === 'red' ? WB.red : WB.blue;
    body = (<>
      <polygon points="2,0 30,-9 30,9" fill={WB.ink} />
      <path d="M30 -11 L52 -14 L52 14 L30 11 Z" fill="#9aa3ab" stroke={WB.ink} strokeWidth={4} strokeLinejoin="round" />
      <rect x={52} y={-15} width={250} height={30} rx={8} fill="#fff" stroke={WB.ink} strokeWidth={4} />
      <rect x={150} y={-15} width={40} height={30} fill={c} stroke={WB.ink} strokeWidth={4} />
      <rect x={290} y={-17} width={70} height={34} rx={10} fill={c} stroke={WB.ink} strokeWidth={4} />
      <path d="M62 -7 H140" stroke="#dfe5ea" strokeWidth={5} strokeLinecap="round" />
    </>);
  }
  return <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${48 + tilt})`}>{shadow}{body}</g>;
};

/* ---------- 形狀小工具 ---------- */
export const R = (x: number, y: number, w: number, h: number, r = 0) =>
  r ? `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`
    : `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
export const O = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
const Ln = (...p: number[]) => `M${p[0]} ${p[1]}` + Array.from({length: p.length / 2 - 1}, (_, i) => ` L${p[2 + i * 2]} ${p[3 + i * 2]}`).join('');
const C = WB;
const f1 = (n: number) => +n.toFixed(1);
/** 七段顯示器數字（數位錶、電子儀器用）：每一位畫 7 條段，亮的段實色、暗的段淡淡留底（像真的液晶） */
const SEG7: Record<string, string> = {'0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg'};
export const seg7 = (txt: string, x: number, y: number, w: number, h: number, ink: string = C.ink, gap = w * 0.3) => {
  const t = Math.max(3, w * 0.2), out: React.ReactNode[] = [];
  let cx = x;
  [...txt].forEach((ch, k) => {
    if (ch === ':') {
      out.push(<rect key={`c${k}`} x={cx} y={y + h * 0.25} width={t} height={t} fill={ink} />, <rect key={`d${k}`} x={cx} y={y + h * 0.7} width={t} height={t} fill={ink} />);
      cx += t + gap; return;
    }
    const seg: Record<string, number[]> = {
      a: [cx + t, y, w - 2 * t, t], g: [cx + t, y + h / 2 - t / 2, w - 2 * t, t], d: [cx + t, y + h - t, w - 2 * t, t],
      f: [cx, y + t, t, h / 2 - t * 1.5], b: [cx + w - t, y + t, t, h / 2 - t * 1.5],
      e: [cx, y + h / 2 + t / 2, t, h / 2 - t * 1.5], c: [cx + w - t, y + h / 2 + t / 2, t, h / 2 - t * 1.5],
    };
    const on = SEG7[ch] ?? '';
    Object.entries(seg).forEach(([s, [rx, ry, rw, rh]]) =>
      out.push(<rect key={`${k}${s}`} x={rx} y={ry} width={rw} height={rh} rx={t / 3} fill={ink} opacity={on.includes(s) ? 1 : 0.06} />));
    cx += w + gap;
  });
  return <g>{out}</g>;
};

/* ---------- 標記（打勾、打叉、底線、圈起來、卡片、箭頭） ---------- */
export const check = (): Shape => ({strokes: ['M-40 0 L-10 32 L45 -38'], w: 16, ink: C.green});
export const cross = (): Shape => ({strokes: ['M-38 -38 L38 38', 'M38 -38 L-38 38'], w: 16, ink: C.red});
export const question = (): Shape => ({strokes: ['M-35 -40 C -35 -95, 45 -95, 45 -45 C 45 -10, 5 -5, 5 30', O(5, 70, 7)], w: 16, ink: C.red, fills: [{d: O(5, 70, 7), c: C.red}]});
export const arrow = (len: number, bend = 0): Shape => ({strokes: [`M0 0 Q ${len / 2} ${bend} ${len} 0`, `M${len - 26} -18 L${len} 0 L${len - 26} 18`], w: 7});
export const underline = (w: number, c = C.orange): Shape => ({strokes: [`M0 0 C ${w * 0.3} 10, ${w * 0.7} -8, ${w} 4`], w: 9, ink: c});
export const circleMark = (rx: number, ry: number, c = C.red): Shape => ({
  strokes: [`M${-rx} 0 C ${-rx} ${-ry * 1.3}, ${rx} ${-ry * 1.3}, ${rx} 0 C ${rx} ${ry * 1.3}, ${-rx * 1.1} ${ry * 1.2}, ${-rx * 0.9} ${-ry * 0.2}`], w: 9, ink: c,
});
export const card = (w: number, h: number, c: string): Shape => {
  const d = R(-w / 2, -h / 2, w, h, 22);
  return {strokes: [d], fills: [{d, c, o: 0.9}], w: 6};
};
export const box = (w: number, h: number): Shape => ({strokes: [R(-w / 2, -h / 2, w, h, 14)], w: 6});

/* ---------- 圖示庫 ---------- */
export const WB_ICONS: Record<string, () => Shape> = {
  /* ---------- 數位邏輯專用符號（2026-10-09）：照高職課本的 ANSI／IEEE 標準形狀（特徵形），不可用一般圖示代替 ----------
     及閘＝D 形（平背＋半圓頭）；或閘＝弧背＋尖頭；反閘＝三角形＋小圓圈；反及／反或＝輸出端加小圓圈；
     互斥或＝或閘背後多一條弧線。左邊兩條輸入線、右邊一條輸出線。 */
  gate_and: () => ({
    strokes: ['M-55 -55 H5 A55 55 0 0 1 5 55 H-55 Z', Ln(-100, -28, -55, -28), Ln(-100, 28, -55, 28), Ln(60, 0, 100, 0)],
    fills: [{d: 'M-55 -55 H5 A55 55 0 0 1 5 55 H-55 Z', c: C.sky}],
  }),
  gate_nand: () => ({
    strokes: ['M-55 -55 H5 A55 55 0 0 1 5 55 H-55 Z', O(71, 0, 11), Ln(-100, -28, -55, -28), Ln(-100, 28, -55, 28), Ln(82, 0, 100, 0)],
    fills: [{d: 'M-55 -55 H5 A55 55 0 0 1 5 55 H-55 Z', c: C.sky}, {d: O(71, 0, 11), c: C.white}],
  }),
  gate_or: () => ({
    strokes: ['M-62 -55 Q-30 0 -62 55 Q20 55 62 0 Q20 -55 -62 -55 Z', Ln(-100, -28, -50, -28), Ln(-100, 28, -50, 28), Ln(62, 0, 100, 0)],
    fills: [{d: 'M-62 -55 Q-30 0 -62 55 Q20 55 62 0 Q20 -55 -62 -55 Z', c: C.sky}],
  }),
  gate_nor: () => ({
    strokes: ['M-62 -55 Q-30 0 -62 55 Q20 55 62 0 Q20 -55 -62 -55 Z', O(73, 0, 11), Ln(-100, -28, -50, -28), Ln(-100, 28, -50, 28), Ln(84, 0, 100, 0)],
    fills: [{d: 'M-62 -55 Q-30 0 -62 55 Q20 55 62 0 Q20 -55 -62 -55 Z', c: C.sky}, {d: O(73, 0, 11), c: C.white}],
  }),
  gate_xor: () => ({
    strokes: ['M-52 -55 Q-20 0 -52 55 Q30 55 72 0 Q30 -55 -52 -55 Z', 'M-72 -55 Q-40 0 -72 55', Ln(-100, -28, -62, -28), Ln(-100, 28, -62, 28), Ln(72, 0, 100, 0)],
    fills: [{d: 'M-52 -55 Q-20 0 -52 55 Q30 55 72 0 Q30 -55 -52 -55 Z', c: C.sky}],
  }),
  gate_xnor: () => ({
    strokes: ['M-52 -55 Q-20 0 -52 55 Q30 55 72 0 Q30 -55 -52 -55 Z', 'M-72 -55 Q-40 0 -72 55', O(83, 0, 10), Ln(-100, -28, -62, -28), Ln(-100, 28, -62, 28)],
    fills: [{d: 'M-52 -55 Q-20 0 -52 55 Q30 55 72 0 Q30 -55 -52 -55 Z', c: C.sky}, {d: O(83, 0, 10), c: C.white}],
  }),
  gate_not: () => ({
    strokes: ['M-50 -45 L38 0 L-50 45 Z', O(49, 0, 11), Ln(-100, 0, -50, 0), Ln(60, 0, 100, 0)],
    fills: [{d: 'M-50 -45 L38 0 L-50 45 Z', c: C.sky}, {d: O(49, 0, 11), c: C.white}],
  }),
  /** 反相：字母 A 上面一條橫線（A bar） */
  abar: () => ({
    strokes: ['M-40 60 L0 -38 L40 60', 'M-23 22 H23', 'M-46 -66 H46'], w: 12,
  }),
  /** 真值表：A、B、Y 三欄、四列（AND 的真值表） */
  truthtable: () => ({
    strokes: [R(-84, -84, 168, 168, 8), Ln(-84, -50, 84, -50), Ln(-28, -84, -28, 84), Ln(28, -84, 28, 84)],
    fills: [{d: R(-84, -84, 168, 168, 8), c: C.white}, {d: R(-84, -84, 168, 34, 8), c: C.sky}],
    extra: (
      <g fontSize={24} fontWeight={700} textAnchor="middle" fill={C.ink}>
        {['A', 'B', 'Y'].map((t, i) => <text key={t} x={-56 + i * 56} y={-59}>{t}</text>)}
        {[['0', '0', '0'], ['0', '1', '0'], ['1', '0', '0'], ['1', '1', '1']].map((row, r) =>
          row.map((t, i) => <text key={`${r}${i}`} x={-56 + i * 56} y={-22 + r * 31} fill={i === 2 && t === '1' ? C.red : C.ink}>{t}</text>))}
      </g>),
  }),
  /** 水銀溫度計（類比）：玻璃管＋紅色水銀柱＋刻度 */
  thermometer: () => ({
    strokes: [R(-15, -88, 30, 132, 15), O(0, 62, 27), Ln(15, -60, 30, -60), Ln(15, -35, 30, -35), Ln(15, -10, 30, -10), Ln(15, 15, 30, 15)],
    fills: [{d: R(-15, -88, 30, 132, 15), c: C.white}, {d: R(-7, -30, 14, 80, 4), c: C.red}, {d: O(0, 62, 27), c: C.red}],
  }),
  /** 計算機：螢幕顯示數字＋按鍵 */
  calculator: () => ({
    strokes: [R(-62, -88, 124, 176, 14), R(-46, -72, 92, 40, 4),
      ...[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => R(-46 + c * 33, -18 + r * 33, 26, 26, 5)))],
    fills: [{d: R(-62, -88, 124, 176, 14), c: C.gray}, {d: R(-46, -72, 92, 40, 4), c: '#dff3df'},
      ...[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => ({d: R(-46 + c * 33, -18 + r * 33, 26, 26, 5), c: c === 2 ? C.orange : C.white})))],
    extra: <text x={38} y={-42} textAnchor="end" fontSize={26} fontWeight={700} fill={C.ink}>12</text>,
  }),
  /** 數位錶（2026-10-10 重畫）：上下兩段錶帶只畫到錶殼邊（不穿過錶殼，描邊才不會疊在錶面上）＋側邊按鈕＋七段顯示器數字 */
  dwatch: () => {
    const top = 'M-32 -50 V-84 Q-32 -96 -20 -96 H20 Q32 -96 32 -84 V-50', bot = 'M-32 50 V84 Q-32 96 -20 96 H20 Q32 96 32 84 V50';
    return {
      strokes: [R(-74, -50, 148, 100, 20), top, bot, R(-60, -36, 120, 72, 8), 'M74 -14 H84 V14 H74'],
      fills: [{d: top + ' Z', c: C.blue}, {d: bot + ' Z', c: C.blue}, {d: R(-74, -50, 148, 100, 20), c: C.gray}, {d: R(-60, -36, 120, 72, 8), c: '#dff3df'}],
      extra: seg7('12:05', -47, -20, 18, 40),
    };
  },
  /** 電子溫度計（數位）：液晶顯示數字＋探針 */
  dthermo: () => ({   // 2026-10-10：螢幕加寬、字縮小，「25.4°」不再超出液晶框
    strokes: [R(-58, -88, 116, 120, 16), R(-46, -74, 92, 46, 6), Ln(0, 32, 0, 90), O(-18, 6, 9), O(18, 6, 9)],
    fills: [{d: R(-58, -88, 116, 120, 16), c: C.blue}, {d: R(-46, -74, 92, 46, 6), c: '#dff3df'}],
    extra: <text x={0} y={-42} textAnchor="middle" fontSize={24} fontWeight={700} fill={C.ink}>25.4°C</text>,
  }),
  /** 汽車油表（類比，2026-10-10）：E～F 半圓錶盤、E 端紅區、指針、加油機小圖 —— 不可拿速度表（km/h）代替 */
  fuel: () => {
    const P = (r: number, t: number) => `${f1(r * Math.cos(Math.PI * (1 - t)))} ${f1(30 - r * Math.sin(Math.PI * (1 - t)))}`;
    const dial = 'M-96 30 A96 96 0 0 1 96 30 Z';
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => `M${P(t % 0.5 ? 72 : 64, t)} L${P(86, t)}`).join(' ');
    const pump = R(16, -8, 20, 28, 3);
    return {
      strokes: [dial, ticks, `M0 30 L${P(70, 0.3)}`, O(0, 30, 9), pump, 'M36 -2 H41 V14 Q41 19 45 17 V0 L41 -5'],
      fills: [{d: dial, c: C.white}, {d: `M${P(88, 0)} A88 88 0 0 1 ${P(88, 0.16)} L${P(76, 0.16)} A76 76 0 0 0 ${P(76, 0)} Z`, c: '#f2a093'},
        {d: O(0, 30, 9), c: C.red}, {d: pump, c: C.orange}],
      extra: <g>
        <text x={-56} y={20} textAnchor="middle" fontSize={26} fontWeight={900} fill={C.red}>E</text>
        <text x={62} y={20} textAnchor="middle" fontSize={26} fontWeight={900} fill={C.ink}>F</text>
      </g>,
      o: [0, 20],
    };
  },
  /** 量化（2026-10-10）：淡格線＋平滑曲線（類比）＋貼著格子的階梯（數位）—— 「換成最接近的格子」 */
  quantize: () => {
    const curve = 'M-90 70 C -40 60, -20 -20, 20 -30 S 70 -70, 90 -80';
    const stair = 'M-90 70 H-60 V50 H-30 V10 H0 V-20 H30 V-40 H60 V-60 H90';
    const grid = [-60, -30, 0, 30, 60].map((x) => ({d: R(x - 1, -90, 2, 170), c: '#dfe3e7'}))
      .concat([-50, -30, -10, 10, 30, 50, 70].map((y) => ({d: R(-90, y - 1, 180, 2), c: '#dfe3e7'})));
    return {
      strokes: [R(-100, -100, 200, 190, 10), stair],
      fills: [{d: R(-100, -100, 200, 190, 10), c: C.white}, ...grid],
      extra: <path d={curve} fill="none" stroke={C.blue} strokeWidth={6} strokeLinecap="round" strokeDasharray="2 12" />,
    };
  },
  /** 卡諾圖（2026-10-10）：4×4 格、幾個 1、紅框把相鄰的 1 圈起來（化簡） */
  kmap: () => {
    const cells = [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [1, 0, 0, 1]];
    const grid = [-40, 0, 40].map((v) => `M${v} -80 V80 M-80 ${v} H80`).join(' ');
    return {
      strokes: [R(-80, -80, 160, 160, 6), grid],
      fills: [{d: R(-80, -80, 160, 160, 6), c: C.white}, {d: R(-38, -78, 76, 76, 14), c: '#fde7b0'}],
      w: 5,
      extra: <g>
        {cells.flatMap((row, r) => row.map((v, c) => <text key={`${r}${c}`} x={-60 + c * 40} y={-48 + r * 40} textAnchor="middle" fontSize={26} fontWeight={700} fill={v ? C.ink : '#9aa3ad'}>{v}</text>))}
        <rect x={-36} y={-76} width={72} height={72} rx={14} fill="none" stroke={C.red} strokeWidth={5} />
      </g>,
    };
  },
  /** 編碼（2026-10-10）：一張卡片寫著 0 和 1 */
  binary: () => ({
    strokes: [R(-90, -80, 180, 160, 14)],
    fills: [{d: R(-90, -80, 180, 160, 14), c: C.white}],
    extra: <g fontSize={40} fontWeight={900} textAnchor="middle">
      <text x={0} y={-18} fill={C.ink} letterSpacing={10}>1011</text>
      <text x={0} y={46} fill={C.blue} letterSpacing={10}>0110</text>
    </g>,
  }),
  /** 液晶體重計（數位） */
  dscale: () => ({
    strokes: [R(-88, -40, 176, 110, 22), R(-40, -24, 80, 34, 6), Ln(-60, 70, -60, 84), Ln(60, 70, 60, 84)],
    fills: [{d: R(-88, -40, 176, 110, 22), c: C.white}, {d: R(-40, -24, 80, 34, 6), c: '#dff3df'}],
    extra: <text x={0} y={2} textAnchor="middle" fontSize={24} fontWeight={700} fill={C.ink}>52.4</text>,
  }),
  /** 沙漏（類比：沙連續往下流） */
  hourglass: () => ({
    strokes: [Ln(-55, -88, 55, -88), Ln(-55, 88, 55, 88), 'M-45 -88 Q-45 -20 0 0 Q-45 20 -45 88', 'M45 -88 Q45 -20 0 0 Q45 20 45 88'],
    fills: [{d: 'M-30 -40 Q-20 -12 0 0 Q20 -12 30 -40 Z', c: C.yellow}, {d: 'M-40 88 Q-30 40 0 34 Q30 40 40 88 Z', c: C.yellow}],
  }),
  /** 傳統收音機（類比）：喇叭網＋調頻轉盤＋天線 */
  radio: () => ({
    strokes: [R(-90, -45, 180, 120, 16), O(-38, 15, 32), O(48, 0, 18), Ln(20, 45, 76, 45), Ln(40, -45, 80, -100)],
    fills: [{d: R(-90, -45, 180, 120, 16), c: C.orange}, {d: O(-38, 15, 32), c: C.gray}, {d: O(48, 0, 18), c: C.white}],
  }),
  /** 麥克風 */
  mic: () => ({
    strokes: [R(-28, -88, 56, 104, 28), 'M-46 -10 Q-46 46 0 46 Q46 46 46 -10', Ln(0, 46, 0, 80), Ln(-36, 82, 36, 82), Ln(-14, -60, 14, -60), Ln(-14, -38, 14, -38)],
    fills: [{d: R(-28, -88, 56, 104, 28), c: C.gray}],
  }),
  /** 喇叭 */
  speaker: () => ({
    strokes: ['M-80 -30 H-42 L8 -72 V72 L-42 30 H-80 Z', 'M32 -38 Q58 0 32 38', 'M54 -62 Q92 0 54 62'],
    fills: [{d: 'M-80 -30 H-42 L8 -72 V72 L-42 30 H-80 Z', c: C.orange}],
  }),
  /** ADC：左邊連續波（類比）→ 方塊 → 右邊方波（數位） */
  adc: () => ({
    strokes: [R(-52, -44, 104, 88, 12), 'M-100 0 Q-92 -30 -84 0 Q-76 30 -68 0 L-52 0', 'M52 12 H62 V-12 H74 V12 H86 V-12 H100'],
    fills: [{d: R(-52, -44, 104, 88, 12), c: C.yellow}],
    extra: <text x={0} y={13} textAnchor="middle" fontSize={34} fontWeight={900} fill={C.ink}>ADC</text>,
  }),
  /** DAC：左邊方波（數位）→ 方塊 → 右邊連續波（類比） */
  dac: () => ({
    strokes: [R(-52, -44, 104, 88, 12), 'M-100 12 H-88 V-12 H-76 V12 H-64 V-12 H-52', 'M52 0 Q60 -30 68 0 Q76 30 84 0 Q92 -30 100 0'],
    fills: [{d: R(-52, -44, 104, 88, 12), c: C.yellow}],
    extra: <text x={0} y={13} textAnchor="middle" fontSize={34} fontWeight={900} fill={C.ink}>DAC</text>,
  }),
  computer: () => ({
    strokes: [R(-95, -80, 190, 125, 10), R(-80, -66, 160, 97, 4), Ln(-20, 45, -28, 78), Ln(20, 45, 28, 78), Ln(-60, 80, 60, 80)],
    fills: [{d: R(-95, -80, 190, 125, 10), c: C.blue}, {d: R(-80, -66, 160, 97, 4), c: C.sky}, {d: 'M-20 45 L-28 78 L28 78 L20 45 Z', c: C.gray}],
    extra: <path d="M-60 -50 L-30 -50 M-60 -35 L-10 -35" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.8} />,
  }),
  laptop: () => ({
    strokes: [R(-80, -70, 160, 105, 8), R(-68, -58, 136, 82, 3), 'M-80 35 L-105 62 L105 62 L80 35'],
    fills: [{d: R(-80, -70, 160, 105, 8), c: C.blue}, {d: R(-68, -58, 136, 82, 3), c: C.sky}, {d: 'M-80 35 L-105 62 L105 62 L80 35 Z', c: C.gray}],
  }),
  phone: () => ({
    strokes: [R(-45, -85, 90, 170, 16), R(-35, -66, 70, 120, 3), O(0, 70, 6)],
    fills: [{d: R(-45, -85, 90, 170, 16), c: C.orange}, {d: R(-35, -66, 70, 120, 3), c: C.sky}],
  }),
  bubble: () => {
    const d = 'M-80 -50 Q-80 -70 -60 -70 H60 Q80 -70 80 -50 V10 Q80 30 60 30 H-10 L-40 60 L-30 30 H-60 Q-80 30 -80 10 Z';
    return {strokes: [d], fills: [{d, c: C.white}]};
  },
  question,
  book: () => {
    const cover = 'M-90 -70 Q-45 -90 0 -70 Q45 -90 90 -70 V70 Q45 50 0 70 Q-45 50 -90 70 Z';
    return {strokes: [cover, 'M0 -70 V70', 'M-70 -40 Q-40 -52 -16 -40', 'M-70 -10 Q-40 -22 -16 -10', 'M16 -40 Q40 -52 70 -40', 'M16 -10 Q40 -22 70 -10'], fills: [{d: cover, c: C.yellow}]};
  },
  handshake: () => {
    const a = 'M-110 -10 L-60 -40 L-10 -30 L30 0 L10 25 L-30 0 L-60 30 L-110 30 Z';
    const b = 'M110 -10 L60 -40 L20 -40 L-20 -10 L0 10 L30 -10 L60 30 L110 30 Z';
    return {strokes: [a, b], fills: [{d: a, c: C.orange}, {d: b, c: C.blue}]};
  },
  envelope: () => ({
    strokes: [R(-95, -60, 190, 120, 6), 'M-95 -60 L0 10 L95 -60', 'M-70 25 H-20', 'M-70 42 H0'],
    fills: [{d: R(-95, -60, 190, 120, 6), c: C.white}, {d: 'M-95 -60 L0 10 L95 -60 Z', c: '#e9eef3'}],
  }),
  stamp: () => {
    const edge = R(-55, -70, 110, 140, 4);
    return {strokes: [edge, R(-38, -52, 76, 104, 4), 'M-24 30 L-4 -10 L10 10 L22 -20 L30 30'], fills: [{d: edge, c: C.white}, {d: R(-38, -52, 76, 104, 4), c: C.red}]};
  },
  mailbox: () => {
    const body = 'M-50 -40 Q-50 -95 0 -95 Q50 -95 50 -40 V60 H-50 Z';
    return {strokes: [body, R(-34, -58, 68, 14, 4), 'M-12 60 V100 M12 60 V100', 'M-60 100 H60'], fills: [{d: body, c: C.red}, {d: R(-34, -58, 68, 14, 4), c: C.ink}]};
  },
  house: () => {
    const roof = 'M-100 0 L0 -90 L100 0 Z';
    return {strokes: [roof, 'M-80 -10 V90 H80 V-10', R(-22, 30, 44, 60, 4)],
      fills: [{d: roof, c: C.red}, {d: 'M-80 -10 V90 H80 V-10 L0 -80 Z', c: C.yellow}, {d: R(-22, 30, 44, 60, 4), c: C.blue}]};
  },
  ear: () => {
    const d = 'M-30 60 C -60 40, -70 -20, -40 -60 C -10 -95, 55 -90, 60 -30 C 64 10, 30 20, 20 45 C 12 65, -10 80, -30 60 Z';
    return {strokes: [d, 'M-20 -30 C -5 -55, 30 -50, 30 -20 C 30 0, 5 0, 5 20'], fills: [{d, c: C.skin}]};
  },
  /** 指針式速度表（類比，2026-10-10 重畫）：252° 錶盤、刻度、數字、綠黃紅色帶、指針、km/h —— 一看就是儀表，不會被看成扇形 */
  gauge: () => {
    const ang = (t: number) => Math.PI * (1.2 - 1.4 * t);
    const P = (r: number, t: number) => `${f1(r * Math.cos(ang(t)))} ${f1(-r * Math.sin(ang(t)))}`;
    const band = (t0: number, t1: number) => `M${P(88, t0)} A88 88 0 0 1 ${P(88, t1)} L${P(77, t1)} A77 77 0 0 0 ${P(77, t0)} Z`;
    const major = [0, 0.25, 0.5, 0.75, 1].map((t) => `M${P(68, t)} L${P(88, t)}`).join(' ');
    return {
      strokes: [O(0, 0, 96), major, `M0 0 L${P(72, 0.625)}`, O(0, 0, 9)],
      fills: [{d: O(0, 0, 96), c: C.white}, {d: band(0, 0.62), c: '#bfe5c9'}, {d: band(0.62, 0.82), c: C.yellow}, {d: band(0.82, 1), c: '#f2a093'}, {d: O(0, 0, 9), c: C.red}],
      extra: <g>
        {[0.125, 0.375, 0.625, 0.875].map((t) => <path key={t} d={`M${P(78, t)} L${P(88, t)}`} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />)}
        {['0', '40', '80', '120', '160'].map((s, i) => {
          const [x, y] = P(54, i / 4).split(' ').map(Number);
          return <text key={s} x={x} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>{s}</text>;
        })}
        <text x={0} y={62} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>km/h</text>
      </g>,
    };
  },
  file: () => {
    const d = 'M-70 -95 H35 L70 -60 V95 H-70 Z';
    return {strokes: [d, 'M35 -95 V-60 H70', 'M-45 -40 H40', 'M-45 -10 H40', 'M-45 20 H40', 'M-45 50 H20'], fills: [{d, c: C.white}, {d: 'M35 -95 V-60 H70 Z', c: C.gray}]};
  },
  sofa: () => {
    const back = R(-90, -50, 180, 60, 18), seat = R(-110, 0, 220, 50, 16);
    return {strokes: [back, seat, 'M-90 50 V70 M90 50 V70'], fills: [{d: back, c: C.blue}, {d: seat, c: C.sky}]};
  },
  package: () => {
    const front = 'M-50 -20 L10 -20 L10 50 L-50 50 Z', top = 'M-50 -20 L-25 -45 L35 -45 L10 -20 Z', side = 'M10 -20 L35 -45 L35 25 L10 50 Z';
    return {strokes: [front, top, side, 'M-20 -20 V5'], fills: [{d: front, c: C.kraft}, {d: top, c: '#ecc690'}, {d: side, c: C.brown}]};
  },
  packet: () => ({
    strokes: [R(-95, -60, 190, 120, 6), 'M-95 -60 L0 10 L95 -60', R(-45, 10, 50, 36, 3)],
    fills: [{d: R(-95, -60, 190, 120, 6), c: C.white}, {d: 'M-95 -60 L0 10 L95 -60 Z', c: '#e9eef3'}, {d: R(-45, 10, 50, 36, 3), c: C.yellow}],
  }),
  road: () => ({
    strokes: ['M-130 -30 C -60 -50, 60 -10, 130 -30', 'M-130 30 C -60 10, 60 50, 130 30', 'M-110 0 H-80 M-50 0 H-20 M10 0 H40 M70 0 H100'],
    fills: [{d: 'M-130 -30 C -60 -50, 60 -10, 130 -30 L130 30 C 60 50, -60 10, -130 30 Z', c: C.gray}],
  }),
  routes: () => ({
    strokes: ['M-130 0 C -60 -90, 60 -90, 130 0', 'M-130 0 H130', 'M-130 0 C -60 90, 60 90, 130 0', O(-130, 0, 14), O(130, 0, 14)],
    w: 6, fills: [{d: O(-130, 0, 14), c: C.orange}, {d: O(130, 0, 14), c: C.blue}],
  }),
  retry: () => ({strokes: ['M40 -10 A 42 42 0 1 1 20 -40', 'M8 -55 L22 -38 L2 -26'], w: 9, ink: C.green}),
  tag: () => {
    const d = 'M-60 -30 H40 L65 0 L40 30 H-60 Z';
    return {strokes: [d, O(-40, 0, 7)], fills: [{d, c: C.orange}]};
  },
  bulb: () => {
    const d = 'M0 -80 C 50 -80, 70 -30, 40 10 C 28 26, 26 40, 26 52 H-26 C -26 40, -28 26, -40 10 C -70 -30, -50 -80, 0 -80 Z';
    return {strokes: [d, R(-26, 52, 52, 30, 6), 'M-14 0 L0 -24 L14 0'], fills: [{d, c: C.yellow}, {d: R(-26, 52, 52, 30, 6), c: C.gray}]};
  },
  lock: () => {
    const body = R(-60, -10, 120, 95, 12);
    return {strokes: [body, 'M-38 -10 V-40 A 38 38 0 0 1 38 -40 V-10', 'M0 25 V50'], fills: [{d: body, c: C.yellow}]};
  },
  /** 指針時鐘（2026-10-10 重畫）：12 個刻度、12／3／6／9 數字、時針短粗分針長、紅色秒針、中心軸 —— 只有圓＋兩條線會被看成一般圖示 */
  clock: () => {
    const P = (r: number, a: number) => `${f1(r * Math.sin(a))} ${f1(-r * Math.cos(a))}`;
    const major = [0, 3, 6, 9].map((h) => `M${P(62, (h * Math.PI) / 6)} L${P(76, (h * Math.PI) / 6)}`).join(' ');
    return {
      strokes: [O(0, 0, 88), major, `M0 0 L${P(34, (10 + 10 / 60) * Math.PI / 6)}`, `M0 0 L${P(58, (2 * Math.PI) / 6)}`],
      fills: [{d: O(0, 0, 88), c: C.white}],
      extra: <g>
        {[1, 2, 4, 5, 7, 8, 10, 11].map((h) => <path key={h} d={`M${P(68, (h * Math.PI) / 6)} L${P(76, (h * Math.PI) / 6)}`} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />)}
        {[[12, 0], [3, 3], [6, 6], [9, 9]].map(([n, h]) => {
          const [x, y] = P(46, (h * Math.PI) / 6).split(' ').map(Number);
          return <text key={n} x={x} y={y + 7} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink}>{n}</text>;
        })}
        <path d={`M${P(-14, (7 * Math.PI) / 6)} L${P(66, (7 * Math.PI) / 6)}`} stroke={C.red} strokeWidth={3} strokeLinecap="round" />
        <circle r={7} fill={C.ink} /><circle r={3} fill={C.red} />
      </g>,
    };
  },
  trophy: () => {
    const cup = 'M-55 -80 H55 V-30 A55 55 0 0 1 -55 -30 Z';
    return {strokes: [cup, 'M-55 -60 H-80 Q-80 -10 -40 -10 M55 -60 H80 Q80 -10 40 -10', 'M0 25 V55', R(-45, 55, 90, 30, 6)],
      fills: [{d: cup, c: C.yellow}, {d: R(-45, 55, 90, 30, 6), c: C.orange}]};
  },
  person: () => {
    const head = O(0, -50, 34), body = 'M-70 90 Q-70 0 0 0 Q70 0 70 90 Z';
    return {strokes: [head, body], fills: [{d: head, c: C.skin}, {d: body, c: C.blue}]};
  },
  globe: () => ({strokes: [O(0, 0, 80), 'M-80 0 H80', 'M0 -80 Q-50 0 0 80 M0 -80 Q50 0 0 80'], fills: [{d: O(0, 0, 80), c: C.sky}]}),
  cloud: () => {
    const d = 'M-60 50 Q-100 50 -95 15 Q-90 -15 -55 -12 Q-45 -60 0 -55 Q40 -52 50 -15 Q95 -15 95 18 Q95 50 60 50 Z';
    return {strokes: [d], fills: [{d, c: C.white}]};
  },
  wifi: () => ({strokes: [O(0, 55, 9), 'M-32 28 Q0 0 32 28', 'M-60 2 Q0 -48 60 2', 'M-88 -24 Q0 -96 88 -24'], w: 10, ink: C.blue, fills: [{d: O(0, 55, 9), c: C.blue}]}),
  rocket: () => {
    const body = 'M0 -95 Q45 -50 35 40 H-35 Q-45 -50 0 -95 Z';
    return {strokes: [body, 'M-35 20 L-65 60 L-30 50 M35 20 L65 60 L30 50', O(0, -30, 15), 'M-15 45 L0 85 L15 45'],
      fills: [{d: body, c: C.white}, {d: O(0, -30, 15), c: C.sky}, {d: 'M-15 45 L0 85 L15 45 Z', c: C.orange}]};
  },
  warning: () => {
    const d = 'M0 -85 L90 75 H-90 Z';
    return {strokes: [d, 'M0 -30 V20', 'M0 45 V48'], fills: [{d, c: C.yellow}]};
  },
  gear: () => {
    const teeth = Array.from({length: 8}, (_, i) => { const a = (i / 8) * Math.PI * 2; return `M${Math.cos(a) * 60} ${Math.sin(a) * 60} L${Math.cos(a) * 85} ${Math.sin(a) * 85}`; }).join(' ');
    return {strokes: [O(0, 0, 60), teeth, O(0, 0, 22)], w: 9, fills: [{d: O(0, 0, 60), c: C.gray}, {d: O(0, 0, 22), c: C.white}]};
  },
  magnifier: () => ({strokes: [O(-15, -15, 55), 'M25 25 L80 80'], w: 10, fills: [{d: O(-15, -15, 55), c: C.sky}]}),
  checklist: () => {
    const d = R(-65, -90, 130, 180, 10);
    return {strokes: [d, 'M-45 -45 L-35 -35 L-15 -55 M5 -45 H45', 'M-45 5 L-35 15 L-15 -5 M5 5 H45', 'M-45 55 L-35 65 L-15 45 M5 55 H45'], fills: [{d, c: C.white}]};
  },
  network: () => ({strokes: [O(0, -60, 22), O(-70, 55, 22), O(70, 55, 22), 'M-10 -40 L-58 35 M10 -40 L58 35 M-48 55 H48'],
    fills: [{d: O(0, -60, 22), c: C.orange}, {d: O(-70, 55, 22), c: C.blue}, {d: O(70, 55, 22), c: C.blue}]}),
  server: () => ({strokes: [R(-60, -85, 120, 50, 6), R(-60, -25, 120, 50, 6), R(-60, 35, 120, 50, 6)],
    fills: [{d: R(-60, -85, 120, 50, 6), c: C.blue}, {d: R(-60, -25, 120, 50, 6), c: C.blue}, {d: R(-60, 35, 120, 50, 6), c: C.blue}],
    extra: <g fill={C.green}><circle cx={-38} cy={-60} r={7} /><circle cx={-38} cy={0} r={7} /><circle cx={-38} cy={60} r={7} /></g>}),
};

const EXTRA_EMOJI: Record<string, string> = {
  '🤝': 'handshake', '👂': 'ear', '📄': 'file', '📃': 'file', '🗂️': 'file', '🛋️': 'sofa', '🛋': 'sofa', '🛣️': 'road', '❓': 'question', '❔': 'question',
  '✅': 'check', '✔️': 'check', '❌': 'cross', '✖️': 'cross', '🏷️': 'tag', '🎫': 'stamp', '📯': 'stamp', '⏲️': 'gauge', '🏎️': 'gauge', '💬': 'bubble', '🔀': 'routes',
  '🔁': 'retry', '🔄': 'retry', '📨': 'packet', '📩': 'packet', '🖥️': 'computer', '💻': 'laptop', '📦': 'package', '🏠': 'house', '🏫': 'house',
};

/** 名稱或 emoji → 可描線的圖示。依序：白板圖示 → 線稿庫（淡色圓底）→ 圓框＋emoji */
export const iconFor = (key?: string): Shape => {
  if (key) {
    const name = WB_ICONS[key] ? key : EXTRA_EMOJI[key] ?? EMOJI_TO_SKETCH[key];
    if (name === 'check') return check();
    if (name === 'cross') return cross();
    if (name && WB_ICONS[name]) return WB_ICONS[name]();
    const sk = sketchFor(key) ?? sketchFor(name);
    if (sk) return {strokes: sk.paths, o: [-100, -100], w: 7, fills: [{d: O(100, 100, 82), c: sk.fill ?? C.sky, o: 0.75}]};
  }
  return {strokes: [O(0, 0, 80)], fills: [{d: O(0, 0, 80), c: C.sky, o: 0.6}],
    extra: key ? <text x={0} y={30} textAnchor="middle" fontSize={84}>{key}</text> : undefined};
};
