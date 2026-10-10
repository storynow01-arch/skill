/* 廣O 章型（二）：synopsis 劇情大綱、boxoffice 票房紀錄、pan 剪紙全景橫搖、credits 迷魂記螺旋＋工作人員名單、end 片尾 logo。
   字全部讀 timeline.json 的章資料。 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BEBAS, DM, SERIF} from './fonts';
import {B, C, ChP, Cut, EI, EIO, EO, LIN, Pop, Pt, Roller, SlideBar, Svg, Type, barPts, bell, bt, circPts, k, lerp, nod, rectPts, rnd01, sp} from './kit';
import {Bus, Icon, Lamp} from './icons';

/* ═══ synopsis：2～4 個剪影小場景，下一場從右邊推進來 ═══ */
type SynIt = {lines: string[]; sizes: number[]; stamp: string; icon: string; at: number; slot: number};
const SYN_BG = [C.cr, C.te, C.or, C.mu];
const SYN_TX: Record<string, string[]> = {
  [C.cr]: [C.ink, C.red, C.te], [C.te]: [C.cr, C.mu, C.cr], [C.or]: [C.ink, C.cr, C.ink], [C.mu]: [C.ink, C.te, C.ink],
};
const Panel: React.FC<{v: number; it: SynIt; t: number; f: number}> = ({v, it, t, f}) => {
  const at = bt(it.at);
  const tv = t - at;
  const enter = v === 0 ? 1 : k(t, at - 9, at, EIO);
  const X = (1 - enter) * 2050;
  const bg = SYN_BG[v % 4];
  const tx = SYN_TX[bg];
  const fx = v % 4;
  let art: React.ReactNode = null;
  if (fx === 0) {
    // 紅色太陽前的剪影（飛機就整個飛過去）
    const plane = it.icon === 'plane';
    const px = plane ? lerp(-420, 1800, Math.max(0, tv + 8) / 66) : lerp(1560, 1100, k(tv, -4, 22, EO));
    const py = plane ? 380 - Math.sin(Math.max(0, tv) / 20) * 70 : 250 + Math.sin(tv / 9) * 8;
    art = (
      <>
        <circle cx={1300} cy={430} r={250} fill={C.red} />
        <g transform={`translate(${px} ${py}) scale(${plane ? 1.7 : 2.2})`}><Icon name={it.icon} fill={C.ink} hole={C.red} wheel={C.ink} t={tv} /></g>
      </>
    );
  } else if (fx === 1) {
    // 閃光放射＋剪影落下
    const fl = bell(k(tv, bt(2), bt(2) + 8, LIN));
    art = (
      <>
        {fl > 0 && Array.from({length: 10}, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return <Cut key={i} pts={barPts(1340 + Math.cos(a) * 330, 470 + Math.sin(a) * 330, 120 * fl, 16, (a * 180) / Math.PI)} fill={C.mu} seed={`fl${i}`} f={f} shadow={false} />;
        })}
        <g transform={`translate(1100 ${230 - sp(tv, 0, 10, 200) * 30 + 30}) scale(2.4)`}><Icon name={it.icon} fill={C.cr} hole={bg} wheel={C.cr} t={tv} /></g>
      </>
    );
  } else if (fx === 2) {
    // 三縷蒸氣＋剪影隨拍點頭
    art = (
      <>
        {[0, 1, 2].map((i) => {
          const ph = tv / 9 + i * 2;
          const x0 = 1010 + i * 50;
          const d = `M${x0} 560 Q${x0 + 26 * Math.sin(ph)} 500 ${x0} 440 Q${x0 - 26 * Math.sin(ph)} 380 ${x0} 320`;
          return <path key={i} d={d} stroke={C.cr} strokeWidth={14} fill="none" strokeLinecap="round" opacity={0.85} />;
        })}
        <g transform={`translate(1200 ${190 - Math.max(0, 1 - ((((tv % B) + B) % B) / B) / 0.35) * 10}) scale(2.5)`}><Icon name={it.icon} fill={C.ink} hole={bg} wheel={C.ink} t={tv} /></g>
      </>
    );
  } else {
    // 旋轉轉進來
    const r = k(tv, 0, 12, EO);
    art = <g transform={`translate(1390 430) rotate(${(1 - r) * -90}) scale(${2.4 * (0.5 + r * 0.5)}) translate(-100 -100)`}><Icon name={it.icon} fill={C.ink} hole={bg} wheel={C.ink} t={tv} /></g>;
  }
  const hs = it.sizes.map((s) => s * 1.28);
  const tot = hs.reduce((a, b) => a + b, 0);
  let y = 470 - tot / 2;
  const ys = hs.map((h) => {
    const v0 = y;
    y += h;
    return v0;
  });
  const st = it.stamp ? sp(tv, bt(3), 9, 240) : 0;
  return (
    <AbsoluteFill style={{transform: `translateX(${X}px)`}}>
      <Svg>
        <Cut pts={[[-20, -20], [1960, -20], [1960, 1100], [-20, 1100]]} fill={bg} seed={`pn${v}`} f={f} amp={14} step={60} />
        {art}
      </Svg>
      {it.lines.map((s, q) => <Type key={q} text={s} size={it.sizes[q]} color={tx[q]} seed={`v${v}${q}`} x={140 + q * 4} y={ys[q]} t={tv} at={2 + q * 7} stagger={q ? 1 : 2} />)}
      {st > 0 && (
        <Pop x={900} y={Math.min(800, y + 110)} s={st} rot={-12}>
          <div style={{width: 190, height: 190, borderRadius: '50%', background: C.cr, border: `10px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: it.stamp.length > 2 ? 52 : 70, color: C.red, whiteSpace: 'nowrap'}}>{it.stamp}</div>
        </Pop>
      )}
    </AbsoluteFill>
  );
};
export const ChSynopsis: React.FC<ChP> = ({t, f, c}) => {
  const items = c.items as SynIt[];
  let cur = 0;
  while (cur + 1 < items.length && t >= bt(items[cur + 1].at)) cur++;
  const nxt = cur + 1 < items.length && t >= bt(items[cur + 1].at) - 9 ? cur + 1 : -1;
  return (
    <AbsoluteFill style={{background: C.cr}}>
      <Panel v={cur} it={items[cur]} t={t} f={f} />
      {nxt > 0 && <Panel v={nxt} it={items[nxt]} t={t} f={f} />}
      <div style={{position: 'absolute', left: 100, top: 64, background: C.ink, padding: '6px 22px', display: 'flex', gap: 18, alignItems: 'baseline', transform: 'rotate(-1.5deg)', whiteSpace: 'nowrap'}}>
        <span style={{fontFamily: SERIF, fontWeight: 900, fontSize: c.headSize, color: C.cr}}>{c.head}</span>
        {c.headEn && <span style={{fontFamily: BEBAS, fontSize: c.headEnSize, letterSpacing: c.headEnSize * 0.22, color: C.mu}}>{c.headEn}</span>}
      </div>
    </AbsoluteFill>
  );
};

/* ═══ boxoffice：1～2 張電影票飛入、數字吃角子老虎滾動、紅色印章蓋下 ═══ */
type Tk = {label: string; labelSize: number; value: string; unit: string; size: number; foot: string; footSize: number; at: number; start: number; locks: number[]};
const ticketPts = (x: number, y: number, w: number, h: number): Pt[] => {
  const r = 46, my = y + h / 2;
  const arc = (cx: number, from: number, to: number): Pt[] => Array.from({length: 9}, (_, i) => {
    const a = from + ((to - from) * i) / 8;
    return [cx + Math.cos(a) * r, my + Math.sin(a) * r] as Pt;
  });
  return [[x, y], [x + w, y], ...arc(x + w, -Math.PI / 2, -Math.PI * 1.5), [x + w, y + h], [x, y + h], ...arc(x, Math.PI / 2, -Math.PI / 2)];
};
export const ChBox: React.FC<ChP> = ({t, f, c}) => {
  const tks = c.tickets as Tk[];
  const one = tks.length === 1;
  const X = one ? [560] : [120, 1000];
  const t2at = one ? 1e9 : bt(tks[1].at);
  const shake = Math.sin(t * 2.2) * 6 * bell(k(t, t2at - 8, t2at + 4, LIN));
  const stAt = bt(c.stampAt);
  const st = c.stampAt ? k(t, stAt, stAt + 7, EO) : 0;
  return (
    <AbsoluteFill style={{background: C.or}}>
      <Type text={c.head} size={c.headSize} color={C.ink} seed="bo" x={960} y={34} align="center" t={t} at={0} stagger={3} spacing={c.headSize * 0.11} />
      {c.headEn && <div style={{position: 'absolute', left: 0, width: 1920, top: 150, textAlign: 'center', fontFamily: BEBAS, fontSize: c.headEnSize, letterSpacing: c.headEnSize * 0.54, color: C.cr, opacity: k(t, 6, 12), whiteSpace: 'nowrap'}}>{c.headEn}</div>}
      <Svg>
        {Array.from({length: 23}, (_, i) => {
          const on = (Math.floor(t / B) + i) % 2 === 0;
          return <circle key={i} cx={300 + i * 60} cy={232} r={9} fill={on ? C.wh : C.ink} opacity={k(t, i * 0.6, i * 0.6 + 4)} />;
        })}
        <SlideBar t={t} at={bt(2)} cx={960} cy={846} len={1760} th={24} deg={0} seed="e0" f={f} />
      </Svg>
      {tks.map((tk, j) => {
        const at = bt(tk.at);
        const p = sp(t, at, j ? 11 : 12, j ? 190 : 160);
        if (p <= 0) return null;
        const dir = j === 0 ? -1 : 1;
        const x = X[j];
        const tr = `translateX(${(1 - p) * dir * 1400 + (j === 0 ? shake : 0)}px) rotate(${(1 - p) * dir * 10 + (j === 0 ? -1.5 : 1.2)}deg)`;
        const org = `${x + 400}px 530px`;
        return (
          <div key={j} style={{position: 'absolute', inset: 0, transform: tr, transformOrigin: org}}>
            <Svg>
              <Cut pts={ticketPts(x, 270, 800, 520)} fill={C.cr} seed={`tk${j}`} f={f} amp={3} />
              <line x1={x + 670} y1={290} x2={x + 670} y2={770} stroke={C.or} strokeWidth={5} strokeDasharray="14 12" />
            </Svg>
            {tk.label && <div style={{position: 'absolute', left: x + 60, top: 316, fontFamily: SERIF, fontWeight: 900, fontSize: tk.labelSize, color: C.ink, whiteSpace: 'nowrap'}}>{tk.label}</div>}
            <div style={{position: 'absolute', left: x + 70, top: 552 - tk.size / 2, display: 'flex', alignItems: 'baseline', color: C.ink, whiteSpace: 'nowrap'}}>
              <span style={{fontFamily: DM, fontSize: tk.size, lineHeight: 1}}><Roller value={tk.value} t={t} start={bt(tk.start)} lock={tk.locks.map(bt)} laps={j ? 1 : 2} /></span>
              {tk.unit && <span style={{fontFamily: SERIF, fontWeight: 900, fontSize: tk.size * 0.47, color: C.red, marginLeft: tk.size * 0.035}}>{tk.unit}</span>}
            </div>
            {tk.foot && <div style={{position: 'absolute', left: x + 64, top: 714, fontFamily: BEBAS, fontSize: tk.footSize, letterSpacing: tk.footSize * 0.22, color: C.te, whiteSpace: 'nowrap'}}>{tk.foot}</div>}
          </div>
        );
      })}
      {st > 0 && (
        <Pop x={one ? 1330 : 955} y={one ? 720 : 700} s={lerp(2.4, 1, st)} rot={-14}>
          <div style={{opacity: Math.min(1, st * 2), width: 236, height: 236, borderRadius: '50%', border: `10px solid ${C.red}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.red, background: 'rgba(242,230,207,0.9)', whiteSpace: 'nowrap'}}>
            {c.stampTop && <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: c.stampTopSize}}>{c.stampTop}</div>}
            {c.stampBig && <div style={{fontFamily: DM, fontSize: c.stampBigSize, lineHeight: 1.05}}>{c.stampBig}</div>}
          </div>
        </Pop>
      )}
    </AbsoluteFill>
  );
};

