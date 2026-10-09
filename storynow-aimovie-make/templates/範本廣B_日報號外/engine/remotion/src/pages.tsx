/* 廣B 報紙版面：第一版（頭條＋四個可省略的專欄）、第一版背面、第二版（三張網點照片）、背面報頭。
   全部用「頁面單位」排版：一張報紙 2400×3400，鏡頭再把它縮放平移到畫面上。字全部來自 storyboard（T.d），
   字級依字數自動縮放；省略的專欄用假內文（灰線）補滿，版面不會空。原作：02_試做/廣告30風格 第 11 支（屏榮日報號外）。 */
import React from 'react';
import T from './timeline.json';
import {Roller, k, EO, lerp, em, fitFs, charX} from './kit';
import {SERIF, PLAY} from './fonts';
import {Halftone, SUNRISE, RISE, MEET, RING} from './halftone';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const D = T.d as any;
const TT = T as any;
export const HAS = T.has as Record<string, boolean>;
export const PW = 2400, PH = 3400;
export const PAPER = '#efeadf', INK = '#1a1714', RED = '#c8102e', GREY = 'rgba(26,23,20,0.30)';
const MK = T.marks as Record<string, number>;

/* ───── 頭條排版（字級依字數縮放） ───── */
const HL: string[] = D.head.lines;
const one = HL.length === 1;
const HEAD = HL.join('');
const L1 = {fs: fitFs(HL[0], one ? 420 : 330, 1440), top: one ? 800 : 770};
const L2 = one ? null : {fs: fitFs(HL[1], 230, 1440), top: 1150};
const redFrom = D.head.red ? HEAD.indexOf(D.head.red) : -1;
const isRed = (i: number) => redFrom >= 0 && i >= redFrom && i < redFrom + Array.from(D.head.red as string).length;
const HC = (() => {
  const out: {x0: number; w: number; top: number; fs: number}[] = [];
  HL.forEach((ln, li) => {
    const g = li === 0 ? L1 : (L2 as {fs: number; top: number});
    for (const c of charX(ln)) out.push({x0: 100 + c.x * g.fs, w: c.w * g.fs, top: g.top, fs: g.fs});
  });
  return out;
})();
const DECK: string = D.head.deck || '';
const DC = charX(DECK);

/* ───── 圓餅與分類廣告的標註圈（依字寬算） ───── */
const pieBigW = HAS.pie ? em(D.pie.big) * 124 : 0;
const adNumW = HAS.ad ? String(D.ad.number).length * 0.6 * 170 + 16 + em(D.ad.unit) * 92 : 0;

/* ───── 版面幾何（鉛筆也要用） ───── */
export const G = {
  headChar: (i: number) => {
    const c = HC[Math.min(i, HC.length - 1)];
    return {x: c.x0 + c.w, y: c.top + c.fs * 0.9, x0: c.x0, w: c.w};
  },
  deckChar: (i: number) => ({x: 140 + (DC[Math.min(i, DC.length - 1)]?.x ?? 0) * 92 + 92, y: 1420 + 98}),
  picto: (i: number) => ({x: 100 + (i % 5) * 130 + 65, y: 1830 + Math.floor(i / 5) * 230 + 110}),
  pie: {x: 1560, y: 2060, r: 240},
  note: [[1690, 2010], [1790, 1890], [1866, 1890]] as [number, number][],
  ring: {x: 1885 + pieBigW / 2, y: 2080, rx: pieBigW / 2 + 70, ry: 88},
  route: (i: number) => 2740 + i * 130,
  check: (i: number): [number, number][] => {
    const y = 2740 + i * 130;
    return [[1108, y + 52], [1138, y + 86], [1196, y + 2]];
  },
  ring10: {x: 1580 + adNumW / 2, y: 2900, rx: adNumW / 2 + 70, ry: 112},
  photo: (i: number) => ({x: 100 + i * 740, y: 780}),
  label: (i: number) => ({x: 100 + i * 740 + 360, y: 1690}),
};

