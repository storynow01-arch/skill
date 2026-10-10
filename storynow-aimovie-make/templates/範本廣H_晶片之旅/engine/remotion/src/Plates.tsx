/* 推進的四層平面：電路板 → 晶片封裝蓋 → 金線 → 晶粒（彩虹干涉色）。
   每層座標中心 (0,0)，中央 ±192×±108 留給下一層（下一層從中心長出來）。
   原作 02_試做/廣告30風格 src/ads/ad17/Plates.tsx；電路板絲印、封裝蓋刻字改讀 storyboard（board、chip），其餘照原作。 */
import React from 'react';
import {rnd, rnd01} from './kit';
import {PIX, SILK} from './fonts';
import {ROUTE_BOARD, ROUTE_DIE, ROUTE_WIRE, T, WP} from './core';

export {PIX, SILK};
const BD = T.d.board;
const CHIP = T.d.chip;
/** 字寬估算（與 timeline.py 同規則：中文 1 字寬、英數 0.6、空白 0.3） */
const tw = (s: string, size: number) => {
  let w = 0;
  for (const ch of s) w += size * ((ch.codePointAt(0) as number) >= 0x2e80 ? 1 : ch === ' ' ? 0.3 : 0.6);
  return w;
};
const TOPW = BD.top ? tw(BD.top, BD.topSize) + 56 : 0;
const BOTW = BD.bottom ? tw(BD.bottom, BD.bottomSize) + 56 : 0;
const PRINTW = Math.max(TOPW, BOTW, 200) + 20;
const CW = 192, CH = 108;

const wpPath = (w: WP[]) => 'M' + w.map((p) => `${p[1]},${p[2]}`).join('L');
const COP = '#d9a24a';
const COP2 = '#f3c56b';

/* ───── 第 0 層：電路板（比畫面大，收尾時會整塊往下移） ───── */
const boardStatic = (() => {
  const els: React.ReactNode[] = [];
  let id = 0;
  const key = () => `b${id++}`;
  // 背景匯流排：成組平行走線，避開中央
  for (let g = 0; g < 16; g++) {
    const horiz = g % 2 === 0;
    const n = 4 + Math.floor(rnd01(`bn${g}`) * 4);
    let base = rnd(`bb${g}`) * 1450;
    if (Math.abs(base) < 330) base = Math.sign(base || 1) * (330 + Math.abs(base));
    const jogAt = rnd(`bj${g}`) * 900;
    const jog = (rnd01(`bk${g}`) > 0.5 ? 1 : -1) * (80 + rnd01(`bl${g}`) * 120);
    for (let i = 0; i < n; i++) {
      const o = base + i * 24;
      const a = -2400, b = 2400;
      const d = horiz
        ? `M${a},${o}L${jogAt - 60},${o}L${jogAt - 60 + Math.abs(jog)},${o + jog}L${b},${o + jog}`
        : `M${o},${a}L${o},${jogAt - 60}L${o + jog},${jogAt - 60 + Math.abs(jog)}L${o + jog},${b}`;
      els.push(<path key={key()} d={d} stroke={COP} strokeOpacity={0.55} strokeWidth={7} fill="none" strokeLinejoin="round" />);
    }
  }
  // 晶片接腳＋短走線到導通孔
  const pins: [number, number, number, number][] = [];
  for (let i = 0; i < 12; i++) {
    const x = -176 + i * 32;
    pins.push([x, -CH, 0, -1], [x, CH, 0, 1]);
  }
  for (let i = 0; i < 6; i++) {
    const y = -80 + i * 32;
    pins.push([-CW, y, -1, 0], [CW, y, 1, 0]);
  }
  pins.forEach(([x, y, dx, dy], i) => {
    els.push(<rect key={key()} x={x - (dx ? 11 : 6) + dx * 11} y={y - (dy ? 11 : 6) + dy * 11} width={dx ? 22 : 12} height={dy ? 22 : 12} fill={COP2} />);
    if (dx === -1 && Math.abs(y - 16) < 1) return; // 電子走的那一根另外畫
    const L1 = 40 + rnd01(`pl${i}`) * 60;
    const L2 = 60 + rnd01(`pm${i}`) * 200;
    const side = rnd01(`ps${i}`) > 0.5 ? 1 : -1;
    const x1 = x + dx * L1, y1 = y + dy * L1;
    const x2 = x1 + dx * L2 + (dy ? side * L2 * 0.7 : 0), y2 = y1 + dy * L2 + (dx ? side * L2 * 0.7 : 0);
    els.push(<path key={key()} d={`M${x},${y}L${x1},${y1}L${x2},${y2}`} stroke={COP} strokeWidth={6} fill="none" strokeLinejoin="round" />);
    els.push(<circle key={key()} cx={x2} cy={y2} r={11} fill={COP2} />, <circle key={key()} cx={x2} cy={y2} r={4.5} fill="#123d29" />);
  });
  // 表面黏著元件
  for (let i = 0; i < 70; i++) {
    const x = rnd(`cx${i}`) * 2200, y = rnd(`cy${i}`) * 1450;
    if (Math.abs(x) < 360 && Math.abs(y) < 260) continue;
    const rot = rnd01(`cr${i}`) > 0.5 ? 90 : 0;
    const big = rnd01(`cz${i}`) > 0.85;
    const w = big ? 120 : 46, h = big ? 80 : 22;
    els.push(
      <g key={key()} transform={`translate(${x},${y}) rotate(${rot})`}>
        <rect x={-w / 2 - 8} y={-h / 2 - 6} width={w + 16} height={h + 12} fill="none" stroke="#e9f0e6" strokeOpacity={0.5} strokeWidth={2} />
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={big ? '#20242a' : rnd01(`cc${i}`) > 0.5 ? '#c9b38a' : '#2a2a2a'} rx={3} />
        {!big && <rect x={-w / 2} y={-h / 2} width={10} height={h} fill="#cfd4d8" />}
        {!big && <rect x={w / 2 - 10} y={-h / 2} width={10} height={h} fill="#cfd4d8" />}
      </g>,
    );
  }
  return els;
})();