/* ═══ pan：2～4 段剪紙場景排成一整條，鏡頭一段一段橫搖過去 ═══ */
type PanIt = {title: string; titleSize: number; sub: string; subSize: number; note: string; noteSize: number; art: string; at: number; slot: number};
const PanArt: React.FC<{art: string; s: number; t: number; t0: number; f: number; j: number}> = ({art, s, t, t0, f, j}) => {
  const tl = t - t0;
  const bob = -Math.max(0, 1 - ((((t % B) + B) % B) / B) / 0.4) * 8;
  if (art === 'bus') {
    if (tl < 0) return null; // 還沒搖到這一段：車子還在畫面外（不然會從上一段開出來）
    const busIn = k(tl, 2, 30, EO);
    return (
      <>
        {[0, 1, 2].map((i) => <rect key={i} x={s + 1150 - (1 - busIn) * 1900 - 160 - i * 70} y={560 + i * 60} width={120 - i * 20} height={12} fill={C.cr} opacity={(1 - busIn) * 0.9 + 0.1} />)}
        <g transform={`translate(${s + 1150 - (1 - busIn) * 1900} ${465 + bob}) scale(2.6)`}><Bus fill={C.mu} hole={C.cr} wheel={C.ink} t={t} /></g>
      </>
    );
  }
  if (art === 'building') {
    const lit = Math.floor((tl - 10) / (B / 2));
    return (
      <>
        <Cut pts={rectPts(s + 1050, 230, 600, 562)} fill={C.ink} seed={`dorm${j}`} f={f} amp={3} />
        <Cut pts={[[s + 1020, 236], [s + 1350, 120], [s + 1680, 236]]} fill={C.ink} seed={`roof${j}`} f={f} amp={3} />
        {Array.from({length: 20}, (_, i) => {
          const cc = i % 4, r = Math.floor(i / 4);
          const on = lit >= (4 - r) * 4 - (cc % 2) || rnd01(`w${j}${i}`) > 0.82;
          return <rect key={i} x={s + 1100 + cc * 135} y={280 + r * 98} width={92} height={64} fill={on && tl > 10 ? C.mu : '#33474a'} />;
        })}
      </>
    );
  }
  if (art === 'water') {
    return (
      <>
        <Cut pts={rectPts(s + 860, 470, 960, 322)} fill={C.cr} seed={`pool${j}`} f={f} amp={3} />
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 520 + i * 56;
          let d = `M${s + 880} ${y}`;
          for (let x = 0; x <= 920; x += 40) d += ` L${s + 880 + x} ${y + Math.sin(x / 70 + t / 6 + i) * 9}`;
          return <path key={i} d={d} stroke={C.te} strokeWidth={10} fill="none" strokeLinecap="round" />;
        })}
        <g transform={`translate(${s + 960 + Math.max(0, tl) * 5} 600)`}>
          <circle cx={0} cy={0} r={24} fill={C.ink} />
          <path d={`M-10 -6 Q${40} ${-70 + Math.sin(t / 3) * 20} 90 -10`} stroke={C.ink} strokeWidth={16} fill="none" strokeLinecap="round" />
        </g>
        <Cut pts={barPts(s + 830, 440, 260, 22, -8)} fill={C.ink} seed={`board${j}`} f={f} amp={2} />
      </>
    );
  }
  if (art === 'night') {
    return (
      <>
        <circle cx={s + 1520} cy={270} r={120} fill={C.cr} />
        <circle cx={s + 1580} cy={240} r={110} fill={C.te} />
        {Array.from({length: 14}, (_, i) => <circle key={i} cx={s + 900 + rnd01(`sx${j}${i}`) * 900} cy={110 + rnd01(`sy${j}${i}`) * 260} r={4 + (i % 3) * 2} fill={C.cr} opacity={0.5 + 0.5 * Math.abs(Math.sin(t / 7 + i))} />)}
        <path d={`M${s + 1420} 640 L${s + 1300} 792 L${s + 1700} 792 Z`} fill={C.mu} opacity={0.35} />
        <g transform={`translate(${s + 1080} 322) scale(2.4)`}><Lamp fill={C.mu} hole={C.te} /></g>
      </>
    );
  }
  // 其他：剪影畫在一片大剪紙圓上
  const pin = sp(tl, 2, 11, 180);
  return (
    <g transform={`translate(${s + 1360} ${520 + bob}) scale(${Math.max(0.001, pin)}) rotate(${(1 - pin) * 30})`}>
      <Cut pts={circPts(0, 0, 250, 40)} fill={C.mu} seed={`pa${j}`} f={f} amp={6} />
      <g transform="translate(-200 -200) scale(2)"><Icon name={art} fill={C.ink} hole={C.mu} wheel={C.ink} t={t} /></g>
    </g>
  );
};
export const ChPan: React.FC<ChP> = ({t, f, c}) => {
  const items = c.items as PanIt[];
  const n = items.length;
  let seg = 0;
  for (let j = 1; j < n; j++) seg += k(t, bt(items[j].at) - 11, bt(items[j].at), EIO);
  const X = -1920 * seg;
  const W = 1920 * n;
  return (
    <AbsoluteFill style={{background: C.te}}>
      <AbsoluteFill style={{transform: `translateX(${X}px)`}}>
        <svg width={W} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
          <Cut pts={rectPts(-40, 792, W + 80, 34)} fill={C.ink} seed="road" f={f} amp={2} step={60} />
          {items.map((it, j) => <PanArt key={j} art={it.art} s={j * 1920} t={t} t0={bt(it.at)} f={f} j={j} />)}
        </svg>
        {items.map((it, j) => {
          const s = j * 1920;
          const a0 = bt(it.at) + (j === 0 ? 8 : 0);
          return (
            <React.Fragment key={j}>
              <Type text={it.title} size={it.titleSize} color={C.cr} seed={`l${j}a`} x={s + 140} y={140} t={t} at={a0} stagger={3} />
              {it.sub && <Type text={it.sub} size={it.subSize} color={C.mu} seed={`l${j}b`} x={s + 150} y={140 + it.titleSize * 1.15 + 20} t={t} at={a0 + 8} stagger={2} />}
              {it.note && <Type text={it.note} size={it.noteSize} color={C.cr} seed={`l${j}c`} x={s + 154} y={140 + it.titleSize * 1.15 + 20 + (it.sub ? it.subSize * 1.15 + 30 : 0)} t={t} at={a0 + 14} stagger={1} />}
            </React.Fragment>
          );
        })}
      </AbsoluteFill>
      <div style={{position: 'absolute', right: 90, top: 70, fontFamily: BEBAS, fontSize: c.headSize, letterSpacing: c.headSize * 0.27, color: C.cr, opacity: 0.85, whiteSpace: 'nowrap'}}>{c.head}</div>
    </AbsoluteFill>
  );
};

