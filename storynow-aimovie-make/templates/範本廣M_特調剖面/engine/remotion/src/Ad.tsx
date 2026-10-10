/* 廣M 特調剖面：一只空杯從落在吧台到變成一杯完整的特調剖面圖。
   每一層倒進杯子時，左邊大標註「步驟＋名稱＋份量＋一句小字」用細線指向杯中那一層；倒完縮成右邊的小標籤釘在那一層，
   最後杯子變成一張完整的剖面圖。鏡頭沿著同一條吧台往右推到黑板收尾。畫面上的字與事件時間全部讀 timeline.json。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {FRE, KAI} from './fonts';
import {EO, k, lerp, MaskLine} from './kit';
import {
  bands, C, cam, camCss, cube, D, GARNISH, GX, ICE_T, ink, innerHW, isPour, level, MK, POURS, REACT, REACT_C, RIM_Y, slideX, Step, STEPS, surfY, yOf,
} from './model';
import {
  Background, Board, BOARD, Counter, FloatSpoon, GlassBack, GlassFront, GlassGhosts, glassTf, Ice, Lemon, Liquid, Mint, Splashes, StirSpoon, Straw, Streams, Vessels,
} from './parts';
import {pp} from './model';
import T from './timeline.json';

const LX = 150; // 左側大標註的左緣（世界座標）
const LY = 290;
const TAG_X = GX + 262;

/** 數字、英數用 Fredoka，其他用霞鶩文楷 */
const Mixed: React.FC<{text: string; numW?: number}> = ({text, numW = 600}) => (
  <>
    {text.split(/([0-9A-Za-z.:/%+\-@~～]+)/).map((p, i) =>
      p === '' ? null : /^[0-9A-Za-z.:/%+\-@~～]+$/.test(p) ? (
        <span key={i} style={{fontFamily: FRE, fontWeight: numW}}>{p}</span>
      ) : (
        <span key={i}>{p}</span>
      ),
    )}
  </>
);

const Pill: React.FC<{color: string; children: React.ReactNode; size?: number}> = ({color, children, size = 34}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, background: color, color: '#fff', borderRadius: 999, padding: `${size * 0.18}px ${size * 0.6}px`, fontFamily: KAI, fontWeight: 700, fontSize: size, lineHeight: 1.15, whiteSpace: 'nowrap'}}>
    {children}
  </div>
);
const MiniCube: React.FC<{p: number}> = ({p}) => (
  <svg width={52} height={52} viewBox="-30 -30 60 60" style={{transform: `scale(${p})`, opacity: Math.min(1, p * 2)}}>
    <rect x={-24} y={-22} width={48} height={44} rx={10} fill="#DDF0FA" stroke={C.ice} strokeWidth={4} />
    <rect x={-15} y={-14} width={18} height={9} rx={4} fill="#fff" />
  </svg>
);
const GARNISH_DOT = [C.lemon, C.mint, '#2FB3A8'];