/* ───── 小元件 ───── */
export const Lines: React.FC<{x: number; y: number; w: number; h: number; gap?: number; th?: number; c?: string}> = ({x, y, w, h, gap = 40, th = 13, c = GREY}) => (
  <div style={{position: 'absolute', left: x, top: y, width: Math.max(0, w), height: h,
    background: `repeating-linear-gradient(to bottom, ${c} 0 ${th}px, transparent ${th}px ${gap}px)`}} />
);
export const Cols: React.FC<{x: number; y: number; w: number; h: number; n: number; gap?: number}> = ({x, y, w, h, n, gap = 40}) => {
  const cww = (w - (n - 1) * gap) / n;
  return <>{Array.from({length: n}, (_, i) => <Lines key={i} x={x + i * (cww + gap)} y={y} w={cww} h={h} />)}</>;
};
const Rule: React.FC<{y: number; th?: number; x?: number; w?: number}> = ({y, th = 4, x = 100, w = 2200}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: th, background: INK}} />
);
const VRule: React.FC<{x: number; y: number; h: number}> = ({x, y, h}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 4, height: h, background: INK}} />
);
/** 一行字；有 w 時字級自動縮到放得下 */
const Txt: React.FC<{x: number; y: number; fs: number; w?: number; fw?: number; c?: string; ff?: string; align?: 'left' | 'center' | 'right'; it?: boolean; children: string; ls?: number; fit?: number}> = ({x, y, fs, w, fw = 500, c = INK, ff = SERIF, align = 'left', it, children, ls = 0, fit}) => {
  const f2 = fit ? fitFs(children, fs, fit) : fs;
  return (
    <div style={{position: 'absolute', left: x, top: y + (fs - f2) * 0.55, width: w, fontFamily: ff, fontSize: f2, fontWeight: fw, color: c, lineHeight: 1.1,
      textAlign: align, whiteSpace: 'nowrap', fontStyle: it ? 'italic' : 'normal', letterSpacing: ls}}>{children}</div>
  );
};
const Reverse: React.FC<{x: number; y: number; w: number; children: string}> = ({x, y, w, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: 92, background: INK, color: PAPER, fontFamily: SERIF, fontWeight: 900,
    fontSize: fitFs(children, 66, w - 50), lineHeight: '92px', paddingLeft: 28, boxSizing: 'border-box', whiteSpace: 'nowrap'}}>{children}</div>
);
export const PaperBase: React.FC<{w?: number; h?: number}> = ({w = PW, h = PH}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, background: PAPER,
    backgroundImage: 'radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%), radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 62%, rgba(120,100,60,0.18) 100%)'}} />
);
/** 逐字打出：字錘打到紙上 */
const typed = (f: number, at: number) => {
  const p = k(f, at, at + 3, EO);
  return {opacity: p, transform: `translateY(${(1 - p) * -14}%) scale(${lerp(1.12, 1, p)})`};
};
export const pathLen = (pts: [number, number][]) => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
export const alongPath = (pts: [number, number][], p: number): [number, number] => {
  let rest = pathLen(pts) * Math.max(0, Math.min(1, p));
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (rest <= l || i === pts.length - 1) {
      const u = l > 0 ? Math.min(1, rest / l) : 0;
      return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
    }
    rest -= l;
  }
  return pts[pts.length - 1];
};
/** 手繪橢圓（多繞一點、不完全閉合） */
export const ellipsePts = (cx: number, cy: number, rx: number, ry: number, n = 48): [number, number][] =>
  Array.from({length: n + 1}, (_, i) => {
    const a = -Math.PI * 0.85 + (i / n) * Math.PI * 2.15;
    const wob = 1 + 0.04 * Math.sin(i * 0.9);
    return [cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob - (i / n) * ry * 0.18];
  });
const Ink: React.FC<{pts: [number, number][]; p: number; w?: number}> = ({pts, p, w = 12}) => {
  if (p <= 0) return null;
  const L = pathLen(pts);
  const d = 'M' + pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L');
  return (
    <svg width={PW} height={PH} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <path d={d} fill="none" stroke={RED} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={L} strokeDashoffset={L * (1 - p)} opacity={0.92} />
    </svg>
  );
};

