/* 範本廣J「寵物直播」：一場手機直播帶貨。柴犬主播賣商品 → 觀眾越來越多 → 揭曉（鏡頭拉出手機到牆上招牌）
   → 關鍵字貼紙跳出手機 → 展示品（禮盒打開＋匾額／證書＋印章）→ 人數爆表、愛心滿屏 → 直播結束，牆上招牌亮出名稱，狗狗揮手下播。
   鏡頭：同一個房間連續拍攝（推進手機、拉出房間、推回去）。時間、鏡頭、留言、下單、字全部讀 timeline.json（timeline.py 依 storyboard 算好）。
   原作：02_試做/廣告30風格 第 20 支（固定 60 秒、屏榮電子商務科的字寫死在程式裡）。 */
import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import TJ from './timeline.json';
import {ZM, FR} from './fonts';
import {EB, EI, EIO, EO, bell, clamp, k, lerp, pulse, rnd, rnd01, sp} from './kit';
import {Dog, DogPose} from './Dog';
import {Item, ItemKind} from './Items';
import {Desk, RingLight, Wall} from './Room';

/* ───────── 時間表型別 ───────── */
type Card = {a: number; b: number; icon: ItemKind; name: string; nameSize: number; price: string; priceSize: number; order: number};
type Show = {
  kind: 'trophy' | 'medal' | 'ticket' | 'cert'; start: number; end: number; out: number;
  top: string; topSize: number; main: string; mainSize: number;
  big?: string; bigSize?: number; hit?: number; shake?: number[]; exit?: number;
  stamp?: string; stampSize?: number; in?: number; stampAt?: number;
};
type TL = {
  frames: number; fps: number; beatFrames: number;
  live: number; countdown: number[];
  reveal: {start: number; pre: number; sign: number; post: number; slam: number; back: number; end: number};
  combo: {at: number; back: number; out: number; brk: number};
  climax: number; boom: number;
  end: {at: number; sign: number; logo: number; slogan: number; url: number; bye: number; wave: number};
  cam: [number, number, number, number][]; punch: [number, number, number][];
  stand: [number, number, ItemKind][]; cards: Card[]; orders: [number, string, number, number][];
  hearts: number[]; points: [number, number, number][]; tilt: number[]; bark: number[];
  va: [number, number][]; peak: number; comments: [number, string, string, boolean][]; flying: string[];
  stickers: {a: number; icon: ItemKind; word: string; size: number; to: [number, number]; rot: number}[];
  xs: [number, number][]; shows: Show[]; pinnedEnd: number;
  d: {
    title: string; titleSize: number; introSize: number; ui: Record<string, string>; badge: string;
    reveal: {pre: string; preSize: number; name: string; nameSize: number; post: string; postSize: number; tag: string; tagSize: number};
    pinned: string; pinnedSize: number;
    end: {name: string; nameSize: number; cardNameSize: number; sub: string; subSize: number; slogan: string; sloganSize: number; url: string; urlSize: number};
  };
};
const T = TJ as unknown as TL;
const D = T.d;
const U = D.ui;
const B = T.beatFrames;
const LIVE = T.live;
const RV = T.reveal;
const CB = T.combo;
const C = T.climax;
const E = T.end.at;
const LAST = T.frames - 1;

/* 配色 */
const PINK = '#FF4F8B';
const PEACH = '#FF9A62';
const GRAD = `linear-gradient(120deg, ${PEACH}, ${PINK})`;
const PLUM = '#5A2840';

/* 手機螢幕在世界中的位置 */
const PX = 690;
const PY = 60;
const PW = 540;
const PH = 960;

/* ───────── 鏡頭 ───────── */
const KEYS = T.cam;
const camAt = (f: number) => {
  let i = 0;
  while (i + 1 < KEYS.length - 1 && f >= KEYS[i + 1][0]) i++;
  const [f0, x0, y0, s0] = KEYS[i];
  const [f1, x1, y1, s1] = KEYS[i + 1];
  const long = f1 - f0 > 70;
  const p = interpolate(f, [f0, f1], [0, 1], {...clamp, easing: long ? (x: number) => x : EIO});
  return {cx: lerp(x0, x1, p), cy: lerp(y0, y1, p), s: Math.exp(lerp(Math.log(s0), Math.log(s1), p))};
};
/* 拍點重擊：[格, 推進量, 震動像素] */
const hitAt = (f: number) => {
  let z = 0, sx = 0, sy = 0;
  for (const [h, a, sh] of T.punch) {
    const d = f - h;
    if (d < 0 || d > 24) continue;
    const e = Math.exp(-d / 5);
    z += a * e;
    sx += Math.sin(d * 2.3 + h) * sh * e;
    sy += Math.cos(d * 1.9 + h) * sh * e;
  }
  return {z, sx, sy};
};
const camFull = (f: number) => {
  const c = camAt(f);
  const h = hitAt(f);
  return {...c, S: c.s * (1 + h.z), sx: h.sx, sy: h.sy};
};
type CamF = ReturnType<typeof camFull>;
const toScreen = (c: CamF, x: number, y: number) => ({x: 960 + c.sx + (x - c.cx) * c.S, y: 540 + c.sy + (y - c.cy) * c.S});
const camTransform = (c: CamF) => `translate(${960 + c.sx}px, ${540 + c.sy}px) scale(${c.S}) translate(${-c.cx}px, ${-c.cy}px)`;

/* ───────── 觀看人數（直播介面的動態數字，曲線由 timeline.py 依段落伸縮） ───────── */
const VA = T.va;
const BOOM = T.boom;
const viewersRaw = (f: number) => {
  if (f < VA[0][0]) return 0;
  for (let i = 0; i + 1 < VA.length; i++) {
    const [a, va] = VA[i], [b, vb] = VA[i + 1];
    if (f < b) return Math.round(Math.exp(lerp(Math.log(va), Math.log(vb), (f - a) / Math.max(1, b - a))));
  }
  return T.peak;
};
const fmt = (v: number) => v.toLocaleString('en-US');
/** 每拍更新一次，數字用滾動換 */
const viewers = (f: number, step = B) => {
  const q = Math.floor((f - LIVE) / step) * step + LIVE;
  const a = fmt(viewersRaw(q - step)) + (q - step >= BOOM ? '+' : '');
  const b = fmt(viewersRaw(q)) + (q >= BOOM ? '+' : '');
  return {a, b, p: k(f, q, q + Math.min(7, step - 1))};
};
const RollNum: React.FC<{a: string; b: string; p: number}> = ({a, b, p}) => {
  const n = Math.max(a.length, b.length);
  const A = a.padStart(n, ' ');
  const Bs = b.padStart(n, ' ');
  return (
    <span style={{display: 'inline-flex', lineHeight: 1}}>
      {Bs.split('').map((ch, i) => {
        const o = A[i];
        if (o === ch || p >= 1) return <span key={i} style={{display: 'inline-block', width: ch === ',' ? '0.3em' : '0.6em', textAlign: 'center'}}>{ch}</span>;
        return (
          <span key={i} style={{position: 'relative', display: 'inline-block', width: ch === ',' || o === ',' ? '0.3em' : '0.6em', height: '1.05em', overflow: 'hidden', verticalAlign: 'top'}}>
            <span style={{position: 'absolute', left: 0, right: 0, textAlign: 'center', transform: `translateY(${-p * 1.05}em)`, opacity: 1 - p}}>{o}</span>
            <span style={{position: 'absolute', left: 0, right: 0, textAlign: 'center', transform: `translateY(${(1 - p) * 1.05}em)`, opacity: p}}>{ch}</span>
          </span>
        );
      })}
    </span>
  );
};