/* ───── 左邊大標註 ───── */
const StepCallout: React.FC<{f: number; s: Step; n: number}> = ({f, s, n}) => {
  if (f < s.from - 2 || f > s.to + 2) return null;
  const t = f - s.from;
  const out = k(f, s.to - 12, s.to, (x) => x * x);
  const P = (d: number) => k(t, d, d + 14, EO);
  const col = ink(s.color);
  const prog = isPour(s) ? pp(f, s.pour) : 0;
  const noteAt = s.amount ? 14 : 10;
  return (
    <div style={{position: 'absolute', left: LX, top: LY, width: 580, color: C.ink, whiteSpace: 'nowrap'}}>
      <MaskLine p={P(0)} out={out}>
        <Pill color={col}>
          {D.stepLabel} <span style={{fontFamily: FRE, fontWeight: 600}}>{n}</span>
        </Pill>
      </MaskLine>
      <MaskLine p={P(4)} out={out} style={{marginTop: 10}}>
        <div style={{fontFamily: KAI, fontWeight: 700, fontSize: s.nameSize, lineHeight: 1.12}}>{s.name}</div>
      </MaskLine>
      {s.amount && (
        <MaskLine p={P(8)} out={out}>
          <div style={{fontFamily: FRE, fontWeight: 600, fontSize: s.amountSize, lineHeight: 1.05, color: col, display: 'flex', alignItems: 'baseline', gap: s.amountSize * 0.14}}>
            {s.amount}
            {s.unit && <span style={{fontFamily: /^[\x00-\x7f]+$/.test(s.unit) ? FRE : KAI, fontWeight: /^[\x00-\x7f]+$/.test(s.unit) ? 500 : 700, fontSize: s.amountSize * 0.54}}>{s.unit}</span>}
          </div>
        </MaskLine>
      )}
      {isPour(s) && (
        <div style={{marginTop: 14, width: 440, height: 18, borderRadius: 9, background: '#00000012', overflow: 'hidden', position: 'relative', opacity: P(10) * (1 - out)}}>
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${prog * 100}%`, background: s.color, borderRadius: 9}} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{position: 'absolute', left: `${i * 20}%`, top: 0, bottom: 0, width: 3, background: '#ffffff99'}} />
          ))}
        </div>
      )}
      {s.kind === 'stir' && (
        <MaskLine p={P(8)} out={out}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 6}}>
            <svg width={96} height={96} viewBox="-50 -50 100 100" style={{transform: `rotate(${t * 18}deg)`, flex: 'none'}}>
              <path d="M0,-36 A36,36 0 1 1 -34,12" fill="none" stroke={col} strokeWidth={9} strokeLinecap="round" />
              <polygon points="-46,4 -22,6 -36,26" fill={col} />
            </svg>
            {s.note && <div style={{fontFamily: KAI, fontWeight: 400, fontSize: s.noteSize, lineHeight: 1.3, whiteSpace: 'pre-wrap', width: 460}}>{s.note}</div>}
          </div>
        </MaskLine>
      )}
      {s.kind === 'ice' && (
        <div style={{display: 'flex', gap: 6, marginTop: 10, opacity: 1 - out}}>
          {ICE_T.map((ti, i) => <MiniCube key={i} p={k(f, ti + 2, ti + 10, (x) => 1 + 0.7 * Math.sin(Math.PI * x) * (1 - x) - (1 - x))} />)}
        </div>
      )}
      {s.kind === 'garnish' && s.items.length > 0 && (
        <div style={{marginTop: 4}}>
          {s.items.map(([txt, sz], i) => {
            const at = [s.lemon, (s.mint ?? [0])[0], s.straw][i] as number;
            return (
              <MaskLine key={i} p={k(f, at - 8, at + 4, EO)} out={out}>
                <div style={{display: 'flex', alignItems: 'baseline', gap: 16, fontFamily: KAI, fontWeight: 700, fontSize: sz, lineHeight: 1.3}}>
                  <span style={{display: 'inline-block', width: 22, height: 22, borderRadius: 11, background: GARNISH_DOT[i], transform: 'translateY(-6px)', flex: 'none'}} />
                  <span><Mixed text={txt} /></span>
                </div>
              </MaskLine>
            );
          })}
        </div>
      )}
      {s.note && s.kind !== 'stir' && !(s.kind === 'garnish' && s.items.length) && (
        <MaskLine p={P(noteAt)} out={out} style={{marginTop: 16}}>
          <div style={{fontFamily: KAI, fontSize: s.noteSize, lineHeight: 1.3, whiteSpace: 'pre-wrap', width: 570}}><Mixed text={s.note} numW={500} /></div>
        </MaskLine>
      )}
      {s.react && s.reactAt != null && (
        <MaskLine p={k(f, s.reactAt, s.reactAt + 14, EO)} out={out} style={{marginTop: 8}}>
          <div style={{fontFamily: KAI, fontWeight: 700, fontSize: D.react.size, lineHeight: 1.3, color: ink(REACT_C)}}><Mixed text={D.react.text} /></div>
        </MaskLine>
      )}
    </div>
  );
};

/** 每一層的指線目標（杯內那一層） */
const target = (f: number, idx: number): [number, number] => {
  const s = STEPS[idx];
  const wall = (y: number): [number, number] => [GX - innerHW(y) + 26, y];
  if (isPour(s)) {
    const b = bands(f).find((q) => q.idx === idx);
    if (!b) return wall(Math.min(yOf(level(f)), yOf(4)));
    return wall(yOf(Math.max(b.s + 4, (b.s + b.e) / 2)));
  }
  if (s.kind === 'ice') {
    let best: [number, number] = [GX - 40, RIM_Y + 60];
    ICE_T.forEach((t, i) => {
      const c = cube(f, i);
      if (c && f >= t + 4) best = [c.x - 20, c.y];
    });
    return best;
  }
  if (s.kind === 'stir') return [GX - 60, yOf(level(f) * 0.45)];
  return [GX - 70, Math.min(surfY(f), yOf(10)) - 30];
};

const Leaders: React.FC<{f: number}> = ({f}) => {
  const idx = STEPS.findIndex((q) => f >= q.from && f < q.to);
  if (idx < 0) return null;
  const s = STEPS[idx];
  const p = k(f, s.from + 10, s.from + 24, EO) * (1 - k(f, s.to - 12, s.to));
  if (p <= 0) return null;
  const [tx, ty] = target(f, idx);
  const sx = LX + 600, sy = LY + 210;
  const ex = lerp(sx, tx, p), ey = lerp(sy, ty, p);
  return (
    <g>
      <circle cx={sx - 14} cy={sy} r={7} fill={C.ink} />
      <line x1={sx - 14} y1={sy} x2={ex} y2={ey} stroke={C.ink} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={ex} cy={ey} r={13 * p} fill="#fff" stroke={C.ink} strokeWidth={4} />
      <circle cx={ex} cy={ey} r={5 * p} fill={s.color} />
    </g>
  );
};

/* ───── 右邊的小標籤（倒完後釘在那一層）───── */
type Tag = {idx: number; at: number; slot: number; s: Step};
const rw = (ml: number): [number, number] => [GX + innerHW(yOf(ml)) - 24, yOf(ml)];
const anchor = (f: number, idx: number): [number, number] => {
  const s = STEPS[idx];
  if (isPour(s)) {
    const b = bands(f).find((q) => q.idx === idx);
    return b ? rw(Math.max(b.s + 3, (b.s + b.e) / 2)) : rw(4);
  }
  if (s.kind === 'ice') {
    const i = Math.min(4, ICE_T.length - 1);
    const c = cube(f, i);
    return c ? [c.x + 24, c.y] : rw(level(f));
  }
  return [GX + 150, RIM_Y + 4];
};
/** 標籤的高度：照完成時各層的位置排，彼此至少隔 74，限制在 270～840 */
const TAGS: Tag[] = (() => {
  const list = STEPS.map((s, idx) => ({idx, s})).filter(({s}) => s.kind !== 'stir' && s.tagAt != null && s.short);
  const ys = list.map(({idx}) => anchor(MK.reveal, idx)[1]);
  const order = ys.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0]);
  const gap = 74, lo = 270, hi = 840;
  const v = order.map(([y]) => Math.max(lo, Math.min(hi, y)));
  for (let i = 1; i < v.length; i++) v[i] = Math.max(v[i], v[i - 1] + gap);
  if (v.length && v[v.length - 1] > hi) {
    v[v.length - 1] = hi;
    for (let i = v.length - 2; i >= 0; i--) v[i] = Math.min(v[i], v[i + 1] - gap);
  }
  const slot: number[] = [];
  order.forEach(([, i], j) => (slot[i] = v[j]));
  return list.map(({idx, s}, i) => ({idx, s, at: s.tagAt as number, slot: slot[i]}));
})();

const TagLines: React.FC<{f: number; fade: number}> = ({f, fade}) => (
  <g opacity={fade}>
    {TAGS.map((t, i) => {
      const p = k(f, t.at, t.at + 14, EO);
      if (p <= 0) return null;
      const [ax, ay] = anchor(f, t.idx);
      const mx = GX + 222;
      const pts = [[ax, ay], [mx, ay], [TAG_X - 6, t.slot]];
      const len = Math.hypot(mx - ax, 0) + Math.hypot(TAG_X - 6 - mx, t.slot - ay);
      return (
        <g key={i}>
          <polyline points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={C.ink} strokeWidth={2.5} strokeDasharray={len} strokeDashoffset={len * (1 - p)} strokeLinejoin="round" />
          <circle cx={ax} cy={ay} r={7 * p} fill="#fff" stroke={C.ink} strokeWidth={3} />
        </g>
      );
    })}
  </g>
);
const TagLabels: React.FC<{f: number; fade: number}> = ({f, fade}) => (
  <>
    {TAGS.map((t, i) => {
      const p = k(f, t.at + 6, t.at + 18, EO);
      if (p <= 0) return null;
      const col = t.s.react ? REACT_C : t.s.color;
      return (
        <div key={i} style={{position: 'absolute', left: TAG_X, top: t.slot, transform: `translate(${(1 - p) * -30}px, -50%)`, opacity: p * fade, display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFFE6', borderRadius: 999, padding: '6px 22px 6px 12px', boxShadow: '0 4px 14px #0000001a', whiteSpace: 'nowrap'}}>
          <span style={{width: 26, height: 26, borderRadius: 13, background: col, display: 'inline-block', flex: 'none'}} />
          <span style={{fontFamily: KAI, fontWeight: 700, fontSize: t.s.shortSize, color: C.ink}}><Mixed text={t.s.short} /></span>
        </div>
      );
    })}
  </>
);

/* ───── 開場標題、頁首、完成、印章 ───── */
const C0 = POURS[0]?.color ?? '#E59A2E';
const C1 = (REACT ? REACT_C : POURS[POURS.length - 1]?.color) ?? '#3550D9';
const C2 = POURS[POURS.length - 1]?.color ?? '#3550D9';
const Title: React.FC<{f: number}> = ({f}) => {
  const end = MK.first;
  if (f > end + 16) return null;
  const out = k(f, end - 4, end + 12, (x) => x * x);
  const P = (d: number) => k(f, d, d + 16, EO);
  const ti = D.title;
  return (
    <div style={{position: 'absolute', left: LX, top: 300, width: 900, color: C.ink, whiteSpace: 'nowrap'}}>
      {ti.tag && (
        <MaskLine p={P(20)} out={out}>
          <Pill color={ink(C2)} size={ti.tagSize}><Mixed text={ti.tag} /></Pill>
        </MaskLine>
      )}
      {ti.lines.map((ln: string, i: number) => (
        <MaskLine key={i} p={P(26 + i * 6)} out={out} style={{marginTop: i === 0 ? 14 : 0}}>
          <div style={{fontFamily: KAI, fontWeight: 700, fontSize: ti.size, lineHeight: 1.15}}>
            {i === ti.lines.length - 1 ? (
              <span style={{background: `linear-gradient(90deg, ${C0}, ${C1} 55%, ${C2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{ln}</span>
            ) : (
              <Mixed text={ln} />
            )}
          </div>
        </MaskLine>
      ))}
      {ti.sub && (
        <MaskLine p={P(40)} out={out} style={{marginTop: 10}}>
          <div style={{fontFamily: KAI, fontSize: ti.subSize}}><Mixed text={ti.sub} numW={500} /></div>
        </MaskLine>
      )}
    </div>
  );
};
const Header: React.FC<{f: number}> = ({f}) => {
  if (!D.header) return null;
  const p = k(f, MK.first + 6, MK.first + 22, EO);
  if (p <= 0) return null;
  return (
    <div style={{position: 'absolute', left: LX, top: 92, opacity: p, transform: `translateY(${(1 - p) * -20}px)`, display: 'flex', alignItems: 'center', gap: 16, fontFamily: KAI, fontWeight: 700, fontSize: D.headerSize, color: C.ink, whiteSpace: 'nowrap'}}>
      <span style={{display: 'inline-block', width: 14, height: 44, borderRadius: 7, background: `linear-gradient(${C2}, ${C1}, ${C0})`, flex: 'none'}} />
      <span><Mixed text={D.header} numW={500} /></span>
    </div>
  );
};
const Done: React.FC<{f: number}> = ({f}) => {
  if (f < MK.reveal - 2) return null;
  const P = (d: number) => k(f, MK.reveal + d, MK.reveal + d + 16, EO);
  const dn = D.done;
  return (
    <div style={{position: 'absolute', left: LX, top: LY, width: 700, color: C.ink, whiteSpace: 'nowrap'}}>
      <MaskLine p={P(0)}>
        <div style={{fontFamily: KAI, fontWeight: 700, fontSize: dn.labelSize, lineHeight: 1.1}}>{dn.label}</div>
      </MaskLine>
      {dn.name && (
        <MaskLine p={P(8)} style={{marginTop: 6}}>
          <div style={{fontFamily: KAI, fontWeight: 700, fontSize: dn.nameSize, lineHeight: 1.25}}><Mixed text={dn.name} /></div>
        </MaskLine>
      )}
      {dn.pill && (
        <MaskLine p={P(14)} style={{marginTop: 10}}>
          <Pill color={ink(C1)} size={dn.pillSize}><Mixed text={dn.pill} /></Pill>
        </MaskLine>
      )}
    </div>
  );
};
const Stamp: React.FC<{f: number}> = ({f}) => {
  const t = MK.stamp;
  if (t == null || f < t - 6) return null;
  const st = D.stamp;
  const p = k(f, t - 6, t, (x) => x * x);
  const sc = lerp(2.6, 1, p);
  const d = f - t;
  const bump = d >= 0 ? 0.06 * Math.exp(-d / 4) * Math.cos(d * 1.1) : 0;
  const body = (o: number, s: number, key?: number) => (
    <div key={key} style={{position: 'absolute', left: 0, top: 0, width: 250, height: 250, transform: `rotate(-12deg) scale(${s})`, opacity: o, borderRadius: 125, border: `9px solid ${C.red}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.red, background: '#FFF7F2cc', whiteSpace: 'nowrap'}}>
      <div style={{position: 'absolute', inset: 10, borderRadius: 120, border: `3px solid ${C.red}`}} />
      {st.top && <div style={{fontFamily: KAI, fontWeight: 700, fontSize: st.topSize, letterSpacing: 2}}><Mixed text={st.top} /></div>}
      <div style={{fontFamily: KAI, fontWeight: 700, fontSize: st.mainSize, lineHeight: 1.15}}><Mixed text={st.main} /></div>
      {st.bottom && <div style={{fontFamily: KAI, fontWeight: 700, fontSize: st.bottomSize, letterSpacing: 2}}><Mixed text={st.bottom} /></div>}
    </div>
  );
  return (
    <div style={{position: 'absolute', left: LX + 310, top: LY + 330, width: 250, height: 250}}>
      {d < 0 && [3, 2, 1].map((m) => body(0.18 / m, sc + 0.22 * m, m))}
      {body(Math.min(1, p * 1.4), sc * (1 + bump))}
    </div>
  );
};

/* ───── 結尾黑板 ───── */
const BoardText: React.FC<{f: number}> = ({f}) => {
  const L0 = MK.logo;
  if (f < L0 - 4) return null;
  const P = (d: number) => k(f, L0 + d, L0 + d + 16, EO);
  const chalk = '#F4F1E6';
  const bd = D.board;
  return (
    <div style={{position: 'absolute', left: BOARD.x + 80, top: BOARD.y + 56, width: BOARD.w - 160, color: chalk, whiteSpace: 'nowrap'}}>
      {bd.tag && (
        <MaskLine p={P(0)}>
          <div style={{display: 'inline-block', border: `3px solid ${chalk}`, borderRadius: 999, padding: '4px 26px', fontFamily: KAI, fontWeight: 700, fontSize: bd.tagSize}}><Mixed text={bd.tag} numW={500} /></div>
        </MaskLine>
      )}
      {(bd.line || bd.em) && (
        <MaskLine p={P(6)} style={{marginTop: 18}}>
          <div style={{fontFamily: KAI, fontWeight: 700, fontSize: bd.lineSize, lineHeight: 1.3}}>
            <Mixed text={bd.line} />
            {bd.em && <span style={{color: '#FFE08A', borderBottom: `5px solid ${C1}`}}><Mixed text={bd.em} /></span>}
          </div>
        </MaskLine>
      )}
      <div style={{marginTop: 26, height: 0, borderTop: `3px dashed ${chalk}66`, width: `${P(10) * 100}%`}} />
      <MaskLine p={P(14)} style={{marginTop: 18}}>
        <div style={{fontFamily: KAI, fontWeight: 700, fontSize: bd.nameSize, lineHeight: 1.12}}><Mixed text={bd.name} /></div>
      </MaskLine>
      {bd.slogan && (
        <MaskLine p={P(22)}>
          <div style={{fontFamily: KAI, fontWeight: 700, fontSize: bd.sloganSize, lineHeight: 1.3, color: '#FFE08A'}}><Mixed text={bd.slogan} /></div>
        </MaskLine>
      )}
      {bd.url && (
        <MaskLine p={P(30)} style={{marginTop: 22}}>
          <div style={{fontFamily: FRE, fontWeight: 500, fontSize: bd.urlSize, color: '#CFE8DA'}}>{bd.url}</div>
        </MaskLine>
      )}
    </div>
  );
};

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const c = cam(f);
  const cb = cam(Math.min(T.frames - 1, f + 5)); // 背景早 5 格先動
  const bg = {x: 960 + (cb.x - 960) * 0.55, y: 540 + (cb.y - 540) * 0.55, z: 1 + (cb.z - 1) * 0.5};
  const tagFade = 1 - k(f, MK.truck - 4, MK.truck + 14);
  const gt = glassTf(f);
  return (
    <AbsoluteFill style={{background: '#F6F3EA', overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: camCss(bg)}}>
        <Background />
      </div>
      <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: camCss(c)}}>
        <svg width={4400} height={1400} viewBox="-400 -100 4400 1400" style={{position: 'absolute', left: -400, top: -100, overflow: 'visible'}}>
          <Board />
          <Counter f={f} dx={slideX(f)} />
          <GlassGhosts f={f} />
          <g transform={`translate(${slideX(f)} 0) ${gt}`}>
            <GlassBack />
            <StirSpoon f={f} />
            <Straw f={f} />
            <Liquid f={f} />
            <Ice f={f} />
            <GlassFront />
            <Mint f={f} />
            <Lemon f={f} />
          </g>
          <FloatSpoon f={f} />
          <Streams f={f} />
          <Vessels f={f} />
          <Splashes f={f} />
          <TagLines f={f} fade={tagFade} />
          <Leaders f={f} />
        </svg>
        <Header f={f} />
        <Title f={f} />
        {STEPS.map((s, i) => <StepCallout key={i} f={f} s={s} n={i + 1} />)}
        <TagLabels f={f} fade={tagFade} />
        <Done f={f} />
        <Stamp f={f} />
        <BoardText f={f} />
      </div>
    </AbsoluteFill>
  );
};

/** 全字測試圖：storyboard 用到的每個字排三次（霞鶩文楷 400、700、Fredoka 串接） */
export const FontTest: React.FC = () => {
  const txt = Array.from(new Set(Array.from((T.allText as string).replace(/\s/g, '')))).join('');
  return (
    <AbsoluteFill style={{background: '#F6F3EA', padding: 40, color: C.ink}}>
      <div style={{fontFamily: KAI, fontWeight: 400, fontSize: 46, lineHeight: 1.22, wordBreak: 'break-all'}}>{txt}</div>
      <div style={{fontFamily: KAI, fontWeight: 700, fontSize: 46, lineHeight: 1.22, marginTop: 20, color: '#7A4FC8', wordBreak: 'break-all'}}>{txt}</div>
      <div style={{fontFamily: FRE, fontWeight: 600, fontSize: 46, lineHeight: 1.22, marginTop: 20, color: '#B8742E', wordBreak: 'break-all'}}>{txt}</div>
    </AbsoluteFill>
  );
};