export const BoardPlate: React.FC<{lit: number; print: number}> = ({lit, print}) => (
  <svg width={4800} height={3200} viewBox="-2400 -1600 4800 3200" style={{position: 'absolute', left: -1440, top: -1060}}>
    <defs>
      <radialGradient id="b17bg" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#2f8a5f" />
        <stop offset="55%" stopColor="#1f6545" />
        <stop offset="100%" stopColor="#174c35" />
      </radialGradient>
      <pattern id="b17dot" width={28} height={28} patternUnits="userSpaceOnUse">
        <circle cx={14} cy={14} r={2} fill="#3c9a6c" opacity={0.5} />
      </pattern>
      <clipPath id="b17print">
        <rect x={-PRINTW / 2} y={-240} width={PRINTW * print} height={480} />
      </clipPath>
    </defs>
    <rect x={-2400} y={-1600} width={4800} height={3200} fill="url(#b17bg)" />
    <rect x={-2400} y={-1600} width={4800} height={3200} fill="url(#b17dot)" />
    {boardStatic}
    {/* 電子要走的那條走線：被點亮 */}
    <path d={wpPath(ROUTE_BOARD)} stroke={COP} strokeWidth={9} fill="none" strokeLinejoin="round" />
    <path d={wpPath(ROUTE_BOARD)} stroke="#9ffcff" strokeWidth={5} fill="none" strokeLinejoin="round" opacity={lit} />
    {/* 晶片陰影與絲印框 */}
    <rect x={-CW - 14} y={-CH - 14} width={CW * 2 + 28} height={CH * 2 + 28} fill="none" stroke="#f1f5ee" strokeWidth={3} strokeDasharray="18 10" opacity={0.8} />
    <rect x={-CW + 10} y={-CH + 14} width={CW * 2} height={CH * 2} fill="#0b1f15" opacity={0.6} />
    <text x={-CW - 10} y={-CH - 30} fill="#f1f5ee" fontFamily={SILK} fontSize={26}>U1</text>
    {/* 絲印（board.top／bottom，印刷頭由左往右掃出） */}
    <g clipPath="url(#b17print)">
      {BD.top && <rect x={-TOPW / 2} y={-222} width={TOPW} height={78} rx={6} fill="#164a33" opacity={0.92} />}
      {BD.top && <text x={0} y={-162} textAnchor="middle" fill="#f4f8f1" fontFamily={PIX} fontSize={BD.topSize}>{BD.top}</text>}
      {BD.bottom && <rect x={-BOTW / 2} y={142} width={BOTW} height={66} rx={6} fill="#164a33" opacity={0.92} />}
      {BD.bottom && <text x={0} y={192} textAnchor="middle" fill="#f4f8f1" fontFamily={PIX} fontSize={BD.bottomSize}>{BD.bottom}</text>}
    </g>
  </svg>
);