/* ───────── 狗狗的動作 ───────── */
const win = (f: number, a: number, b: number, ein = 7, eout = 8) => Math.min(k(f, a, a + ein, EB), 1 - k(f, b - eout, b, EIO));
const PLAQ = T.shows.filter((s) => s.kind !== 'cert');
const dogPose = (f: number): DogPose => {
  const bc = (f + 23) % 83;
  const blink = bc < 6 ? bell(bc / 6) : 0;
  const climax = f >= C && f < E;
  const excite = climax ? 1 : f >= E ? 0.6 : 0.3;
  const tail = Math.sin(f * (0.45 + excite * 0.35)) * (16 + excite * 12);
  const quiet = f < LIVE || PLAQ.some((s) => f >= s.start && f < (s.hit ?? s.start));
  const pb = quiet ? 0 : pulse(f, B, 0.3);
  const hop = -pb * (climax ? 16 : 8);
  // 歪頭
  let tilt = 0;
  for (const t of T.tilt) tilt += -17 * win(f, t, t + 40);
  // 前腳：指商品／指向手機外／舉獎／蓋章
  let arm = 0;
  for (const [a, b, ang] of T.points) {
    const w = win(f, a, b);
    arm = arm * (1 - w) + ang * w;
  }
  // 開播揮手、高潮揮手、下播揮手
  if (f >= LIVE + 8 && f < LIVE + 56) arm = lerp(arm, -140 + 24 * Math.sin((f - LIVE - 8) * 0.55), win(f, LIVE + 8, LIVE + 56));
  if (climax) arm = lerp(arm, -150 + 22 * Math.sin(f * 0.7), win(f, C, E + 10));
  if (f >= T.end.wave) arm = lerp(arm, -138 + 26 * Math.sin(f * 0.42), k(f, T.end.wave, T.end.wave + 12, EB));
  // 汪汪
  let bark = 0;
  for (const b of T.bark) bark = Math.max(bark, bell((f - b) / 6), bell((f - b - 6.6) / 6));
  const look = arm < -60 && arm > -120 ? 6 : 0;
  return {blink, tail, tilt, arm, bark, look, hop, squash: pb * 0.6};
};

/* ───────── 彈幕留言（timeline.py 依段落產生：沒寫 comments 時只有通用反應） ───────── */
const STEP = 54;
const Comments: React.FC<{f: number}> = ({f}) => {
  const shown = T.comments.filter(([s]) => s <= f && s > f - 900);
  return (
    <>
      {shown.map(([s, name, text, hi], j) => {
        let up = 0;
        for (let i = j + 1; i < shown.length; i++) up += k(f, shown[i][0], shown[i][0] + 8, EO);
        if (up > 6) return null;
        const y = 760 - up * STEP;
        const op = Math.min(1, (y - 590) / 60) * k(f, s, s + 6, EO);
        if (op <= 0) return null;
        return (
          <div
            key={s}
            style={{
              position: 'absolute', left: 16, top: y, height: 46, padding: '0 16px', borderRadius: 23,
              display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', fontFamily: ZM, fontWeight: 700, fontSize: 28,
              background: hi ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.42)', color: PLUM, opacity: op,
              transform: `translateX(${(1 - k(f, s, s + 8, EO)) * -60}px)`,
            }}
          >
            <span style={{color: hi ? PINK : '#B8336A', marginRight: 8}}>{name}</span>
            {text}
          </div>
        );
      })}
    </>
  );
};

/* ───────── 愛心 ───────── */
const HEART = 'M0 8 C -6 -6 -28 -6 -28 12 C -28 26 -10 36 0 46 C 10 36 28 26 28 12 C 28 -6 6 -6 0 8 Z';
const HCOL = ['#FF4F8B', '#FF3B5C', '#FF8FB8', '#FF6FA0', '#FFB0CB'];
const HEARTS: {s: number; seed: number}[] = (() => {
  const out: {s: number; seed: number}[] = [];
  for (const b of T.hearts) for (let j = 0; j < 6; j++) out.push({s: b + j * 3, seed: b * 10 + j});
  for (let s = LIVE + 12; s < E; s += 11) out.push({s, seed: s * 7 + 1});
  for (let s = C; s < E - 20; s += 3) out.push({s, seed: s * 13 + 2});
  return out;
})();
const PhoneHearts: React.FC<{f: number}> = ({f}) => (
  <svg style={{position: 'absolute', left: 0, top: 0}} width={PW} height={PH}>
    {HEARTS.filter((h) => f >= h.s && f < h.s + 56).map((h) => {
      const t = (f - h.s) / 56;
      const x = 482 + Math.sin(t * 5 + h.seed) * 26 * t + rnd(h.seed) * 30 * t;
      const y = 850 - EO(Math.min(1, t * 1.2)) * (380 + rnd01(h.seed + 1) * 160);
      const sc = (0.5 + 0.6 * Math.min(1, t * 4)) * (0.8 + rnd01(h.seed + 2) * 0.5);
      const op = Math.min(1, t * 8) * (1 - k(t, 0.65, 1, (x2) => x2));
      return <path key={h.seed} d={HEART} fill={HCOL[h.seed % 5]} opacity={op} transform={`translate(${x} ${y}) scale(${sc}) rotate(${rnd(h.seed + 3) * 14})`} />;
    })}
  </svg>
);