/* 標語拆兩行（逗號或對半），給第一版底下的小框用 */
const SLOGAN: string = D.back.slogan;
const sl = (() => {
  const m = SLOGAN.split(/[，,、　 ]/).filter(Boolean);
  if (m.length >= 2) return [m[0], m.slice(1).join('')];
  const a = Array.from(SLOGAN);
  return [a.slice(0, Math.ceil(a.length / 2)).join(''), a.slice(Math.ceil(a.length / 2)).join('')];
})();

/* ───── 第一版 ───── */
export const Page1: React.FC<{f: number}> = ({f}) => {
  const P = D.paper, H = D.head;
  const stampP = k(f, MK.stamp, MK.stamp + 6, EO);
  const typeHead: number[] = TT.typeHead, typeDeck: number[] = TT.typeDeck || [];
  const caretOn = f >= MK.typeHead - 12 && f < (typeDeck.length ? typeDeck[typeDeck.length - 1] : typeHead[typeHead.length - 1]) + 50 && Math.floor(f / 8) % 2 === 0;
  const headN = typeHead.filter((t) => f >= t).length;
  const deckN = typeDeck.filter((t) => f >= t).length;
  const caret = headN < HC.length ? HC[Math.max(0, headN - 1)] : null;
  return (
    <>
      <PaperBase />
      {/* 報眉 */}
      <Txt x={100} y={70} fs={64} ff={PLAY} fw={700} fit={580}>{P.en}</Txt>
      <Txt x={700} y={70} fs={64} w={1000} align="center" fit={1000}>{P.edition}</Txt>
      <Txt x={1700} y={70} fs={64} w={600} align="right" fw={900} c={RED} fit={600}>{`${P.extra ?? '號外'}　EXTRA`}</Txt>
      <Rule y={165} />
      {/* 報頭 */}
      <div style={{position: 'absolute', left: 100, top: 205, width: 420, height: 270, border: `6px solid ${INK}`, boxSizing: 'border-box'}} />
      <Txt x={100} y={232} w={420} fs={100} fw={900} align="center" fit={390}>{P.earA}</Txt>
      <Txt x={100} y={362} w={420} fs={70} align="center" fit={390}>{P.earB}</Txt>
      <Txt x={560} y={170} w={1280} fs={300} fw={900} align="center" ls={-6} fit={1280}>{P.name}</Txt>
      <div style={{position: 'absolute', left: 1890, top: 200, width: 410, height: 280,
        transform: `rotate(${lerp(-14, -5, stampP)}deg) scale(${lerp(2.1, 1, stampP)})`, opacity: stampP,
        background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <span style={{fontFamily: SERIF, fontWeight: 900, fontSize: fitFs(P.extra ?? '號外', 176, 370), color: PAPER, lineHeight: 1}}>{P.extra ?? '號外'}</span>
      </div>
      {P.sub && <Txt x={100} y={510} w={2200} fs={64} ff={PLAY} it fw={400} align="center" fit={2200}>{P.sub}</Txt>}
      <Rule y={602} th={10} />
      <Rule y={620} th={3} />
      {/* 頭條 */}
      <div style={{position: 'absolute', left: 100, top: 660, height: 100, padding: '0 30px', background: RED, color: PAPER, fontFamily: SERIF, fontWeight: 900, fontSize: 80, lineHeight: '100px', whiteSpace: 'nowrap'}}>{H.kicker}</div>
      {Array.from(HEAD).map((ch, i) => {
        const g = HC[i];
        return (
          <div key={i} style={{position: 'absolute', left: g.x0, top: g.top, width: g.w, textAlign: 'center', fontFamily: SERIF, fontWeight: 900,
            fontSize: g.fs, lineHeight: 1, color: isRed(i) ? RED : INK, ...typed(f, typeHead[i])}}>{ch}</div>
        );
      })}
      {caret && caretOn && (
        <div style={{position: 'absolute', left: (headN === 0 ? 100 : caret.x0 + caret.w) + 10, top: (headN === 0 ? HC[0] : caret).top + 20, width: 14,
          height: (headN === 0 ? HC[0] : caret).fs * 0.9, background: RED}} />
      )}
      <div style={{position: 'absolute', left: 1580, top: 680, width: 720, height: 620, overflow: 'hidden', background: PAPER}}>
        <Halftone w={720} h={620} shade={SUNRISE} step={22} ink={INK} />
      </div>
      <Lines x={1580} y={1320} w={720} h={70} />
      {DECK && <div style={{position: 'absolute', left: 100, top: 1420, width: 16, height: 100, background: RED, opacity: deckN > 0 ? 1 : 0}} />}
      {Array.from(DECK).map((ch, i) => (
        <div key={i} style={{position: 'absolute', left: 140 + DC[i].x * 92, top: 1420, width: DC[i].w * 92, textAlign: 'center', fontFamily: SERIF, fontWeight: 500, fontSize: 92, lineHeight: 1.05,
          color: INK, ...typed(f, typeDeck[i])}}>{ch}</div>
      ))}
      {!DECK && <Lines x={100} y={1420} w={1400} h={110} />}
      <Lines x={1580} y={1420} w={720} h={110} />
      <Rule y={1560} />
      {/* 圖示統計（可省略） */}
      {HAS.picto ? <Picto f={f} /> : <><Lines x={100} y={1610} w={2200} h={70} /><Cols x={100} y={1730} w={1110} h={600} n={2} /></>}
      <VRule x={1255} y={1720} h={680} />
      {/* 圓餅（可省略） */}
      {HAS.pie ? <Pie f={f} /> : <Cols x={1300} y={1730} w={1000} h={600} n={2} />}
      <Lines x={1300} y={2330} w={1000} h={70} />
      <Rule y={2440} />
      {/* 勾選專欄（可省略） */}
      {HAS.checklist ? <Checklist f={f} /> : <Cols x={100} y={2470} w={1110} h={830} n={2} />}
      <VRule x={1255} y={2470} h={830} />
      {/* 分類廣告（可省略） */}
      {HAS.ad ? <AdBox f={f} /> : <Cols x={1300} y={2470} w={1000} h={490} n={2} />}
      {/* 底下兩個小框：名稱＋標語 */}
      <div style={{position: 'absolute', left: 1300, top: 2985, width: 490, height: 300, border: `4px solid ${INK}`, boxSizing: 'border-box'}} />
      <Txt x={1300} y={3020} w={490} fs={84} fw={900} align="center" fit={450}>{D.back.name}</Txt>
      <Txt x={1300} y={3140} w={490} fs={64} ff={PLAY} fw={700} align="center" fit={450}>{P.en}</Txt>
      <div style={{position: 'absolute', left: 1810, top: 2985, width: 490, height: 300, border: `4px solid ${INK}`, boxSizing: 'border-box'}} />
      <Txt x={1810} y={3030} w={490} fs={72} align="center" fit={450}>{sl[0]}</Txt>
      <Txt x={1810} y={3130} w={490} fs={72} align="center" fit={450}>{sl[1]}</Txt>
      <Rule y={3310} th={3} />
      <Txt x={100} y={3320} fs={60} ff={PLAY} fw={700}>A1</Txt>
      <Lines x={300} y={3335} w={1700} h={30} />
    </>
  );
};

const Picto: React.FC<{f: number}> = ({f}) => {
  const s = D.picto;
  const taps: number[] = TT.picto;
  const n = Number(s.filled);
  return (
    <>
      <div style={{position: 'absolute', left: 100, top: 1600, height: 92, width: 170, background: INK, color: PAPER, fontFamily: SERIF, fontWeight: 900, fontSize: fitFs(s.tag ?? '數據', 66, 150), lineHeight: '92px', textAlign: 'center'}}>{s.tag ?? '數據'}</div>
      <Txt x={300} y={1596} fs={84} fw={900} fit={780}>{s.title}</Txt>
      <Lines x={1100} y={1615} w={1200} h={70} />
      <Txt x={100} y={1730} fs={70} fit={1100}>{s.label}</Txt>
      {Array.from({length: 10}, (_, i) => {
        const g = G.picto(i);
        const on = i < n ? k(f, taps[i], taps[i] + 5, EO) : 0;
        const fill = on > 0 ? RED : 'none';
        return (
          <svg key={i} width={130} height={220} style={{position: 'absolute', left: g.x - 65, top: g.y - 110, overflow: 'visible', transform: `scale(${lerp(1, lerp(1.35, 1, on), on > 0 ? 1 : 0)})`}}>
            <circle cx={65} cy={42} r={32} fill={fill} stroke={on > 0 ? RED : INK} strokeWidth={6} />
            <path d="M18,200 L22,110 Q24,84 50,84 L80,84 Q106,84 108,110 L112,200 Z" fill={fill} stroke={on > 0 ? RED : INK} strokeWidth={6} />
          </svg>
        );
      })}
      <div style={{position: 'absolute', left: 790, top: 1860, fontFamily: SERIF, fontWeight: 900, fontSize: fitFs(s.value, 210, 440), color: RED, lineHeight: 1, display: 'flex', opacity: k(f, taps[0] - 8, taps[0])}}>
        <Roller value={String(s.value)} t={f} start={taps[0]} lock={[taps[taps.length - 1], taps[taps.length - 1] + 4, taps[taps.length - 1] + 8]} laps={1} cw={0.6} />
      </div>
      {s.under && <Txt x={800} y={2110} fs={64} fit={430}>{s.under}</Txt>}
      <Lines x={800} y={2210} w={400} h={80} />
    </>
  );
};

const Pie: React.FC<{f: number}> = ({f}) => {
  const s = D.pie;
  const fr = Math.min(1, Number(s.fraction));
  const pieP = k(f, MK.pie, MK.pie + 40, (x) => x);
  const pieEnd = -Math.PI / 2 + Math.PI * 2 * fr * pieP;
  const arc = (a0: number, a1: number, r: number) => {
    const {x, y} = G.pie;
    if (a1 - a0 >= Math.PI * 2 - 1e-3) return `M${x - r},${y} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
    const big = a1 - a0 > Math.PI ? 1 : 0;
    return `M${x},${y} L${x + Math.cos(a0) * r},${y + Math.sin(a0) * r} A${r},${r} 0 ${big} 1 ${x + Math.cos(a1) * r},${y + Math.sin(a1) * r} Z`;
  };
  const labelP = k(f, MK.note + 20, MK.note + 36);
  const lines: string[] = s.lines || [];
  return (
    <>
      <Txt x={1300} y={1730} fs={70} fit={900}>{s.title}</Txt>
      <svg width={PW} height={PH} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <circle cx={G.pie.x} cy={G.pie.y} r={G.pie.r} fill="rgba(26,23,20,0.12)" stroke={INK} strokeWidth={6} />
        {pieP > 0 && <path d={arc(-Math.PI / 2, pieEnd, G.pie.r)} fill={RED} />}
      </svg>
      <Ink pts={G.note} p={k(f, MK.note, MK.note + 26, (x) => x)} w={10} />
      <div style={{opacity: labelP, transform: `translateX(${(1 - labelP) * 30}px)`}}>
        {lines[0] && <Txt x={1885} y={1830} fs={72} fit={415}>{lines[0]}</Txt>}
        {lines[1] && <Txt x={1885} y={1912} fs={72} fit={415}>{lines[1]}</Txt>}
        <div style={{position: 'absolute', left: 1885, top: 2005, fontFamily: SERIF, fontWeight: 900, fontSize: 124, color: RED, lineHeight: 1, whiteSpace: 'nowrap'}}>{s.big}</div>
      </div>
      <Ink pts={ellipsePts(G.ring.x, G.ring.y, G.ring.rx, G.ring.ry)} p={k(f, MK.ring, MK.ring + 26, (x) => x)} w={11} />
    </>
  );
};

const Checklist: React.FC<{f: number}> = ({f}) => {
  const s = D.checklist;
  const checks: number[] = TT.checks;
  return (
    <>
      <Reverse x={100} y={2470} w={1120}>{s.tag}</Reverse>
      <Txt x={100} y={2590} fs={100} fw={900} fit={1120}>{s.title}</Txt>
      {(s.items as string[]).map((r, i) => {
        const y = G.route(i);
        const tw = Math.min(820, em(r) * 92);
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: 115, top: y + 10, width: 90, height: 90, borderRadius: 45, background: INK, color: PAPER, fontFamily: PLAY, fontWeight: 900, fontSize: 64, lineHeight: '86px', textAlign: 'center'}}>{i + 1}</div>
            <Txt x={240} y={y + 5} fs={92} fit={820}>{r}</Txt>
            {240 + tw + 40 < 1060 && <Lines x={240 + tw + 40} y={y + 22} w={1040 - (240 + tw + 40)} h={70} gap={34} th={11} />}
            <div style={{position: 'absolute', left: 1100, top: y + 15, width: 80, height: 80, border: `6px solid ${INK}`, boxSizing: 'border-box'}} />
            <Ink pts={G.check(i)} p={k(f, checks[i], checks[i] + 8, (x) => x)} w={16} />
          </React.Fragment>
        );
      })}
      {(s.items as string[]).length < 4 && <Lines x={100} y={2740 + (s.items as string[]).length * 130 + 20} w={1100} h={(4 - (s.items as string[]).length) * 130 - 40} />}
    </>
  );
};

const AdBox: React.FC<{f: number}> = ({f}) => {
  const s = D.ad;
  const lines: string[] = s.lines || [];
  return (
    <>
      <Reverse x={1300} y={2470} w={1000}>{s.tag ?? '分類廣告'}</Reverse>
      <div style={{position: 'absolute', left: 1300, top: 2590, width: 1000, height: 370, border: `8px solid ${RED}`, boxSizing: 'border-box'}} />
      <div style={{position: 'absolute', left: 1345, top: 2670, width: 200, height: 200, borderRadius: 100, border: `8px solid ${RED}`, boxSizing: 'border-box',
        fontFamily: SERIF, fontWeight: 900, fontSize: 120, color: RED, lineHeight: '180px', textAlign: 'center'}}>{s.mark}</div>
      {lines[0] && <Txt x={1590} y={2620} fs={72} fit={690}>{lines[0]}</Txt>}
      {lines[1] && <Txt x={1590} y={2710} fs={72} fit={690}>{lines[1]}</Txt>}
      <div style={{position: 'absolute', left: 1580, top: 2800, display: 'flex', alignItems: 'flex-end', fontFamily: SERIF, fontWeight: 900, lineHeight: 1, whiteSpace: 'nowrap'}}>
        <span style={{fontSize: 170, color: RED, opacity: k(f, MK.roll10 - 8, MK.roll10)}}>
          <Roller value={String(s.number)} t={f} start={MK.roll10} lock={[MK.roll10 + 26, MK.roll10 + 34, MK.roll10 + 38, MK.roll10 + 40]} laps={2} cw={0.6} />
        </span>
        <span style={{fontSize: 92, color: INK, marginLeft: 16, marginBottom: 10}}>{s.unit}</span>
      </div>
      <Ink pts={ellipsePts(G.ring10.x, G.ring10.y, G.ring10.rx, G.ring10.ry)} p={k(f, MK.ring10, MK.ring10 + 26, (x) => x)} w={11} />
    </>
  );
};

/** 第一版的背面（翻過去之後看到的） */
export const Page1Back: React.FC = () => (
  <>
    <PaperBase />
    <Rule y={165} />
    <Cols x={100} y={220} w={2200} h={3080} n={6} />
  </>
);

/* ───── 第二版：三張網點照片 ───── */
const SHADES = [RISE, MEET, RING];
export const Page2: React.FC<{f: number}> = ({f}) => {
  const s = D.page2;
  const photos: number[] = TT.photos;
  const words: string[] = s.words;
  return (
    <>
      <PaperBase />
      <Txt x={100} y={70} fs={64} ff={PLAY} fw={700} fit={580}>{D.paper.en}</Txt>
      <Txt x={700} y={70} fs={64} w={1000} align="center" fit={1000}>{s.strip}</Txt>
      <Txt x={1700} y={70} fs={64} w={600} align="right" ff={PLAY} fw={700}>A2</Txt>
      <Rule y={165} />
      <div style={{position: 'absolute', left: 100, top: 200, height: 100, padding: '0 30px', background: RED, color: PAPER, fontFamily: SERIF, fontWeight: 900, fontSize: 80, lineHeight: '100px', whiteSpace: 'nowrap'}}>{s.kicker}</div>
      <div style={{position: 'absolute', left: 100, top: 330, width: 2200, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: 250, lineHeight: 1, color: INK, whiteSpace: 'nowrap'}}>
        <span>{words[0]}</span><span style={{color: RED, fontSize: 180}}>×</span><span>{words[1]}</span><span style={{color: RED, fontSize: 180}}>×</span><span>{words[2]}</span>
      </div>
      <Txt x={100} y={620} fs={92} fit={960}>{s.deck}</Txt>
      <Lines x={1100} y={640} w={1200} h={80} />
      {SHADES.map((sh, i) => {
        const g = G.photo(i);
        const p = k(f, photos[i] - 18, photos[i] + 12, EO);
        const lab = k(f, photos[i], photos[i] + 5, EO);
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: g.x, top: g.y, width: 720, height: 720, background: PAPER, border: `4px solid ${INK}`, boxSizing: 'border-box', overflow: 'hidden'}}>
              <Halftone w={720} h={720} shade={sh} step={26} p={p} ink={INK} />
            </div>
            <div style={{position: 'absolute', left: g.x, top: 1530, width: 720, textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: fitFs(words[i], 130, 700), lineHeight: 1.1, color: i === 1 ? RED : INK,
              opacity: lab, transform: `scale(${lerp(1.5, 1, lab)})`, whiteSpace: 'nowrap'}}>{words[i]}</div>
          </React.Fragment>
        );
      })}
      <Rule y={1740} />
      <div style={{position: 'absolute', left: 100, top: 1790, width: 2200, height: 120, border: `4px solid ${INK}`, boxSizing: 'border-box'}} />
      <Txt x={100} y={1815} w={2200} fs={68} align="center" fit={2150}>{s.line}</Txt>
      <Cols x={100} y={1960} w={1400} h={1330} n={3} />
      <div style={{position: 'absolute', left: 1560, top: 1960, width: 740, height: 560, overflow: 'hidden', border: `4px solid ${INK}`, boxSizing: 'border-box'}}>
        <Halftone w={740} h={560} shade={SUNRISE} step={30} ink={INK} />
      </div>
      <Lines x={1560} y={2560} w={740} h={730} />
      <Rule y={3310} th={3} />
      <Txt x={100} y={3320} fs={60} ff={PLAY} fw={700}>A2</Txt>
    </>
  );
};

/* ───── 背面：摺起來後朝上的那一面（大名＋標語＋網址） ───── */
export const BW = 2400, BH = 1700;
const nameFs = fitFs(D.back.name, 400, 2200);
const nameW = em(D.back.name) * nameFs + 10 * Array.from(D.back.name as string).length;
export const BACK = {underline: [[1200 - nameW / 2 + 30, 700], [1200, 712], [1200 + nameW / 2 - 25, 698]] as [number, number][]};
export const Back: React.FC<{f: number}> = ({f}) => {
  const b = D.back;
  return (
    <>
      <PaperBase w={BW} h={BH} />
      <Txt x={100} y={62} fs={72} fw={900} c={RED} fit={1000}>{b.strip}</Txt>
      {b.en && <Txt x={1100} y={68} w={1200} fs={64} ff={PLAY} fw={700} align="right" fit={1200}>{b.en}</Txt>}
      <Rule y={170} th={8} />
      <div style={{position: 'absolute', left: 0, top: 250 + (400 - nameFs) * 0.5, width: BW, textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: nameFs, lineHeight: 1.1, letterSpacing: 10, color: INK, whiteSpace: 'nowrap'}}>{b.name}</div>
      <Ink pts={BACK.underline} p={k(f, MK.underline, MK.underline + 22, (x) => x)} w={22} />
      <Txt x={0} y={770} w={BW} fs={130} fw={500} align="center" fit={2200}>{b.slogan}</Txt>
      <Rule y={975} th={4} x={500} w={1400} />
      {b.web && <Txt x={0} y={1010} w={BW} fs={110} ff={PLAY} fw={700} it align="center" fit={2200}>{b.web}</Txt>}
      {b.full && <Txt x={0} y={1200} w={BW} fs={80} align="center" fit={2200}>{b.full}</Txt>}
      <Rule y={1340} th={3} />
      <Cols x={100} y={1380} w={2200} h={260} n={5} />
    </>
  );
};