/* ───── 第 1 層：晶片封裝蓋（雷射刻字），中央是觀察窗 ───── */
const speck = Array.from({length: 260}, (_, i) => (
  <circle key={i} cx={rnd(`sx${i}`) * 960} cy={rnd(`sy${i}`) * 540} r={1.5 + rnd01(`sr${i}`) * 2.5} fill="#5c636e" opacity={0.5} />
));
export const LidPlate: React.FC<{glow: number}> = ({glow}) => (
  <svg width={1920} height={1080} viewBox="-960 -540 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>
    <defs>
      <radialGradient id="l17bg" cx="40%" cy="35%" r="80%">
        <stop offset="0%" stopColor="#4f5662" />
        <stop offset="100%" stopColor="#2c3038" />
      </radialGradient>
    </defs>
    <rect x={-960} y={-540} width={1920} height={1080} fill="url(#l17bg)" />
    {speck}
    <rect x={-940} y={-520} width={1880} height={1040} fill="none" stroke="#6b7380" strokeWidth={12} rx={30} />
    <circle cx={-800} cy={-390} r={42} fill="#262a31" stroke="#6b7380" strokeWidth={4} />
    {/* 雷射刻字（chip.lines：1 行放上方、2 行上下各一；chip.code 右下小字） */}
    {CHIP.lines[0] && <text x={0} y={-190} textAnchor="middle" fill="#dfe5ee" fontFamily={PIX} fontSize={CHIP.size} style={{letterSpacing: 4}}>{CHIP.lines[0]}</text>}
    {CHIP.lines[1] && <text x={0} y={250} textAnchor="middle" fill="#dfe5ee" fontFamily={PIX} fontSize={CHIP.size} style={{letterSpacing: 4}}>{CHIP.lines[1]}</text>}
    {CHIP.code && <text x={820} y={470} textAnchor="end" fill="#9aa3b0" fontFamily={SILK} fontSize={CHIP.codeSize}>{CHIP.code}</text>}
    {/* 觀察窗 */}
    <rect x={-CW - 18} y={-CH - 18} width={CW * 2 + 36} height={CH * 2 + 36} fill="#15181d" rx={8} />
    <rect x={-CW - 4} y={-CH - 4} width={CW * 2 + 8} height={CH * 2 + 8} fill="none" stroke="#7fe9ff" strokeWidth={6} opacity={0.6 + 0.4 * glow} />
  </svg>
);

/* ───── 第 2 層：導線架＋金線 ───── */
const wiresStatic = (() => {
  const els: React.ReactNode[] = [];
  const fingers: [number, number, number, number][] = []; // 指尖 x,y、方向
  for (let i = 0; i < 14; i++) {
    const x = -520 + i * 80;
    fingers.push([x, -330, 0, -1], [x, 330, 0, 1]);
  }
  for (let i = 0; i < 6; i++) {
    const y = -200 + i * 80;
    fingers.push([-700, y, -1, 0], [700, y, 1, 0]);
  }
  fingers.forEach(([x, y, dx, dy], i) => {
    const L = 700;
    els.push(
      <path key={`f${i}`} d={`M${x - dy * 26 + dx * 0},${y - dx * 26}L${x - dy * 26 + dx * L},${y - dx * 26 + dy * L}L${x + dy * 26 + dx * L},${y + dx * 26 + dy * L}L${x + dy * 26},${y + dx * 26}Z`} fill="#aeb7c2" stroke="#e3e9ef" strokeWidth={3} />,
    );
    // 晶粒上的焊墊
    const px = dx ? Math.sign(dx) * (CW - 16) : Math.max(-CW + 16, Math.min(CW - 16, x * 0.33));
    const py = dy ? Math.sign(dy) * (CH - 14) : Math.max(-CH + 14, Math.min(CH - 14, y * 0.45));
    const mx = (x + px) / 2 + (dy ? 0 : 0), my = (y + py) / 2;
    const lift = 70;
    const d = `M${px},${py}Q${mx - dx * 10 - dy * 0},${my - lift * (dy ? 0.2 : 0) - (dx ? lift * 0.6 : 0) + (dy ? 0 : 0)} ${x},${y}`;
    els.push(<path key={`w${i}`} d={d} stroke="#b07a18" strokeWidth={9} fill="none" />);
    els.push(<path key={`v${i}`} d={d} stroke="#ffd35e" strokeWidth={5} fill="none" />);
    els.push(<path key={`h${i}`} d={d} stroke="#fff4c2" strokeWidth={1.6} fill="none" opacity={0.9} />);
    els.push(<circle key={`b${i}`} cx={x} cy={y} r={9} fill="#ffe08a" />);
    els.push(<rect key={`p${i}`} x={px - 9} y={py - 9} width={18} height={18} fill="#e8edf3" />);
  });
  return els;
})();
export const WirePlate: React.FC<{lit: number}> = ({lit}) => (
  <svg width={1920} height={1080} viewBox="-960 -540 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>
    <defs>
      <radialGradient id="w17bg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#4c5e74" />
        <stop offset="100%" stopColor="#2b3747" />
      </radialGradient>
    </defs>
    <rect x={-960} y={-540} width={1920} height={1080} fill="url(#w17bg)" />
    <rect x={-CW - 40} y={-CH - 40} width={CW * 2 + 80} height={CH * 2 + 80} fill="#6d7a88" rx={10} />
    {wiresStatic}
    <path d={wpPath(ROUTE_WIRE)} stroke="#ffd35e" strokeWidth={10} fill="none" strokeLinejoin="round" />
    <path d={wpPath(ROUTE_WIRE)} stroke="#a8fbff" strokeWidth={5} fill="none" strokeLinejoin="round" opacity={lit} />
  </svg>
);