/* ───────── 商品卡、下單通知 ───────── */
const isNum = (s: string) => /^[$＄NT0-9]/.test(s);
const ProductCard: React.FC<{f: number}> = ({f}) => {
  const c = T.cards.find((q) => f >= q.a && f < q.b);
  if (!c) return null;
  const pin = k(f, c.a, c.a + 10, EB);
  const pout = k(f, c.b - 10, c.b, EI);
  const press = bell((f - c.order) / 8);
  return (
    <div
      style={{
        position: 'absolute', left: 16, top: 486, minWidth: 372, maxWidth: 470, height: 130, borderRadius: 22, background: '#fff', paddingRight: 22,
        boxShadow: '0 10px 26px rgba(160,40,80,0.25)', display: 'flex', alignItems: 'center', gap: 12, padding: 10,
        transform: `translateX(${-(1 - pin) * 80 - pout * 480}px) scale(${0.7 + 0.3 * pin})`, transformOrigin: 'left center', opacity: Math.min(1, pin * 2) * (1 - pout),
      }}
    >
      <div style={{width: 110, height: 110, borderRadius: 16, background: '#FFF0F4', flexShrink: 0}}>
        <svg width={110} height={110} viewBox="-90 -90 180 180">
          <Item k={c.icon} />
        </svg>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 12}}>
        <div style={{fontFamily: ZM, fontWeight: 900, fontSize: c.nameSize, color: PLUM, whiteSpace: 'nowrap', lineHeight: 1.15}}>{c.name}</div>
        {c.price && <div style={{fontFamily: isNum(c.price) ? FR : ZM, fontWeight: 700, fontSize: c.priceSize, color: PINK, whiteSpace: 'nowrap', lineHeight: 1.15}}>{c.price}</div>}
        <div
          style={{
            alignSelf: 'flex-start', background: GRAD, color: '#fff', fontFamily: ZM, fontWeight: 900, fontSize: 28, padding: '2px 16px', whiteSpace: 'nowrap',
            borderRadius: 20, transform: `scale(${1 - press * 0.14})`, boxShadow: press > 0 ? `0 0 0 ${press * 10}px rgba(255,79,139,0.3)` : 'none',
          }}
        >
          {U.buy}
        </div>
      </div>
    </div>
  );
};
const Notice: React.FC<{f: number}> = ({f}) => (
  <>
    {T.orders.map(([o, name, a, b]) => {
      if (f < a || f >= b + 10) return null;
      const pin = k(f, a, a + 8, EO);
      const pout = k(f, b, b + 10, EI);
      return (
        <div
          key={o}
          style={{
            position: 'absolute', left: 16, top: 150, height: 50, padding: '0 18px 0 8px', borderRadius: 25, background: GRAD,
            display: 'flex', alignItems: 'center', gap: 10, color: '#fff', fontFamily: ZM, fontWeight: 900, fontSize: 28, whiteSpace: 'nowrap',
            transform: `translate(${(1 - pin) * -420}px, ${-pout * 40}px)`, opacity: 1 - pout, boxShadow: '0 6px 16px rgba(200,40,90,0.3)',
          }}
        >
          <span style={{width: 36, height: 36, borderRadius: 18, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <svg width={24} height={24} viewBox="0 0 24 24">
              <path d="M4 8 H20 L18 21 H6 Z" fill={PINK} />
              <path d="M8 8 V6 A4 4 0 0 1 16 6 V8" fill="none" stroke={PINK} strokeWidth={2.4} />
            </svg>
          </span>
          {name} {U.ordered}
        </div>
      );
    })}
  </>
);

/* ───────── 展示台上的小物 ───────── */
const KW_ICONS = T.stickers.map((s) => s.icon);
const Stand: React.FC<{f: number}> = ({f}) => (
  <svg style={{position: 'absolute', left: 0, top: 0}} width={PW} height={PH}>
    <defs>
      <radialGradient id="ajrays" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#FFF3B0" stopOpacity="0.95" />
        <stop offset="1" stopColor="#FFF3B0" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* 展示品的光芒 */}
    {PLAQ.map((s, i) => {
      const h = s.hit as number;
      if (f < h || f >= s.end) return null;
      return (
        <g key={i} transform={`translate(430 420) rotate(${(f - h) * 1.2}) scale(${k(f, h, h + 12, EB)})`} opacity={1 - k(f, s.end - 16, s.end)}>
          <circle r={190} fill="url(#ajrays)" />
          {Array.from({length: 12}, (_, j) => (
            <path key={j} d="M0 0 L -20 -230 L 20 -230 Z" fill="#FFE27A" opacity={0.55} transform={`rotate(${j * 30})`} />
          ))}
        </g>
      );
    })}
    {/* 台座 */}
    <rect x={350} y={500} width={160} height={62} fill="#FF8FB1" />
    <ellipse cx={430} cy={562} rx={80} ry={16} fill="#FF8FB1" />
    <ellipse cx={430} cy={500} rx={80} ry={16} fill="#FFC1D3" />
    {T.stand.map(([a, b, it], i) => {
      if (f < a - 2 || f >= b) return null;
      const grow = it === 'trophy' || it === 'medal' || it === 'ticket';
      const drop = k(f, a, a + 10, EB);
      const out = b >= LAST ? 0 : k(f, b - 8, b, EI);
      const y = lerp(-180, 426, drop) + out * 40;
      const sc = grow ? lerp(0.3, 1.25, k(f, a, a + 14, EB)) * (1 - out * 0.6) : 1 - out * 0.6;
      const ty = grow ? lerp(470, 400, k(f, a, a + 14, EO)) : y;
      const show = it === 'gift' ? PLAQ.find((s) => s.start === a) : undefined;
      const shake = show ? Math.sin(f * 1.6) * 6 * (show.shake ?? []).reduce((m, t) => Math.max(m, bell((f - t) / 10)), 0) : 0;
      const ghosts = !grow && drop > 0 && drop < 0.9 ? [3, 2, 1] : [];
      const open = show ? k(f, (show.hit as number) - 4, (show.hit as number) + 6, EO) : 0;
      return (
        <g key={i} opacity={1 - out}>
          {ghosts.map((g) => (
            <g key={g} transform={`translate(430 ${lerp(-180, 426, k(f - g * 1.2, a, a + 10, EB))})`} opacity={0.12 * (4 - g)}>
              <Item k={it} />
            </g>
          ))}
          <g transform={`translate(${430 + shake} ${ty}) scale(${sc})`}>
            <Item k={it} open={open} />
          </g>
        </g>
      );
    })}
    {/* 關鍵字小物一起站上台 */}
    {f >= CB.at && f < CB.back + 10 &&
      KW_ICONS.map((it, i) => {
        const p = k(f, CB.at + i * 4, CB.at + i * 4 + 10, EB);
        const out = k(f, CB.back, CB.back + 10, EI);
        const n = KW_ICONS.length;
        return (
          <g key={i} transform={`translate(${430 + (i - (n - 1) / 2) * 60} ${lerp(500, 430, p)}) scale(${0.5 * p * (1 - out)})`}>
            <Item k={it} />
          </g>
        );
      })}
  </svg>
);

/* ───────── 手機畫面 ───────── */
const Phone: React.FC<{f: number; clipY: number}> = ({f, clipY}) => {
  const dp = dogPose(f);
  const rise = f < LIVE ? 1 : 1 - sp(f, LIVE, 11, 180);
  const uiOut = k(f, E, E + 16, EI);
  const v = viewers(f);
  const revealed = f >= RV.slam && D.badge;
  return (
    <div style={{position: 'absolute', left: PX, top: PY, width: PW, height: PH, borderRadius: 44, overflow: 'hidden'}}>
      {/* 直播間背景 */}
      <svg style={{position: 'absolute', left: 0, top: 0}} width={PW} height={PH}>
        <defs>
          <linearGradient id="ajst" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#FFD6C2" />
            <stop offset="0.55" stopColor="#FFB3C6" />
            <stop offset="1" stopColor="#FF8FB1" />
          </linearGradient>
        </defs>
        <rect width={PW} height={PH} fill="url(#ajst)" />
        <path d="M70 560 L 70 300 A 200 200 0 0 1 470 300 L 470 560 Z" fill="#FFE8DA" opacity={0.7} />
        {Array.from({length: 9}, (_, i) => (
          <path key={i} d={`M${20 + i * 60} 216 l 30 46 l 30 -46 Z`} fill={['#FFD45C', '#FF8FB1', '#9EDCF0'][i % 3]} opacity={0.9} />
        ))}
        <path d="M0 214 Q 270 236 540 214" fill="none" stroke="#fff" strokeWidth={4} />
        {[[60, 380, 24], [480, 340, 30], [110, 470, 16], [500, 610, 20]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.35} />
        ))}
      </svg>
      {/* 主播 */}
      <svg style={{position: 'absolute', left: 0, top: 0}} width={PW} height={PH}>
        <g transform={`translate(196 ${566 + rise * 420})`}>
          <Dog p={dp} />
        </g>
        {/* 櫃台 */}
        <rect x={0} y={560} width={PW} height={420} fill="#FFF2EA" />
        <rect x={0} y={560} width={PW} height={14} fill="#FFC9B4" />
        {Array.from({length: 7}, (_, i) => (
          <g key={i} transform={`translate(${40 + i * 78} ${640 + (i % 2) * 70})`} fill="#FFD3DF">
            <ellipse cx={0} cy={6} rx={12} ry={10} />
            <circle cx={-12} cy={-8} r={5} />
            <circle cx={-4} cy={-15} r={5} />
            <circle cx={6} cy={-15} r={5} />
            <circle cx={13} cy={-7} r={5} />
          </g>
        ))}
      </svg>
      <Stand f={f} />
      {/* 介面 */}
      <div style={{position: 'absolute', inset: 0, opacity: 1 - uiOut}}>
        {/* 主播資訊 */}
        <div style={{position: 'absolute', left: 16, top: 26, height: 64, padding: '0 22px 0 6px', borderRadius: 32, background: 'rgba(90,40,64,0.32)', display: 'flex', alignItems: 'center', gap: 10}}>
          <svg width={54} height={54} viewBox="-120 -330 240 240">
            <circle cx={0} cy={-232} r={118} fill="#FFF4E3" />
            <Dog p={{blink: 0, tail: 0, tilt: 0, arm: 0, bark: 0, look: 0, hop: 0, squash: 0}} />
          </svg>
          <span style={{fontFamily: ZM, fontWeight: 900, fontSize: D.titleSize, color: '#fff', whiteSpace: 'nowrap'}}>{D.title}</span>
        </div>
        <svg style={{position: 'absolute', left: 476, top: 32}} width={52} height={52} viewBox="0 0 52 52">
          <circle cx={26} cy={26} r={24} fill="rgba(90,40,64,0.32)" />
          <path d="M18 18 L 34 34 M34 18 L 18 34" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
        </svg>
        {/* LIVE＋觀看人數 */}
        <div style={{position: 'absolute', left: 16, top: 100, display: 'flex', alignItems: 'center', gap: 8}}>
          <div style={{background: GRAD, color: '#fff', fontFamily: FR, fontWeight: 700, fontSize: 28, padding: '2px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{width: 12, height: 12, borderRadius: 6, background: '#fff', opacity: 0.5 + 0.5 * (Math.floor(f / 15) % 2)}} />
            LIVE
          </div>
          <div style={{background: 'rgba(90,40,64,0.32)', color: '#fff', fontFamily: FR, fontWeight: 600, fontSize: 30, padding: '2px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8}}>
            <svg width={28} height={20} viewBox="0 0 28 20">
              <path d="M2 10 Q 14 -4 26 10 Q 14 24 2 10 Z" fill="#fff" />
              <circle cx={14} cy={10} r={5} fill={PINK} />
            </svg>
            <RollNum a={v.a} b={v.b} p={v.p} />
          </div>
          {revealed && (
            <div style={{background: '#fff', color: PINK, fontFamily: ZM, fontWeight: 900, fontSize: 28, padding: '2px 12px', borderRadius: 10, whiteSpace: 'nowrap', transform: `scale(${k(f, RV.slam, RV.slam + 10, EB)})`}}>
              {D.badge}
            </div>
          )}
        </div>
        <div style={{position: 'absolute', left: 0, top: 0, width: PW, height: PH, WebkitMaskImage: `linear-gradient(to bottom, #000 0, #000 ${clipY - 70}px, transparent ${clipY}px)`, maskImage: `linear-gradient(to bottom, #000 0, #000 ${clipY - 70}px, transparent ${clipY}px)`}}>
          <Notice f={f} />
          {f >= CB.at && f < T.pinnedEnd && (
            <div
              style={{
                position: 'absolute', left: 16, top: 150, height: 52, padding: '0 18px', borderRadius: 14, background: 'rgba(255,255,255,0.92)', color: PLUM,
                display: 'flex', alignItems: 'center', gap: 10, fontFamily: ZM, fontWeight: 900, fontSize: D.pinnedSize, whiteSpace: 'nowrap',
                transform: `translateY(${(1 - k(f, CB.at, CB.at + 8, EB)) * -70}px)`, opacity: 1 - k(f, T.pinnedEnd - 10, T.pinnedEnd),
              }}
            >
              <span style={{background: GRAD, color: '#fff', fontSize: 28, padding: '0 10px', borderRadius: 8}}>{U.pinned}</span>
              {D.pinned}
            </div>
          )}
          <ProductCard f={f} />
          <Comments f={f} />
          <PhoneHearts f={f} />
        </div>
        {/* 底部列（靜止） */}
        <div style={{position: 'absolute', left: 16, top: 872, width: 300, height: 56, borderRadius: 28, background: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', paddingLeft: 22, fontFamily: ZM, fontWeight: 700, fontSize: 28, color: 'rgba(90,40,64,0.7)', whiteSpace: 'nowrap', overflow: 'hidden'}}>
          {U.say}
        </div>
        <svg style={{position: 'absolute', left: 330, top: 868}} width={200} height={64} viewBox="0 0 200 64">
          <circle cx={30} cy={32} r={28} fill="rgba(255,255,255,0.45)" />
          <path d="M18 24 H42 L39 44 H21 Z" fill="#fff" />
          <circle cx={84} cy={32} r={28} fill="rgba(255,255,255,0.45)" />
          <rect x={72} y={28} width={24} height={16} fill="#fff" />
          <rect x={70} y={22} width={28} height={7} fill="#fff" />
          <circle cx={152} cy={32} r={32} fill={PINK} />
          <path d={HEART} fill="#fff" transform="translate(152 22) scale(0.55)" />
        </svg>
      </div>
      <IntroScreen f={f} />
      <EndScreen f={f} />
    </div>
  );
};

/* 開播前倒數 */
const IntroScreen: React.FC<{f: number}> = ({f}) => {
  if (f >= LIVE + 6) return null;
  const out = k(f, LIVE - 12, LIVE + 6, EIO);
  let n = '';
  let pop = 0;
  T.countdown.forEach((c, i) => {
    if (f >= c) {
      n = String(3 - i);
      pop = k(f, c, c + 8, EB);
    }
  });
  return (
    <div style={{position: 'absolute', inset: 0, background: GRAD, transform: `translateY(${-out * 100}%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 170, gap: 26}}>
      <svg width={220} height={220} viewBox="-130 -350 260 260">
        <circle cx={0} cy={-220} r={128} fill="#FFF4E3" />
        <Dog p={{blink: (f % 70) < 5 ? 1 : 0, tail: 0, tilt: Math.sin(f * 0.08) * 6, arm: 0, bark: 0, look: 0, hop: 0, squash: 0}} />
      </svg>
      <div style={{fontFamily: ZM, fontWeight: 900, fontSize: D.introSize, color: '#fff', whiteSpace: 'nowrap'}}>{D.title}</div>
      <div style={{fontFamily: ZM, fontWeight: 700, fontSize: 40, color: '#fff', opacity: 0.9, whiteSpace: 'nowrap'}}>{U.soon}</div>
      <div style={{width: 210, height: 210, borderRadius: 105, background: 'rgba(255,255,255,0.25)', border: '8px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 20}}>
        {n ? (
          <span style={{fontFamily: FR, fontWeight: 700, fontSize: 150, color: '#fff', transform: `scale(${0.4 + 0.6 * pop})`, lineHeight: 1}}>{n}</span>
        ) : (
          <svg width={120} height={120} viewBox="-60 -60 120 120">
            <circle r={44} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={12} />
            <path d="M0 -44 A 44 44 0 0 1 44 0" fill="none" stroke="#fff" strokeWidth={12} strokeLinecap="round" transform={`rotate(${f * 9})`} />
          </svg>
        )}
      </div>
    </div>
  );
};

/* 直播結束：卡片翻面變成名稱 */
const EndScreen: React.FC<{f: number}> = ({f}) => {
  if (f < E) return null;
  const ed = D.end;
  const drop = k(f, E + 6, E + 22, EB);
  const flip = k(f, T.end.logo, T.end.logo + 14, EIO);
  const sy = Math.abs(Math.cos(flip * Math.PI));
  const back = flip > 0.5;
  const bub = k(f, T.end.bye, T.end.bye + 12, EB);
  return (
    <>
      <div
        style={{
          position: 'absolute', left: 30, top: 590, width: 480, height: 270, borderRadius: 34, background: '#fff', boxShadow: '0 16px 40px rgba(160,40,80,0.3)',
          transform: `translateY(${(1 - drop) * 420}px) scaleY(${sy})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}
      >
        {!back ? (
          <>
            <div style={{fontFamily: ZM, fontWeight: 900, fontSize: 60, color: PINK, whiteSpace: 'nowrap'}}>{U.ended}</div>
            <div style={{fontFamily: ZM, fontWeight: 700, fontSize: 46, color: PLUM, whiteSpace: 'nowrap'}}>{U.thanks}</div>
          </>
        ) : (
          <>
            <div style={{fontFamily: ZM, fontWeight: 900, fontSize: ed.cardNameSize, color: PLUM, letterSpacing: ed.cardNameSize * 0.04, lineHeight: 1.1, whiteSpace: 'nowrap'}}>{ed.name}</div>
            {ed.sub && <div style={{fontFamily: ZM, fontWeight: 900, fontSize: ed.subSize, color: '#fff', background: GRAD, padding: '4px 26px', borderRadius: 40, whiteSpace: 'nowrap'}}>{ed.sub}</div>}
          </>
        )}
      </div>
      {f >= T.end.bye && (
        <div
          style={{
            position: 'absolute', left: 150, top: 132, padding: '8px 24px', borderRadius: 30, background: '#fff', fontFamily: ZM, fontWeight: 900, fontSize: 46, color: PINK,
            transform: `scale(${bub})`, transformOrigin: 'left center', whiteSpace: 'nowrap', boxShadow: '0 8px 20px rgba(160,40,80,0.25)',
          }}
        >
          {U.bye}
        </div>
      )}
    </>
  );
};

/* ───────── 螢幕空間的「跳出手機」貼紙 ───────── */
const Sticker: React.FC<{text: string; x: number; y: number; sc: number; rot: number; op: number; it?: ItemKind; size?: number}> = ({text, x, y, sc, rot, op, it, size = 130}) => (
  <div
    style={{
      position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${sc})`, opacity: op,
      background: '#fff', borderRadius: 40, padding: '18px 40px 22px 26px', display: 'flex', alignItems: 'center', gap: 14,
      border: `10px solid ${PINK}`, boxShadow: '0 18px 40px rgba(200,60,100,0.28)', whiteSpace: 'nowrap',
    }}
  >
    {it && (
      <svg width={size * 1.05} height={size * 1.05} viewBox="-90 -90 180 180">
        <Item k={it} />
      </svg>
    )}
    <span style={{fontFamily: ZM, fontWeight: 900, fontSize: size, lineHeight: 1.05, background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{text}</span>
  </div>
);
/* 從手機裡的展示台飛出去，留 3 層殘影 */
type Pt = {x: number; y: number};
const flyPos = (f: number, a: number, from: Pt, to: Pt, back?: number, backTo?: Pt) => {
  const p = k(f, a, a + 14, EO);
  let x = lerp(from.x, to.x, p);
  let y = lerp(from.y, to.y, p) - bell(p) * 80;
  let sc = lerp(0.2, 1, k(f, a, a + 14, EB));
  if (back !== undefined && backTo) {
    const q = k(f, back, back + 12, EI);
    x = lerp(x, backTo.x, q);
    y = lerp(y, backTo.y, q);
    sc *= 1 - q * 0.85;
  }
  return {x, y, sc};
};
/* 匾額（獎盃、獎牌、優惠券）：右側飛出 */
const Plaque: React.FC<{s: Show; x: number; y: number; p: number; op: number}> = ({s, x, y, p, op}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${0.3 + 0.7 * p}) rotate(-3deg)`, opacity: op, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
    {s.top && <div style={{fontFamily: ZM, fontWeight: 900, fontSize: s.topSize, color: '#fff', background: GRAD, padding: '6px 30px', borderRadius: 18, whiteSpace: 'nowrap'}}>{s.top}</div>}
    {s.main && <div style={{fontFamily: ZM, fontWeight: 900, fontSize: s.mainSize, color: PLUM, whiteSpace: 'nowrap'}}>{s.main}</div>}
    <div style={{position: 'relative', padding: '0 30px'}}>
      <div style={{position: 'absolute', inset: '-10px -20px', background: 'radial-gradient(closest-side, rgba(255,226,122,0.95), rgba(255,226,122,0))'}} />
      <div style={{position: 'relative', fontFamily: ZM, fontWeight: 900, fontSize: s.bigSize, lineHeight: 1.05, color: '#E8A81C', WebkitTextStroke: '6px #fff', paintOrder: 'stroke fill', whiteSpace: 'nowrap'}}>{s.big}</div>
    </div>
  </div>
);
/* 證書卡片：左側甩進來、印章砸下 */
const CertCard: React.FC<{s: Show; x: number; y: number; op: number}> = ({s, x, y, op}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 580, height: 420, transform: 'translate(-50%,-50%) rotate(-4deg)', opacity: op, background: '#FFFBF2', border: '12px solid #E7B86A', borderRadius: 26, boxShadow: '0 18px 40px rgba(160,90,40,0.25)'}}>
    {s.top && <div style={{position: 'absolute', left: 0, right: 0, top: 44, textAlign: 'center', fontFamily: ZM, fontWeight: 900, fontSize: s.topSize, color: '#B07A2A', letterSpacing: s.topSize * 0.1, whiteSpace: 'nowrap'}}>{s.top}</div>}
    <div style={{position: 'absolute', left: 0, right: 0, top: 168 - s.mainSize * 0.55, textAlign: 'center', fontFamily: ZM, fontWeight: 900, fontSize: s.mainSize, color: PLUM, whiteSpace: 'nowrap'}}>{s.main}</div>
    <div style={{position: 'absolute', left: 60, right: 60, top: 240, height: 10, borderRadius: 5, background: '#F2C9A8'}} />
    <div style={{position: 'absolute', left: 60, width: 260, top: 270, height: 10, borderRadius: 5, background: '#F2C9A8'}} />
  </div>
);
const ARLayer: React.FC<{f: number}> = ({f}) => {
  const c = camFull(f);
  const st = toScreen(c, PX + 430, PY + 420);
  const out: React.ReactNode[] = [];
  T.stickers.forEach((s, i) => {
    if (f < s.a || f > CB.back + 16) return;
    const to = {x: s.to[0], y: s.to[1]};
    const beatHop = f >= CB.at ? bell((f - (CB.at + i * 5)) / 8) * 0.18 : 0;
    const ghostN = f - s.a < 14 || f > CB.back - 2 ? 3 : 0;
    for (let g = ghostN; g >= 1; g--) {
      const q = flyPos(f - g * 1.6, s.a, st, to, CB.back, st);
      out.push(<Sticker key={`${i}g${g}`} text={s.word} it={s.icon} size={s.size} x={q.x} y={q.y} sc={q.sc} rot={s.rot} op={0.14 * (4 - g)} />);
    }
    const q = flyPos(f, s.a, st, to, CB.back, st);
    out.push(<Sticker key={i} text={s.word} it={s.icon} size={s.size} x={q.x} y={q.y} sc={q.sc * (1 + beatHop)} rot={s.rot + Math.sin(f * 0.12 + i) * 2} op={1} />);
  });
  // × 號：全部一起
  if (f >= CB.at && f < CB.back + 6) {
    const p = k(f, CB.at + 6, CB.at + 16, EB) * (1 - k(f, CB.back - 4, CB.back + 6, EI));
    T.xs.forEach(([x, y], i) =>
      out.push(
        <div key={`x${i}`} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${p}) rotate(${(i ? -f : f) * 2}deg)`, fontFamily: FR, fontWeight: 700, fontSize: 120, color: i ? PEACH : PINK}}>×</div>,
      ),
    );
  }
  T.shows.forEach((s, si) => {
    if (s.kind !== 'cert') {
      // 匾額（右側）
      const h = s.hit as number;
      const a = h + 6;
      const ex0 = s.exit as number;
      if (f < a || f >= ex0 + 26) return;
      const p = k(f, a, a + 16, EB);
      const ex = k(f, ex0, ex0 + 20, EI);
      const x = lerp(st.x, 1560, k(f, a, a + 16, EO)) + ex * 900;
      const y = lerp(st.y, 430, k(f, a, a + 16, EO));
      if (ex > 0.05) [3, 2, 1].forEach((g) => out.push(<Plaque key={`pg${si}${g}`} s={s} x={x - g * 60 * ex} y={y} p={p} op={0.12 * (4 - g)} />));
      out.push(<Plaque key={`pl${si}`} s={s} x={x} y={y} p={p} op={1} />);
    } else {
      // 證書（左側，從左邊甩進來）
      const a = s.in as number;
      if (f < a || f >= s.out + 14) return;
      const p = k(f, a, a + 14, EO);
      const ex = k(f, s.out, s.out + 14, EI);
      const x = lerp(-500, 370, p) - ex * 900;
      const y = 450;
      const sa = s.stampAt as number;
      const stamp = k(f, sa - 6, sa, EI);
      const settle = k(f, sa, sa + 10, EO);
      if (p < 0.9) [3, 2, 1].forEach((g) => out.push(<CertCard key={`cg${si}${g}`} s={s} x={lerp(-500, 370, k(f - g * 1.6, a, a + 14, EO))} y={y} op={0.12 * (4 - g)} />));
      if (ex > 0.05) [3, 2, 1].forEach((g) => out.push(<CertCard key={`ce${si}${g}`} s={s} x={x + g * 70 * ex} y={y} op={0.12 * (4 - g)} />));
      out.push(<CertCard key={`cert${si}`} s={s} x={x} y={y} op={1} />);
      if (s.stamp && f >= sa - 6) {
        const sc = lerp(2.4, 1, stamp) * (1 + 0.08 * bell(settle));
        out.push(
          <div key={`stamp${si}`} style={{position: 'absolute', left: x + 170, top: y + 120, width: 210, height: 210, borderRadius: 105, border: '12px solid #FF3B5C', transform: `translate(-50%,-50%) rotate(-14deg) scale(${sc})`, opacity: Math.min(1, stamp * 1.5), display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)'}}>
            <span style={{fontFamily: ZM, fontWeight: 900, fontSize: s.stampSize, color: '#FF3B5C', whiteSpace: 'nowrap'}}>{s.stamp}</span>
          </div>,
        );
      }
    }
  });
  return <>{out}</>;
};

/* ───────── 高潮：人數爆表、愛心與留言滿出手機 ───────── */
const ClimaxLayer: React.FC<{f: number}> = ({f}) => {
  if (f < C || f >= E + 30) return null;
  const c = camFull(f);
  const btn = toScreen(c, PX + 482, PY + 850);
  const fade = 1 - k(f, E, E + 24, EI);
  const out: React.ReactNode[] = [];
  // 愛心噴出手機
  const hs: React.ReactNode[] = [];
  for (let s = C + 4; s < E; s += 1) {
    const t = (f - s) / 60;
    if (t < 0 || t >= 1) continue;
    const seed = s * 31;
    const ang = -Math.PI / 2 + rnd(seed) * 1.5;
    const dist = (500 + rnd01(seed + 1) * 900) * EO(Math.min(1, t * 1.3));
    const x = btn.x + Math.cos(ang) * dist + Math.sin(t * 6 + seed) * 20;
    const y = btn.y + Math.sin(ang) * dist * 0.75 - t * 120;
    const sc = (0.8 + rnd01(seed + 2) * 1.8) * Math.min(1, t * 5);
    const op = (1 - k(t, 0.7, 1, (q) => q)) * fade;
    if (t < 0.25) {
      for (let g = 1; g <= 2; g++) {
        const t2 = Math.max(0, t - g * 0.025);
        const d2 = (500 + rnd01(seed + 1) * 900) * EO(Math.min(1, t2 * 1.3));
        hs.push(<path key={`${s}g${g}`} d={HEART} fill={HCOL[s % 5]} opacity={op * 0.2} transform={`translate(${btn.x + Math.cos(ang) * d2} ${btn.y + Math.sin(ang) * d2 * 0.75 - t2 * 120}) scale(${sc})`} />);
      }
    }
    hs.push(<path key={s} d={HEART} fill={HCOL[s % 5]} opacity={op} transform={`translate(${x} ${y}) scale(${sc}) rotate(${rnd(seed + 3) * 20})`} />);
  }
  out.push(
    <svg key="hearts" style={{position: 'absolute', left: 0, top: 0}} width={1920} height={1080}>
      {hs}
    </svg>,
  );
  // 留言飛出來（右側往上飄；寬的留言往左收，不超出畫面）
  const span = E - C;
  T.flying.forEach((txt, i) => {
    const s = C + 10 + Math.round((i * (span - 40)) / T.flying.length);
    const t = (f - s) / 70;
    if (t < 0 || t >= 1) return;
    const w = Array.from(txt).reduce((m, ch) => m + (ch.charCodeAt(0) >= 0x2e80 ? 36 : 22), 0) + 40;
    const x = Math.min(1330 + (i % 3) * 235, 1890 - w / 2) + Math.sin(t * 3 + i) * 14;
    const y = 820 - EO(t) * 560 - (i % 3) * 40;
    const op = Math.min(1, t * 6) * (1 - k(t, 0.75, 1, (q) => q)) * fade;
    out.push(
      <div key={`c${i}`} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${0.6 + 0.4 * Math.min(1, t * 5)})`, opacity: op, background: 'rgba(255,255,255,0.9)', borderRadius: 30, padding: '6px 20px', fontFamily: ZM, fontWeight: 900, fontSize: 36, color: PLUM, whiteSpace: 'nowrap', boxShadow: '0 8px 20px rgba(200,60,100,0.2)'}}>
        {txt}
      </div>,
    );
  });
  // 觀看人數大計數器（左側）
  const p = k(f, C + 4, C + 18, EB);
  const v = viewers(f, 5);
  const boom = k(f, BOOM, BOOM + 12, EB);
  out.push(
    <div key="cnt" style={{position: 'absolute', left: 400, top: 380, transform: `translate(-50%,-50%) scale(${(0.3 + 0.7 * p) * (1 + 0.1 * bell(boom))}) rotate(-3deg)`, opacity: fade, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
      <div style={{fontFamily: ZM, fontWeight: 900, fontSize: 52, color: '#fff', background: GRAD, padding: '6px 30px', borderRadius: 40, whiteSpace: 'nowrap'}}>{U.viewers}</div>
      <div style={{fontFamily: FR, fontWeight: 700, fontSize: 128, color: PINK, background: '#fff', padding: '4px 30px 10px', borderRadius: 30, boxShadow: '0 18px 40px rgba(200,60,100,0.28)'}}>
        <RollNum a={v.a} b={v.b} p={v.p} />
      </div>
      {f >= BOOM && (
        <div style={{fontFamily: ZM, fontWeight: 900, fontSize: 84, color: '#fff', WebkitTextStroke: `14px ${PINK}`, paintOrder: 'stroke fill', transform: `scale(${boom}) rotate(4deg)`, whiteSpace: 'nowrap'}}>{U.boom}</div>
      )}
    </div>,
  );
  return <>{out}</>;
};

/* ───────── 牆上招牌（揭曉＆收尾），世界座標 ───────── */
const neonAt = (f: number, a: number) => {
  // 霓虹燈點亮：先閃兩下（小面積）再穩定
  if (f < a) return 0.12;
  const d = f - a;
  if (d < 4) return 1;
  if (d < 8) return 0.25;
  if (d < 11) return 1;
  if (d < 14) return 0.35;
  return 1;
};
const Neon: React.FC<{f: number; text: string; size: number; y: number; a: number; col: string}> = ({f, text, size, y, a, col}) => {
  const n = neonAt(f, a);
  return (
    <div style={{position: 'absolute', left: 1560, width: 1200, top: y, textAlign: 'center'}}>
      <div style={{position: 'absolute', left: 150, right: 150, top: -size * 0.3, height: size * 1.6, background: `radial-gradient(closest-side, ${col}66, ${col}00)`, opacity: n}} />
      <span style={{position: 'relative', fontFamily: ZM, fontWeight: 900, fontSize: size, lineHeight: 1.1, color: n > 0.5 ? '#FFF6FA' : '#F2D7DF', WebkitTextStroke: `${size * 0.06}px ${n > 0.5 ? col : '#EAC6D0'}`, paintOrder: 'stroke fill', textShadow: n > 0.5 ? `0 0 ${size * 0.15}px ${col}` : 'none', whiteSpace: 'nowrap', letterSpacing: size * 0.04}}>
        {text}
      </span>
    </div>
  );
};
/* 斜標章：Ft.、×、＋ 這類連接符號用黃色英數字 */
const TagText: React.FC<{text: string; size: number}> = ({text, size}) => (
  <>
    {text.split(/(Ft\.|ft\.|×|＋|\+|&)/).filter((x) => x !== '').map((part, i) =>
      /^(Ft\.|ft\.|×|＋|\+|&)$/.test(part) ? (
        <span key={i} style={{fontFamily: FR, fontWeight: 700, fontSize: size * 0.75, color: '#FFE27A', margin: `0 ${size * 0.12}px`}}>{part}</span>
      ) : (
        <span key={i} style={{fontFamily: ZM, fontWeight: 900, fontSize: size, color: '#fff', whiteSpace: 'pre'}}>{part}</span>
      ),
    )}
  </>
);
const SignLayer: React.FC<{f: number}> = ({f}) => {
  const r = D.reveal;
  const ed = D.end;
  const out: React.ReactNode[] = [];
  const on1 = f < LIVE - 10 || (f >= RV.start - 20 && f < RV.back + 32);
  if (on1) {
    const fo = Math.min(1 - k(f, RV.back + 4, RV.back + 30), f < LIVE - 10 ? 1 - k(f, LIVE - 30, LIVE - 10) : k(f, RV.start - 20, RV.start));
    const l0 = k(f, RV.pre, RV.pre + 12, EB);
    const l2 = k(f, RV.post, RV.post + 12, EB);
    const slam = k(f, RV.slam - 4, RV.slam + 4, EI);
    out.push(
      <div key="r" style={{opacity: fo}}>
        {r.pre && f >= RV.pre && <div style={{position: 'absolute', left: 1560, width: 1200, top: 160 + (84 - r.preSize) * 0.5, textAlign: 'center', fontFamily: ZM, fontWeight: 900, fontSize: r.preSize, color: PLUM, transform: `scale(${l0})`, whiteSpace: 'nowrap'}}>{r.pre}</div>}
        <Neon f={f} text={r.name} size={r.nameSize} y={268 + (210 - r.nameSize) * 0.55} a={RV.sign} col={PINK} />
        {r.post && f >= RV.post && <div style={{position: 'absolute', left: 1560, width: 1200, top: 518 + (84 - r.postSize) * 0.5, textAlign: 'center', fontFamily: ZM, fontWeight: 900, fontSize: r.postSize, color: PLUM, transform: `scale(${l2})`, whiteSpace: 'nowrap'}}>{r.post}</div>}
        {r.tag && f >= RV.slam - 4 && (
          <div style={{position: 'absolute', left: 2160, top: 740, transform: `translate(-50%,-50%) scale(${lerp(2.2, 1, slam)}) rotate(-3deg)`, opacity: slam, background: GRAD, borderRadius: 70, padding: '14px 60px 20px', whiteSpace: 'nowrap', boxShadow: '0 20px 50px rgba(200,60,100,0.35)', display: 'flex', alignItems: 'baseline'}}>
            <TagText text={r.tag} size={r.tagSize} />
          </div>
        )}
      </div>,
    );
  }
  if (f >= E + 24) {
    const l1 = k(f, T.end.slogan, T.end.slogan + 14, EB);
    const l2 = k(f, T.end.url, T.end.url + 14, EB);
    out.push(
      <div key="e">
        <Neon f={f} text={ed.name} size={ed.nameSize} y={170 + (250 - ed.nameSize) * 0.6} a={T.end.sign} col={PINK} />
        {ed.slogan && f >= T.end.slogan && (
          <div style={{position: 'absolute', left: 1560, width: 1200, top: 500, textAlign: 'center', fontFamily: ZM, fontWeight: 900, fontSize: ed.sloganSize, color: PLUM, transform: `scale(${l1})`, whiteSpace: 'pre'}}>{ed.slogan}</div>
        )}
        {ed.url && f >= T.end.url && (
          <div style={{position: 'absolute', left: 2160, top: 700, transform: `translate(-50%,-50%) scale(${l2})`, background: GRAD, color: '#fff', fontFamily: FR, fontWeight: 600, fontSize: ed.urlSize, padding: '8px 50px 12px', borderRadius: 60, whiteSpace: 'nowrap'}}>
            {ed.url}
          </div>
        )}
      </div>,
    );
  }
  return <>{out}</>;
};

/* ───────── 主元件 ───────── */
export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const c = camFull(f);
  const cb = camFull(Math.min(LAST, f + 6)); // 背景早一拍先動
  // 手機動態層的裁切線：螢幕 y=880 對應的手機內 y（最下面 200 像素不放會動的東西）
  const clipY = (880 - 540 - c.sy) / c.S + c.cy - PY;
  // 甩鏡時手機的殘影
  const ghosts: React.ReactNode[] = [];
  const c1 = camFull(Math.max(0, f - 2));
  const speed = Math.hypot((c.cx - c1.cx) * c.S, (c.cy - c1.cy) * c.S) + Math.abs(c.S - c1.S) * 900;
  if (speed > 18) {
    for (let g = 4; g >= 1; g--) {
      const cg = camFull(Math.max(0, f - g * 1.2));
      const a = toScreen(cg, PX - 18, PY - 18);
      ghosts.push(<div key={g} style={{position: 'absolute', left: a.x, top: a.y, width: (PW + 36) * cg.S, height: (PH + 36) * cg.S, borderRadius: 62 * cg.S, background: '#FF8FB1', opacity: 0.1 * (5 - g)}} />);
    }
  }
  const ringGlow = f >= LIVE ? 0.6 + 0.4 * pulse(f, B, 0.4) * (f >= C && f < E ? 1 : 0.4) : 0.3;
  return (
    <AbsoluteFill style={{background: '#FFE3D3', overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      {/* 遠景牆面（早一拍） */}
      <AbsoluteFill style={{transform: camTransform(cb), transformOrigin: '0 0'}}>
        <Wall />
        <SignLayer f={f} />
      </AbsoluteFill>
      {/* 甩鏡殘影 */}
      <AbsoluteFill>{ghosts}</AbsoluteFill>
      {/* 前景：環形燈、手機、桌面 */}
      <AbsoluteFill style={{transform: camTransform(c), transformOrigin: '0 0'}}>
        <RingLight glow={ringGlow} />
        <div style={{position: 'absolute', left: PX - 18, top: PY - 18, width: PW + 36, height: PH + 36, borderRadius: 62, background: '#2E2438', boxShadow: '0 30px 60px rgba(120,40,70,0.35)'}} />
        <Phone f={f} clipY={clipY} />
        <div style={{position: 'absolute', left: PX + 200, top: PY + 10, width: 140, height: 26, borderRadius: 13, background: '#2E2438'}} />
        <Desk />
      </AbsoluteFill>
      {/* 跳出手機的貼紙（最下面 200 像素淡出） */}
      <AbsoluteFill style={{WebkitMaskImage: 'linear-gradient(to bottom, #000 0, #000 820px, transparent 880px)', maskImage: 'linear-gradient(to bottom, #000 0, #000 820px, transparent 880px)'}}>
        <ARLayer f={f} />
        <ClimaxLayer f={f} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
