/* 範本J 地圖風圖示：手繪墨線＋水彩上色的地標插畫（先描主筆畫 → 上水彩 → 描細節）。
   兩種尺寸座標：
   ・地標（LM）：原屏榮地圖的地標插畫，已拿掉校名、科名等寫死內容；區域座標地面約 y=100、最高約 y=-260、左右約 ±180
   ・小圖示（SM）：中心 0,0、約 ±100
   <MapIcon icon=…> 找圖順序：①這裡的地圖圖示（名稱或 emoji）②lib/sketches.ts 的線稿（改畫成墨線＋紙色）③圓框＋emoji／文字。
   一律不會出現空白或「?」：沒給 icon 時畫旗子。 */
import React from 'react';
import {sketchFor} from '../sketches';
import {GOLD, INK, PAPER2, RED, SERIF, pr} from './kit';

export type Wash = {d: string; fill: string};
export type MapIconDef = {vb: number[]; base: string[]; detail: string[]; wash: Wash[]; detailWash?: Wash[]};

const LM = [-210, -290, 420, 420];
const SM = [-112, -112, 224, 224];
/** 圓形路徑 */
const C = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
/** 矩形路徑 */
const R = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;
/** 四角星 */
const star4 = (x: number, y: number, s: number) =>
  `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;
/** 五角星 */
const star5 = (cx: number, cy: number, r: number) => Array.from({length: 10}, (_, i) => {
  const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
  return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
}).join('') + 'Z';
/** 波浪線 */
const wave = (x: number, y: number, n: number, w = 40) => {
  let d = `M${x} ${y}`;
  for (let i = 0; i < n; i++) d += `q${w / 4} -12 ${w / 2} 0t${w / 2} 0`;
  return d;
};
const cren = (x: number, top = -110) => `M${x} ${top}v-30h20v20h20v-20h20v20h20v-30`;
const pickets = Array.from({length: 9}, (_, i) => -165 + i * 40).map((x) => `M${x} 100V25L${x + 10} 12L${x + 20} 25V100`).join('');
const flower = (x: number, y: number) => [`M${x} ${y + 40}V${y}`, C(x, y, 14)];
const BROWN = '#8a5a2b', CLAY = '#b5523b', TEAL = '#3f7a8a', SAND = '#e9d3a6', CREAMY = '#f8f1de', YEL = '#f2cf5c', GREEN = '#8aa05a', SKY = '#9fc3c4';

export const MAP_ICONS: Record<string, MapIconDef> = {
  booktower: {
    vb: LM,
    wash: [{d: R(-110, 60, 220, 40), fill: CLAY}, {d: R(-95, 20, 190, 40), fill: '#3f6b8a'}, {d: R(-80, -20, 160, 40), fill: '#c9a04a'},
      {d: 'M-50 -20L-35 -150L35 -150L50 -20Z', fill: '#f6eedb'}, {d: R(-42, -195, 84, 45), fill: YEL}, {d: 'M-55 -195L0 -240L55 -195Z', fill: CLAY}],
    base: [R(-110, 60, 220, 40), R(-95, 20, 190, 40), R(-80, -20, 160, 40), 'M-50 -20L-35 -150L35 -150L50 -20', R(-42, -195, 84, 45), 'M-55 -195L0 -240L55 -195Z'],
    detail: ['M-46 -60L46 -60', 'M-42 -105L42 -105', 'M-42 -185L-165 -232', 'M-42 -160L-165 -128', 'M42 -185L165 -232', 'M42 -160L165 -128',
      'M-95 80h70', 'M40 40h40', 'M-65 0h50', 'M-15 -195v45', 'M15 -195v45'],
    detailWash: [{d: 'M-42 -185L-165 -232L-165 -128L-42 -160Z', fill: '#f7dc7a'}, {d: 'M42 -185L165 -232L165 -128L42 -160Z', fill: '#f7dc7a'}],
  },
  lighthouse: {
    vb: LM,
    wash: [{d: 'M-60 100L-34 -150H34L60 100Z', fill: CREAMY}, {d: 'M-52 40L-46 -10H46L52 40Z', fill: RED}, {d: 'M-42 -60L-38 -100H38L42 -60Z', fill: RED},
      {d: R(-40, -200, 80, 50), fill: YEL}, {d: 'M-52 -200L0 -250L52 -200Z', fill: '#3f6b8a'}, {d: 'M-150 100Q0 60 150 100Z', fill: SAND}],
    base: ['M-60 100L-34 -150H34L60 100', R(-40, -200, 80, 50), 'M-52 -200L0 -250L52 -200Z', 'M-60 -150H60', 'M-170 100H170'],
    detail: ['M-52 40L-46 -10H46L52 40', 'M-42 -60L-38 -100H38L42 -60', 'M-40 -190L-170 -240', 'M-40 -160L-170 -120', 'M40 -190L170 -240', 'M40 -160L170 -120',
      R(-14, 50, 28, 50), wave(-200, 125, 3), wave(80, 125, 3)],
    detailWash: [{d: 'M-40 -190L-170 -240L-170 -120L-40 -160Z', fill: '#f7dc7a'}, {d: 'M40 -190L170 -240L170 -120L40 -160Z', fill: '#f7dc7a'}],
  },
  market: {
    vb: LM,
    wash: [{d: R(-150, -40, 120, 140), fill: '#efe0bd'}, {d: 'M-165 -40L-90 -135L-15 -40Z', fill: '#c4483b'}, {d: R(20, -60, 140, 160), fill: '#efe0bd'},
      {d: 'M5 -60L90 -175L175 -60Z', fill: TEAL}],
    base: [R(-150, -40, 120, 140), 'M-165 -40L-90 -135L-15 -40Z', R(20, -60, 140, 160), 'M5 -60L90 -175L175 -60Z', 'M-150 30h120', 'M20 30h140'],
    detail: ['M-125 -40L-90 -135', 'M-55 -40L-90 -135', 'M50 -60L90 -175', 'M130 -60L90 -175', 'M90 -175V-225L132 -210L90 -195',
      C(90, -10, 22), C(-120, 55, 12), C(-90, 60, 12), C(-60, 55, 12)],
    detailWash: [{d: 'M90 -225L132 -210L90 -195Z', fill: RED}, {d: C(90, -10, 22), fill: GOLD}],
  },
  harbor: {
    vb: LM,
    wash: [{d: 'M-60 60Q90 20 220 70Q90 120 -60 90Z', fill: SKY}, {d: R(-150, -30, 90, 90), fill: SAND}, {d: 'M-162 -30L-105 -85L-48 -30Z', fill: '#8b3d2c'},
      {d: 'M10 30L170 30L140 60L40 60Z', fill: BROWN}, {d: 'M90 -160L90 15L160 15Z', fill: CREAMY}],
    base: [R(-150, -30, 90, 90), 'M-162 -30L-105 -85L-48 -30Z', 'M-160 60h330', 'M-160 78h330', 'M-140 60v45', 'M-60 60v45', 'M20 78v30', 'M100 78v30',
      'M10 30L170 30L140 60L40 60Z', 'M90 30V-175', 'M90 -160L90 15L160 15Z'],
    detail: [R(90, -180, 46, 28), wave(-170, 125, 4), wave(30, 130, 4), R(-125, 0, 26, 26)],
    detailWash: [{d: R(90, -180, 46, 28), fill: RED}],
  },
  cottage: {
    vb: LM,
    wash: [{d: R(-120, -40, 240, 140), fill: '#e9c48f'}, {d: 'M-145 -40L0 -150L145 -40Z', fill: '#9b4a32'}, {d: 'M60 -100V-170H100V-70Z', fill: '#a8623f'},
      {d: R(-25, 20, 50, 80), fill: '#6b4226'}],
    base: [R(-120, -40, 240, 140), 'M-145 -40L0 -150L145 -40Z', 'M60 -100V-170H100V-70', R(-25, 20, 50, 80), R(-95, 0, 50, 40), R(45, 0, 50, 40)],
    detail: ['M80 -185q-28 -22 0 -42q28 -20 0 -42', 'M-95 20h50', 'M45 20h50', 'M-70 0v40', 'M70 0v40'],
    detailWash: [{d: R(-95, 0, 50, 40), fill: YEL}, {d: R(45, 0, 50, 40), fill: YEL}],
  },
  cinema: {
    vb: LM,
    wash: [{d: R(-140, -60, 280, 160), fill: '#7a5a86'}, {d: R(-160, -110, 320, 50), fill: '#d9a93a'}, {d: C(-55, -165, 45), fill: INK},
      {d: C(55, -165, 45), fill: INK}, {d: R(-30, 10, 60, 90), fill: '#3a2414'}],
    base: [R(-140, -60, 280, 160), R(-160, -110, 320, 50), C(-55, -165, 45), C(55, -165, 45), R(-30, 10, 60, 90)],
    detail: [C(-55, -165, 10), C(55, -165, 10), C(-55, -192, 8), C(55, -192, 8), C(-80, -150, 8), C(80, -150, 8), R(-120, -30, 60, 40), R(60, -30, 60, 40),
      ...[-130, -90, -50, 50, 90, 130].map((x) => C(x, -85, 6))],
    detailWash: [{d: R(-120, -30, 60, 40), fill: YEL}, {d: R(60, -30, 60, 40), fill: YEL}],
  },
  garden: {
    vb: LM,
    wash: [{d: R(-120, -40, 110, 100), fill: '#f0d9b5'}, {d: 'M-135 -40L-65 -110L5 -40Z', fill: '#c96b5a'}, {d: C(110, -95, 62), fill: GREEN},
      {d: 'M100 60V-40H120V60Z', fill: '#7a5230'}],
    base: [R(-120, -40, 110, 100), 'M-135 -40L-65 -110L5 -40Z', C(110, -95, 62), 'M100 60V-40H120V60', pickets, 'M-170 50h350'],
    detail: [...flower(-140, -10), ...flower(20, -20), ...flower(60, 0), ...flower(160, -10), R(-85, 0, 40, 60), 'M80 -120q10 10 0 20', 'M140 -80q-10 10 0 20'],
    detailWash: [{d: C(-140, -10, 14), fill: '#e07a8a'}, {d: C(20, -20, 14), fill: GOLD}, {d: C(60, 0, 14), fill: '#e07a8a'}, {d: C(160, -10, 14), fill: GOLD}],
  },
  tower: {
    vb: LM,
    wash: [{d: 'M10 -275L-22 -222L4 -222L-16 -178L32 -236L6 -236Z', fill: YEL}],
    base: ['M-85 100L-22 -200L22 -200L85 100', 'M-115 -130h230', 'M-85 -60h170', 'M-62 20L48 -40', 'M62 20L-48 -40', 'M-44 -60L32 -130', 'M44 -60L-32 -130',
      'M-75 60L70 60', 'M10 -275L-22 -222L4 -222L-16 -178L32 -236L6 -236Z'],
    detail: ['M-115 -130Q-150 -95 -175 -100', 'M115 -130Q150 -95 175 -100', R(95, 10, 70, 70), 'M105 10v-12M120 10v-12M135 10v-12M150 10v-12',
      'M105 80v12M120 80v12M135 80v12M150 80v12'],
    detailWash: [{d: R(95, 10, 70, 70), fill: '#3f6b5a'}],
  },
  chest: {
    vb: LM,
    wash: [{d: 'M-110 0Q0 -75 110 0Z', fill: GOLD}, {d: R(-130, 0, 260, 100), fill: BROWN}, {d: 'M-130 0L-110 -95L110 -95L130 0Z', fill: '#a06a35'},
      {d: R(-16, 20, 32, 36), fill: GOLD}],
    base: [R(-130, 0, 260, 100), 'M-130 0L-110 -95L110 -95L130 0', 'M-60 0v100', 'M60 0v100', R(-16, 20, 32, 36), 'M-110 0Q0 -75 110 0'],
    detail: [star4(-150, -130, 22), star4(140, -150, 26), star4(0, -175, 18), C(-40, -40, 14), C(10, -50, 14), C(50, -36, 14), C(160, 80, 14), C(-165, 85, 14)],
    detailWash: [{d: star4(-150, -130, 22), fill: '#f7dc7a'}, {d: star4(140, -150, 26), fill: '#f7dc7a'}, {d: star4(0, -175, 18), fill: '#f7dc7a'},
      {d: C(160, 80, 14), fill: GOLD}, {d: C(-165, 85, 14), fill: GOLD}],
  },
  gate: {
    vb: LM,
    wash: [{d: 'M-170 100V-110H-90V100Z', fill: '#cdb48a'}, {d: 'M90 100V-110H170V100Z', fill: '#cdb48a'}, {d: 'M-90 100V-60H90V100Z', fill: '#d9c39a'},
      {d: 'M-55 100V0A55 55 0 0 1 55 0V100Z', fill: '#f7e7a8'}],
    base: ['M-170 100V-110H-90V100', 'M90 100V-110H170V100', cren(-170), cren(90), 'M-90 -60H90', 'M-55 100V0A55 55 0 0 1 55 0V100'],
    detail: ['M-130 -140v-70l45 17l-45 17', 'M130 -140v-70l45 17l-45 17', 'M-150 -40h40', 'M110 -40h40', 'M-150 20h40', 'M110 20h40', 'M-55 100L-95 80V-5', 'M55 100L95 80V-5'],
    detailWash: [{d: 'M-130 -210l45 17l-45 17Z', fill: RED}, {d: 'M130 -210l45 17l-45 17Z', fill: RED}],
  },
  camp: {
    vb: LM,
    wash: [{d: 'M-170 100V-40H10V100Z', fill: '#c97b4a'}, {d: 'M-185 -40L-80 -115L25 -40Z', fill: '#7a3b26'},
      {d: 'M25 100V30Q25 20 35 20H160Q170 20 170 30V100Z', fill: '#e2b13c'}, {d: 'M40 -30L105 -135L170 -30Z', fill: '#6f8f4e'}],
    base: ['M-170 100V-40H10V100', 'M-185 -40L-80 -115L25 -40Z', 'M25 100V30Q25 20 35 20H160Q170 20 170 30V100', 'M40 -30L105 -135L170 -30Z', R(-110, 30, 50, 70)],
    detail: [C(-80, -62, 16), 'M-80 -62v-10M-80 -62h8', R(40, 35, 35, 25), R(85, 35, 35, 25), R(130, 35, 30, 25), C(60, 102, 13), C(140, 102, 13), 'M105 -135V-30'],
    detailWash: [{d: C(-80, -62, 16), fill: CREAMY}],
  },
  castle: {
    vb: LM,
    wash: [{d: 'M-90 100V-120H90V100Z', fill: '#e2cfa4'}, {d: 'M-170 100V-60H-90V100Z', fill: '#d4bd8f'}, {d: 'M90 100V-60H170V100Z', fill: '#d4bd8f'},
      {d: 'M-30 100V30A30 30 0 0 1 30 30V100Z', fill: '#6b4226'}, {d: 'M0 -150V-250L80 -225L0 -200Z', fill: RED}],
    base: ['M-90 100V-120H90V100', 'M-170 100V-60H-90', 'M90 -60H170V100', 'M-170 100H170', cren(-90, -120), 'M-30 100V30A30 30 0 0 1 30 30V100',
      'M0 -150V-250L80 -225L0 -200', 'M-90 -150h180'],
    detail: [R(-60, -80, 30, 40), R(30, -80, 30, 40), R(-145, -30, 30, 35), R(115, -30, 30, 35)],
    detailWash: [{d: R(-60, -80, 30, 40), fill: YEL}, {d: R(30, -80, 30, 40), fill: YEL}],
  },
  stele: {
    vb: LM,
    wash: [{d: 'M-90 80V-150Q-90 -230 0 -230Q90 -230 90 -150V80Z', fill: '#cfc3a6'}, {d: R(-130, 80, 260, 30), fill: '#b9ab8c'}],
    base: ['M-90 80V-150Q-90 -230 0 -230Q90 -230 90 -150V80', R(-130, 80, 260, 30)],
    detail: ['M-60 -150H60', 'M-60 -110H60', 'M-60 -70H40', 'M50 20l-15 30l10 15', 'M-150 110q20 -30 40 0', 'M120 110q20 -30 40 0'],
  },
  /* ───── 小圖示（SM） ───── */
  target: {
    vb: SM, wash: [{d: C(0, 0, 80), fill: SAND}, {d: C(0, 0, 54), fill: '#c4483b'}, {d: C(0, 0, 26), fill: CREAMY}],
    base: [C(0, 0, 80), C(0, 0, 54), C(0, 0, 26)], detail: ['M4 -4L78 -78', 'M78 -78l-4 -24M78 -78l24 4', C(0, 0, 6)],
  },
  scroll: {
    vb: SM, wash: [{d: 'M-60 -70H60V70H-60Z', fill: CREAMY}, {d: C(-60, -70, 16), fill: '#c9a04a'}, {d: C(60, 70, 16), fill: '#c9a04a'}],
    base: ['M-60 -70H60V70H-60Z', C(-60, -70, 16), C(60, 70, 16)], detail: ['M-36 -36H38', 'M-36 -8H38', 'M-36 20H24', 'M-36 46H10'],
  },
  quill: {
    vb: SM, wash: [{d: 'M70 -95Q-5 -70 -40 50L-28 54Q25 -40 70 -95Z', fill: CREAMY}, {d: R(-80, 50, 54, 40), fill: '#5a3a22'}],
    base: ['M70 -95Q-5 -70 -40 50L-28 54Q25 -40 70 -95Z', R(-80, 50, 54, 40)], detail: ['M-34 52L58 -82', 'M40 -60l-22 -2', 'M20 -30l-22 -2', 'M-74 62h42'],
  },
  mic: {
    vb: SM, wash: [{d: 'M-28 -50a28 28 0 0 1 56 0v40a28 28 0 0 1 -56 0Z', fill: '#c9a04a'}],
    base: ['M-28 -50a28 28 0 0 1 56 0v40a28 28 0 0 1 -56 0Z', 'M-52 -10q0 55 52 55q52 0 52 -55', 'M0 45V82', 'M-38 85H38'],
    detail: ['M-28 -48H28', 'M-28 -28H28', 'M-28 -8H28'],
  },
  clock: {
    vb: SM, wash: [{d: C(0, 6, 76), fill: CREAMY}, {d: C(-56, -66, 20), fill: GOLD}, {d: C(56, -66, 20), fill: GOLD}],
    base: [C(0, 6, 76), C(-56, -66, 20), C(56, -66, 20)], detail: ['M0 6V-46', 'M0 6L38 28', 'M0 -60v10M0 72v-10M-66 6h10M66 6h-10', 'M-50 80l-14 16M50 80l14 16'],
  },
  hourglass: {
    vb: SM, wash: [{d: 'M-44 -78H44Q44 -20 0 0Q44 20 44 78H-44Q-44 20 0 0Q-44 -20 -44 -78Z', fill: CREAMY}, {d: 'M-24 70H24Q20 40 0 30Q-20 40 -24 70Z', fill: GOLD}],
    base: ['M-44 -78H44Q44 -20 0 0Q44 20 44 78H-44Q-44 20 0 0Q-44 -20 -44 -78Z', 'M-62 -86H62', 'M-62 86H62'], detail: ['M0 0V30', 'M-24 70H24'],
  },
  book: {
    vb: SM, wash: [{d: 'M0 -52Q-46 -72 -92 -52V58Q-46 38 0 58Z', fill: CREAMY}, {d: 'M0 -52Q46 -72 92 -52V58Q46 38 0 58Z', fill: CREAMY}, {d: 'M-96 64Q-48 46 0 66Q48 46 96 64V76Q48 58 0 78Q-48 58 -96 76Z', fill: '#3f6b8a'}],
    base: ['M0 -52Q-46 -72 -92 -52V58Q-46 38 0 58Z', 'M0 -52Q46 -72 92 -52V58Q46 38 0 58', 'M-96 64Q-48 46 0 66Q48 46 96 64V76Q48 58 0 78Q-48 58 -96 76Z'],
    detail: ['M-74 -30Q-46 -40 -18 -30', 'M-74 -6Q-46 -16 -18 -6', 'M-74 18Q-46 8 -18 18', 'M18 -30Q46 -40 74 -30', 'M18 -6Q46 -16 74 -6'],
  },
  bulb: {
    vb: SM, wash: [{d: 'M0 -90a52 52 0 0 1 32 94v22h-64v-22a52 52 0 0 1 32 -94Z', fill: YEL}],
    base: ['M0 -90a52 52 0 0 1 32 94v22h-64v-22a52 52 0 0 1 32 -94Z', 'M-28 40h56', 'M-22 58h44', 'M-12 74h24'],
    detail: ['M-10 22l10 -30l10 30', 'M-86 -40h-18M86 -40h18', 'M-62 -96l-12 -12M62 -96l12 -12'],
  },
  flag: {
    vb: SM, wash: [{d: 'M-50 -88Q0 -108 62 -82Q22 -58 62 -32Q0 -54 -50 -34Z', fill: RED}, {d: 'M-100 92Q-50 56 0 92Z', fill: GREEN}],
    base: ['M-50 92V-96', 'M-50 -88Q0 -108 62 -82Q22 -58 62 -32Q0 -54 -50 -34Z', 'M-100 92Q-50 56 0 92'], detail: [C(-50, -98, 7)],
  },
  mountain: {
    vb: SM, wash: [{d: 'M-100 80L-30 -66L10 -4L42 -46L100 80Z', fill: '#c9b48a'}, {d: 'M-30 -66L-50 -24L-30 -34L-14 -20Z', fill: '#fff'}],
    base: ['M-100 80L-30 -66L10 -4L42 -46L100 80Z'], detail: ['M-30 -66L-50 -24L-30 -34L-14 -20', 'M-30 -30L-20 10L-34 40', 'M42 -46L50 0'],
  },
  magnifier: {
    vb: SM, wash: [{d: C(-18, -18, 54), fill: SKY}], base: [C(-18, -18, 54), 'M22 22L84 84'], detail: ['M-48 -30Q-40 -52 -18 -56', 'M30 30L84 84'],
  },
  people: {
    vb: SM, wash: [{d: 'M-86 70q0 -66 44 -66q44 0 44 66Z', fill: '#3f6b8a'}, {d: 'M0 70q0 -66 44 -66q44 0 44 66Z', fill: CLAY}, {d: C(-42, -40, 24), fill: SAND}, {d: C(44, -40, 24), fill: SAND}],
    base: ['M-86 70q0 -66 44 -66q44 0 44 66Z', 'M0 70q0 -66 44 -66q44 0 44 66Z', C(-42, -40, 24), C(44, -40, 24)], detail: ['M-100 80H100'],
  },
  chat: {
    vb: SM, wash: [{d: 'M-86 -66H86V40H-6L-48 80V40H-86Z', fill: CREAMY}], base: ['M-86 -66H86V40H-6L-48 80V40H-86Z'],
    detail: [C(-40, -12, 9), C(0, -12, 9), C(40, -12, 9)],
  },
  warning: {
    vb: SM, wash: [{d: 'M0 -88L94 78H-94Z', fill: YEL}], base: ['M0 -88L94 78H-94Z'], detail: ['M0 -34V22', C(0, 48, 7)],
  },
  star: {vb: SM, wash: [{d: star5(0, 4, 92), fill: GOLD}], base: [star5(0, 4, 92)], detail: [star4(-80, -76, 14), star4(84, -60, 10)]},
  trophy: {
    vb: SM, wash: [{d: 'M-50 -80H50V-30Q50 22 0 26Q-50 22 -50 -30Z', fill: GOLD}, {d: R(-46, 66, 92, 22), fill: BROWN}],
    base: ['M-50 -80H50V-30Q50 22 0 26Q-50 22 -50 -30Z', 'M-50 -60H-82Q-84 -10 -44 -2', 'M50 -60H82Q84 -10 44 -2', 'M0 26V66', R(-46, 66, 92, 22)],
    detail: [star5(0, -36, 18)],
  },
  compass: {
    vb: SM, wash: [{d: C(0, 0, 84), fill: CREAMY}, {d: 'M0 -66L16 0L0 66L-16 0Z', fill: RED}],
    base: [C(0, 0, 84), 'M0 -66L16 0L0 66L-16 0Z'], detail: [C(0, 0, 70), 'M-16 0H16', 'M0 -84v-14'],
  },
  heart: {
    vb: SM, wash: [{d: 'M0 82C-110 10 -82 -84 0 -42C82 -84 110 10 0 82Z', fill: '#c4483b'}], base: ['M0 82C-110 10 -82 -84 0 -42C82 -84 110 10 0 82Z'],
    detail: ['M-50 -30Q-56 -6 -40 14'],
  },
  chart: {
    vb: SM, wash: [{d: R(-70, 10, 34, 70), fill: TEAL}, {d: R(-18, -30, 34, 110), fill: GOLD}, {d: R(34, -70, 34, 150), fill: CLAY}],
    base: ['M-90 -90V80H92', R(-70, 10, 34, 70), R(-18, -30, 34, 110), R(34, -70, 34, 150)], detail: ['M-70 -20L-10 -60L50 -96'],
  },
  check: {vb: SM, wash: [{d: C(0, 0, 84), fill: CREAMY}], base: [C(0, 0, 84)], detail: ['M-42 0L-10 34L46 -34']},
  calendar: {
    vb: SM, wash: [{d: R(-80, -64, 160, 148), fill: CREAMY}, {d: R(-80, -64, 160, 40), fill: RED}],
    base: [R(-80, -64, 160, 148), 'M-80 -24H80', 'M-44 -84V-48M44 -84V-48'], detail: ['M-50 10h20M-10 10h20M30 10h20M-50 50h20M-10 50h20'],
  },
  house: {
    vb: SM, wash: [{d: R(-64, -10, 128, 92), fill: '#e9c48f'}, {d: 'M-86 -6L0 -84L86 -6Z', fill: '#9b4a32'}, {d: R(-16, 30, 32, 52), fill: '#6b4226'}],
    base: [R(-64, -10, 128, 92), 'M-86 -6L0 -84L86 -6Z', R(-16, 30, 32, 52)], detail: [R(-50, 6, 24, 22), R(26, 6, 24, 22)],
  },
  tree: {
    vb: SM, wash: [{d: C(0, -26, 62), fill: GREEN}, {d: 'M-10 90V20H10V90Z', fill: '#7a5230'}],
    base: [C(0, -26, 62), 'M-10 90V30M10 90V30', 'M-60 90H60'], detail: ['M-20 -40q10 -10 20 0', 'M14 -10q10 -10 20 0'],
  },
  eye: {
    vb: SM, wash: [{d: 'M-92 0Q0 -84 92 0Q0 84 -92 0Z', fill: CREAMY}, {d: C(0, 0, 30), fill: TEAL}],
    base: ['M-92 0Q0 -84 92 0Q0 84 -92 0Z', C(0, 0, 30)], detail: [C(0, 0, 10), 'M-60 -60l-12 -18M0 -72v-20M60 -60l12 -18'],
  },
  map: {
    vb: SM, wash: [{d: 'M-90 -60L-30 -80L30 -60L90 -80V70L30 90L-30 70L-90 90Z', fill: SAND}],
    base: ['M-90 -60L-30 -80L30 -60L90 -80V70L30 90L-30 70L-90 90Z', 'M-30 -80V70', 'M30 -60V90'],
    detail: ['M-70 40Q-40 0 -10 20Q20 40 50 -10', 'M44 -22l12 12M56 -22l-12 12'],
  },
  board: {
    vb: SM, wash: [{d: R(-86, -80, 172, 110), fill: CREAMY}],
    base: [R(-86, -80, 172, 110), 'M-50 30L-70 92', 'M50 30L70 92', 'M0 30V70'], detail: ['M-62 -10L-26 -44L4 -24L54 -60', 'M-60 -60h40'],
  },
  key: {
    vb: SM, wash: [{d: C(-44, 0, 34), fill: GOLD}], base: [C(-44, 0, 34), 'M-10 0H86', 'M58 0V26', 'M80 0V20'], detail: [C(-44, 0, 12)],
  },
  rocket: {
    vb: SM, wash: [{d: 'M0 -92Q40 -50 34 40H-34Q-40 -50 0 -92Z', fill: CREAMY}, {d: C(0, -26, 16), fill: SKY}, {d: 'M-14 40L0 82L14 40Z', fill: '#e2783c'}],
    base: ['M0 -92Q40 -50 34 40H-34Q-40 -50 0 -92Z', 'M-34 10L-62 50L-34 40', 'M34 10L62 50L34 40', C(0, -26, 16)], detail: ['M-14 40L0 82L14 40'],
  },
  gear: {
    vb: SM,
    wash: [{d: C(0, 0, 58), fill: '#c9b48a'}],
    base: [C(0, 0, 58), C(0, 0, 22), 'M0 -58V-86M0 58V86M-58 0H-86M58 0H86M-41 -41L-61 -61M41 41L61 61M41 -41L61 -61M-41 41L-61 61'],
    detail: [],
  },
  coin: {vb: SM, wash: [{d: C(0, 0, 76), fill: GOLD}], base: [C(0, 0, 76), C(0, 0, 58)], detail: [star5(0, 2, 32)]},
};

export const EMOJI_TO_MAP: Record<string, string> = {
  '📚': 'booktower', '🗼': 'lighthouse', '🏪': 'market', '🛒': 'market', '🏬': 'market', '⛵': 'harbor', '🚢': 'harbor', '⚓': 'harbor', '🛳️': 'harbor',
  '🍳': 'cottage', '☕': 'cottage', '🍰': 'cottage', '🎬': 'cinema', '🎥': 'cinema', '🎞️': 'cinema', '🌱': 'garden', '🌷': 'garden', '🌻': 'garden', '🌸': 'garden',
  '⚡': 'tower', '📡': 'tower', '🔌': 'tower', '💰': 'chest', '🎁': 'chest', '💎': 'chest', '🚪': 'gate', '🏯': 'gate', '⛺': 'camp', '🏕️': 'camp', '🚉': 'camp',
  '🏰': 'castle', '🏫': 'castle', '🎓': 'castle', '🗿': 'stele', '🪨': 'stele',
  '🎯': 'target', '📜': 'scroll', '📄': 'scroll', '📃': 'scroll', '📝': 'quill', '✏️': 'quill', '✏': 'quill', '🖋️': 'quill', '✍️': 'quill',
  '🎤': 'mic', '🎙️': 'mic', '⏰': 'clock', '🕒': 'clock', '⏱️': 'clock', '⌛': 'hourglass', '⏳': 'hourglass', '📖': 'book', '📘': 'book', '📕': 'book',
  '💡': 'bulb', '🚩': 'flag', '🏁': 'flag', '⛳': 'flag', '⛰️': 'mountain', '🏔️': 'mountain', '🗻': 'mountain', '🔍': 'magnifier', '🔎': 'magnifier',
  '👥': 'people', '👫': 'people', '🧑‍🤝‍🧑': 'people', '💬': 'chat', '🗨️': 'chat', '🗣️': 'chat', '⚠️': 'warning', '⚠': 'warning', '❗': 'warning',
  '⭐': 'star', '🌟': 'star', '✨': 'star', '🏆': 'trophy', '🥇': 'trophy', '🏅': 'trophy', '🧭': 'compass', '❤️': 'heart', '❤': 'heart', '💖': 'heart',
  '📊': 'chart', '📈': 'chart', '✅': 'check', '☑️': 'check', '✔️': 'check', '📅': 'calendar', '🗓️': 'calendar', '📆': 'calendar', '🏠': 'house', '🏡': 'house',
  '🌳': 'tree', '🌲': 'tree', '👀': 'eye', '👁️': 'eye', '🗺️': 'map', '🖥️': 'board', '📽️': 'board', '📋': 'board', '🔑': 'key', '🗝️': 'key', '🚀': 'rocket',
  '⚙️': 'gear', '⚙': 'gear', '🪙': 'coin', '💲': 'coin',
};

/** 這個 icon 字串用哪一種畫法 */
export const iconKind = (icon?: string): 'map' | 'sketch' | 'emoji' | 'none' => {
  if (!icon) return 'none';
  if (MAP_ICONS[icon] || MAP_ICONS[EMOJI_TO_MAP[icon] ?? '']) return 'map';
  if (sketchFor(icon)) return 'sketch';
  return 'emoji';
};
export const mapIconDef = (icon?: string): MapIconDef | null => (icon ? MAP_ICONS[icon] ?? MAP_ICONS[EMOJI_TO_MAP[icon] ?? ''] ?? null : null);

/** 一個圖示（SVG <g>，座標＝圖示自己的 viewBox）：主筆畫 draw、水彩 wash、細節 detail 三段進度；px＝畫面上的邊長（決定線寬） */
export const IconArt: React.FC<{icon?: string; draw: number; wash: number; detail: number; px: number}> = ({icon, draw, wash, detail, px}) => {
  const kind = iconKind(icon);
  if (kind === 'map' || kind === 'none') {
    const ic = kind === 'none' ? MAP_ICONS.flag : mapIconDef(icon)!;
    const u = ic.vb[2] / px;   // 1 畫面 px＝幾個圖示單位
    return (
      <g>
        <g opacity={wash * 0.9}>{ic.wash.map((w, i) => <path key={i} d={w.d} fill={w.fill} />)}</g>
        <g opacity={detail * 0.9}>{(ic.detailWash ?? []).map((w, i) => <path key={i} d={w.d} fill={w.fill} />)}</g>
        {ic.base.map((d, i) => draw > 0.002 && <path key={i} d={d} pathLength={1} strokeDasharray={`${draw} 2`} fill="none" stroke={INK} strokeWidth={5.5 * u} strokeLinecap="round" strokeLinejoin="round" />)}
        {ic.detail.map((d, i) => detail > 0.002 && <path key={`d${i}`} d={d} pathLength={1} strokeDasharray={`${detail} 2`} fill="none" stroke={INK} strokeWidth={4 * u} strokeLinecap="round" strokeLinejoin="round" />)}
      </g>
    );
  }
  if (kind === 'sketch') {
    const sk = sketchFor(icon)!;
    const u = 200 / px;
    return (
      <g>
        {sk.paths.map((d, i) => i === 0 && /Z\s*$/.test(d) ? <path key={`w${i}`} d={d} fill={sk.fill ?? PAPER2} opacity={wash * 0.95} /> : null)}
        {sk.paths.map((d, i) => draw > 0.002 && <path key={i} d={d} pathLength={1} strokeDasharray={`${draw} 2`} fill="none" stroke={INK} strokeWidth={5.5 * u} strokeLinecap="round" strokeLinejoin="round" />)}
        {(sk.dots ?? []).map(([cx, cy], i) => <circle key={`d${i}`} cx={cx} cy={cy} r={8} fill={RED} opacity={detail} />)}
      </g>
    );
  }
  const t = Array.from(icon!);
  const isEmoji = /\p{Extended_Pictographic}/u.test(icon!);
  const u = 224 / px;
  return (
    <g>
      <circle r={88} fill={PAPER2} opacity={wash} />
      {draw > 0.002 && <circle r={88} pathLength={1} strokeDasharray={`${draw} 2`} fill="none" stroke={INK} strokeWidth={5.5 * u} />}
      {draw > 0.002 && <circle r={76} pathLength={1} strokeDasharray={`${draw} 2`} fill="none" stroke={INK} strokeWidth={2.5 * u} />}
      <text y={isEmoji ? 30 : 26} textAnchor="middle" fontSize={isEmoji ? 92 : t.length > 2 ? 52 : 72} opacity={wash}
        fontFamily={isEmoji ? undefined : SERIF} fontWeight={900} fill={INK}>{icon}</text>
    </g>
  );
};

const vbOf = (icon?: string) => {
  const k = iconKind(icon);
  if (k === 'map' || k === 'none') return (k === 'none' ? MAP_ICONS.flag : mapIconDef(icon)!).vb;
  if (k === 'sketch') return [0, 0, 200, 200];
  return SM;
};

/** 在 at 格「描出來」的圖示（x,y＝左上，size＝邊長；data-qa="ignore"：圖示內的 emoji 不算畫面文字） */
export const MapIcon: React.FC<{icon?: string; f: number; at: number; x: number; y: number; size: number; dim?: number}> = (
  {icon, f, at, x, y, size, dim = 1}) => {
  if (f < at) return null;
  const draw = pr(f, at, 18), wash = pr(f, at + 10, 16), detail = pr(f, at + 16, 18);
  const vb = vbOf(icon);
  return (
    <div data-qa="ignore" style={{position: 'absolute', left: x, top: y, width: size, height: size, opacity: dim,
      transform: `scale(${0.86 + 0.14 * draw})`}}>
      <svg width={size} height={size} viewBox={vb.join(' ')} style={{overflow: 'visible'}}>
        <IconArt icon={icon} draw={draw} wash={wash} detail={detail} px={size} />
      </svg>
    </div>
  );
};