/* ───── 第 3 層：晶粒表面（彩虹干涉色＋標準元件列＋金屬層） ───── */
const dieStatic = (() => {
  const els: React.ReactNode[] = [];
  for (let r = 0; r < 34; r++) {
    const y = -540 + r * 32;
    els.push(<rect key={`r${r}`} x={-960} y={y} width={1920} height={14} fill="#0d1030" opacity={0.16} />);
  }
  for (let i = 0; i < 90; i++) {
    const x = Math.round((rnd(`mx${i}`) * 960) / 16) * 16;
    els.push(<rect key={`m${i}`} x={x} y={-540} width={4} height={1080} fill="#ffffff" opacity={0.18} />);
  }
  for (let i = 0; i < 12; i++) {
    const x = rnd(`kx${i}`) * 760, y = rnd(`ky${i}`) * 420;
    if (Math.abs(x) < 300 && Math.abs(y) < 200) continue;
    const w = 120 + rnd01(`kw${i}`) * 180, h = 80 + rnd01(`kh${i}`) * 120;
    els.push(<rect key={`k${i}`} x={x - w / 2} y={y - h / 2} width={w} height={h} fill="#ffffff" opacity={0.16} stroke="#ffffff" strokeOpacity={0.6} strokeWidth={3} />);
    for (let j = 1; j < 6; j++) els.push(<line key={`k${i}_${j}`} x1={x - w / 2} x2={x + w / 2} y1={y - h / 2 + (h * j) / 6} y2={y - h / 2 + (h * j) / 6} stroke="#0d1030" strokeOpacity={0.35} strokeWidth={3} />);
  }
  return els;
})();
export const DiePlate: React.FC<{hue: number; lit: number}> = ({hue, lit}) => (
  <svg width={1920} height={1080} viewBox="-960 -540 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>
    <defs>
      <linearGradient id="d17bg" x1="0" y1="0" x2="1" y2="1" gradientTransform={`rotate(${hue} 0.5 0.5)`}>
        <stop offset="0%" stopColor="#c45ad8" />
        <stop offset="18%" stopColor="#4f6ff0" />
        <stop offset="36%" stopColor="#2fc8e0" />
        <stop offset="54%" stopColor="#4fe08a" />
        <stop offset="72%" stopColor="#f0d64a" />
        <stop offset="88%" stopColor="#f08a4a" />
        <stop offset="100%" stopColor="#d65aa8" />
      </linearGradient>
    </defs>
    <rect x={-960} y={-540} width={1920} height={1080} fill="url(#d17bg)" />
    {dieStatic}
    <rect x={-CW - 10} y={-CH - 10} width={CW * 2 + 20} height={CH * 2 + 20} fill="none" stroke="#ffffff" strokeWidth={6} opacity={0.85} />
    <path d={wpPath(ROUTE_DIE)} stroke="#ffffff" strokeWidth={12} fill="none" strokeLinejoin="round" opacity={0.55} />
    <path d={wpPath(ROUTE_DIE)} stroke="#a8fbff" strokeWidth={6} fill="none" strokeLinejoin="round" opacity={lit} />
  </svg>
);