/* ═══ credits：迷魂記螺旋在中間轉，工作人員名單兩兩一組在兩側落下；最後螺旋旋轉收成一點 ═══ */
type Cr = {role: string; roleSize: number; name: string; nameSize: number};
const spiralPath = (() => {
  let d = '';
  for (let i = 0; i <= 260; i++) {
    const th = (i / 260) * Math.PI * 7;
    const r = 18 + th * 15.5;
    d += `${i ? 'L' : 'M'}${(Math.cos(th) * r).toFixed(1)} ${(Math.sin(th) * r).toFixed(1)}`;
  }
  return d;
})();
export const ChCredits: React.FC<ChP> = ({t, f, c}) => {
  const L7 = c.to - c.from;
  const groups = c.groups as {pair: Cr[]; at: number; slot: number}[];
  const col = k(t, L7 - 26, L7, EI);
  const rot = t * 4 + nod(t) * 10 + col * 540;
  const sc = sp(t, 0, 14, 120) * (1 - col * 0.92);
  // 每一環的顏色跟著自己走、繞回中心的那一下發生在圓盤外（裁掉看不到）。原作 6 環依排序後的位置上色、在 420 px 繞回：
  // 每 29 格全部色環對調顏色、每 58 格最外圈整圈變色＝閃爍；改成 8 環、560 px 一輪、裁在 430 px 的圓裡
  const rings = Array.from({length: 8}, (_, n) => ({r: (n * 70 + t * 2.4) % 560, c: n % 2 ? C.or : C.mu})).sort((a, b) => b.r - a.r);
  return (
    <AbsoluteFill style={{background: C.cr}}>
      <Svg>
        <g transform={`translate(960 520) scale(${sc})`}>
          <clipPath id="adOdisc"><circle r={430} /></clipPath>
          <circle r={430} fill={C.or} />
          <g clipPath="url(#adOdisc)">{rings.map((g, n) => <circle key={n} r={g.r} fill={g.c} />)}</g>
          <g transform={`rotate(${rot})`}><path d={spiralPath} stroke={C.ink} strokeWidth={24} fill="none" strokeLinecap="round" /></g>
          <circle r={20 + 10 * Math.max(0, 1 - ((t % B) / B) / 0.35)} fill={C.red} />
        </g>
        <SlideBar t={t} at={2} cx={560} cy={540} len={700} th={14} deg={90} seed="k0" f={f} />
        <SlideBar t={t} at={2 + B} cx={1360} cy={540} len={700} th={14} deg={90} from={-1} seed="k1" f={f} />
      </Svg>
      {groups.map((g, n) => {
        const ts = bt(g.at);
        const last = n === groups.length - 1;
        const op = last ? 1 : 1 - k(t, ts + bt(g.slot) - 5, ts + bt(g.slot), LIN);
        if (t < ts || op <= 0) return null;
        const [a, b2] = g.pair;
        return (
          <div key={n} style={{position: 'absolute', inset: 0, opacity: op}}>
            {a.role && <Type text={a.role} size={a.roleSize} color={C.red} seed={`r${n}a`} x={520} y={390} align="right" t={t} at={ts} stagger={2} />}
            <Type text={a.name} size={a.nameSize} color={C.ink} seed={`n${n}a`} x={520} y={456} align="right" t={t} at={ts + 4} stagger={2} />
            {b2 && b2.role && <Type text={b2.role} size={b2.roleSize} color={C.red} seed={`r${n}b`} x={1400} y={390} t={t} at={ts + 2} stagger={2} />}
            {b2 && <Type text={b2.name} size={b2.nameSize} color={C.ink} seed={`n${n}b`} x={1400} y={456} t={t} at={ts + 6} stagger={2} />}
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 0, width: 1920, top: 70, textAlign: 'center', fontFamily: BEBAS, fontSize: c.headSize, letterSpacing: c.headSize * 0.5, color: C.ink, opacity: k(t, 4, 12), whiteSpace: 'nowrap'}}>{c.head}</div>
    </AbsoluteFill>
  );
};

/* ═══ end：四根黑條框住 → 紅色圓章 → 標語兩行逐字落下 → THE END（可被紅線劃掉、換上一句話）→ 全名、網址電話 ═══ */
const emw = (s: string) => Array.from(s).reduce((a, ch) => a + ((ch.codePointAt(0) ?? 0) >= 0x2e80 ? 1 : ch === ' ' ? 0.3 : 0.58), 0);
export const ChEnd: React.FC<ChP> = ({t, f, c}) => {
  const seal = c.badge ? sp(t, bt(2), 9, 220) : 0;
  const after: string = c.after;
  const strike = after ? k(t, bt(7), bt(7) + 6, EO) : 0;
  const drop = after ? k(t, bt(7) + 6, bt(7) + 14, EI) : 0;
  const sl = c.slogan as string[];
  const ss = c.sloganSizes as number[];
  const x1 = Math.max(200, Math.min(300, 1440 - emw(sl[0]) * ss[0]));
  const x2 = sl[1] ? Math.max(200, Math.min(560, 1440 - emw(sl[1]) * ss[1])) : 0;
  const teS: number = c.theEndSize;
  const teW = Array.from(c.theEnd as string).length * teS * (0.42 + 0.25);
  return (
    <AbsoluteFill style={{background: C.cr}}>
      <Svg>
        <SlideBar t={t} at={2} cx={960} cy={120} len={1720} th={28} deg={0} seed="z0" f={f} />
        <SlideBar t={t} at={2 + B * 0.5} cx={960} cy={830} len={1720} th={28} deg={0} from={-1} seed="z1" f={f} />
        <SlideBar t={t} at={2 + B} cx={160} cy={475} len={860} th={28} deg={90} seed="z2" f={f} />
        <SlideBar t={t} at={2 + B * 1.5} cx={1760} cy={475} len={860} th={28} deg={90} from={-1} seed="z3" f={f} />
        {seal > 0 && (
          <g transform={`translate(1570 290) scale(${seal}) rotate(${(1 - seal) * 90})`}>
            <Cut pts={circPts(0, 0, 96, 36)} fill={C.red} seed="seal" f={f} amp={3} />
          </g>
        )}
      </Svg>
      {seal > 0 && (
        <Pop x={1570} y={292} s={seal} rot={-8}>
          <div style={{fontFamily: BEBAS, fontSize: c.badge.length > 4 ? 58 : 72, color: C.wh, letterSpacing: 4, whiteSpace: 'nowrap'}}>{c.badge}</div>
        </Pop>
      )}
      <Type text={sl[0]} size={ss[0]} color={C.ink} seed="s0" x={x1} y={160} t={t} at={6} stagger={3} />
      {sl[1] && <Type text={sl[1]} size={ss[1]} color={C.or} seed="s1" x={x2} y={338} t={t} at={6 + B} stagger={3} />}
      <div style={{position: 'absolute', left: 0, width: 1920, top: 540, height: 130, overflow: 'hidden'}}>
        <div style={{transform: `translateY(${drop * 140}px)`, opacity: 1 - drop}}>
          <Type text={c.theEnd} size={teS} font={BEBAS} color={C.ink} seed="end" x={960} y={0} align="center" t={t} at={bt(4)} stagger={2} spacing={teS * 0.25} wobble={0.6} />
        </div>
        {strike > 0 && drop < 1 && <div style={{position: 'absolute', left: 960 - teW / 2 - 20, top: 58, width: (teW + 40) * strike, height: 14, background: C.red}} />}
        {after && <Type text={after} size={c.afterSize} color={C.red} seed="next" x={960} y={8} align="center" t={t} at={bt(7) + 10} stagger={3} />}
      </div>
      {c.full && <div style={{position: 'absolute', left: 0, width: 1920, top: 680, textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: c.fullSize, color: C.ink, opacity: k(t, bt(3), bt(3) + 8), whiteSpace: 'nowrap'}}>{c.full}</div>}
      {c.url && <div style={{position: 'absolute', left: 0, width: 1920, top: 742, textAlign: 'center', fontFamily: DM, fontSize: c.urlSize, color: C.te, opacity: k(t, bt(3) + 4, bt(3) + 12), whiteSpace: 'nowrap'}}>{c.url}</div>}
    </AbsoluteFill>
  );
};

