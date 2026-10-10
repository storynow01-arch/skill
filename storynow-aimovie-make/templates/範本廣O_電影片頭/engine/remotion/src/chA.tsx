/* 廣O 章型（一）：title 片名卡、discs 三片剪紙圓、cast 主演名單、cards 剪紙卡。字全部讀 timeline.json 的章資料。 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BEBAS, DM, SERIF} from './fonts';
import {B, C, ChP, Cut, EI, EO, H1, LIN, P1, Pop, Slide, SlideBar, Svg, Type, barPts, bell, bt, circPts, k, nod, rectPts, rnd, sp} from './kit';
import {Icon} from './icons';

/* ═══ title：黑條一根根滑入組成構圖 → 剪紙卡飛上來 → 片名逐字落位 → 英文片名、豎排一行 ═══ */
export const ChTitle: React.FC<ChP> = ({t, f, c}) => {
  const nd = nod(t);
  const pc = sp(t, bt(3.6), 13, 150);
  const tEnd: number = c.tEnd;
  const dot = sp(t, bt(tEnd + 0.5), 9, 260);
  const cw: number = c.cardW;
  const cx0 = 1000 - cw / 2;
  const ts: number = c.titleSize;
  const g = (i: number) => 2 + i * 0.75 * B;
  return (
    <AbsoluteFill style={{background: C.or}}>
      <Svg>
        <SlideBar t={t} at={g(0)} cx={250} cy={540} len={980} th={48} deg={90} seed="a0" f={f} dy={-nd * 12} />
        <SlideBar t={t} at={g(1)} cx={360} cy={600} len={640} th={26} deg={90} from={-1} seed="a1" f={f} />
        <SlideBar t={t} at={g(2)} cx={1030} cy={200} len={1500} th={26} deg={0} from={-1} seed="a2" f={f} dx={nd * 10} />
        <SlideBar t={t} at={g(3)} cx={900} cy={872} len={1500} th={40} deg={0} seed="a3" f={f} />
        <SlideBar t={t} at={g(4)} cx={1600} cy={330} len={560} th={34} deg={-14} from={-1} seed="a4" f={f} />
        <SlideBar t={t} at={g(5)} cx={1690} cy={600} len={600} th={58} deg={90} from={-1} seed="a5" f={f} dy={nd * 12} />
        {pc > 0 && (
          <g transform={`translate(0 ${(1 - pc) * 900}) rotate(${(1 - pc) * 6} 1000 500)`}>
            <Cut pts={rectPts(cx0, 300, cw, 390)} fill={C.cr} seed="card0" f={f} amp={4} />
          </g>
        )}
        {dot > 0 && <circle cx={cx0 + cw + 8} cy={300} r={46 * dot} fill={C.red} />}
      </Svg>
      {c.presents && <Type text={c.presents} size={c.presentsSize} color={C.cr} seed="cr0" x={470} y={108} t={t} at={bt(3)} stagger={2} />}
      {c.presentsEn && <Type text={c.presentsEn} size={c.presentsEnSize} font={DM} color={C.ink} seed="cr1" x={1690} y={110} align="right" t={t} at={bt(3.5)} stagger={1} wobble={0.6} />}
      {pc > 0 && (
        <div style={{position: 'absolute', left: 0, top: (1 - pc) * 900, width: 1920}}>
          <Type text={c.title} size={ts} color={C.ink} seed="tt0" x={1000} y={300 + (390 - ts * 1.05) / 2} align="center" t={t} at={bt(c.T0)} stagger={c.st * B} spacing={ts * 0.1} />
        </div>
      )}
      {c.en && <Type text={c.en} size={c.enSize} font={BEBAS} color={C.ink} seed="en0" x={1000} y={730} align="center" t={t} at={bt(tEnd + 1)} stagger={1} spacing={c.enSize * 0.31} wobble={0.5} />}
      {c.vertical && <Type text={c.vertical} size={c.verticalSize} color={C.cr} seed="vt0" x={310 - c.verticalSize / 2} y={300} vertical t={t} at={bt(tEnd + 1.5)} stagger={2} />}
    </AbsoluteFill>
  );
};

/* ═══ discs：1～3 片剪紙圓依拍彈出，數字＋單位、下方標籤；黑條從兩側滑入 ═══ */
export const ChDiscs: React.FC<ChP> = ({t, f, c}) => {
  const items = c.items as {n: string; unit: string; size: number; label: string; labelSize: number}[];
  const n = items.length;
  const xs = n === 1 ? [960] : n === 2 ? [660, 1260] : [400, 960, 1520];
  const bx = n === 1 ? [630, 1290] : n === 2 ? [960, 1720] : [680, 1240];
  const cols = [C.or, C.te, C.mu];
  const jolt = 0.07 * bell(k(t, H1 - 1, H1 + 9, LIN)) - 0.04 * bell(k(t, P1 - 1, P1 + 5, LIN));
  return (
    <AbsoluteFill style={{background: C.cr}}>
      <Svg>
        <SlideBar t={t} at={bt(n + 1)} cx={bx[0]} cy={430} len={520} th={18} deg={90} seed="b0" f={f} />
        <SlideBar t={t} at={bt(n + 2)} cx={bx[1]} cy={430} len={520} th={18} deg={90} from={-1} seed="b1" f={f} />
        <SlideBar t={t} at={bt(n + 1.5)} cx={960} cy={842} len={1640} th={26} deg={0} seed="b2" f={f} dur={6} />
        <SlideBar t={t} at={Math.min(P1, bt(n + 2.5))} cx={1260} cy={876} len={900} th={18} deg={0} from={-1} seed="b3" f={f} fill={C.red} dur={7} />
        {xs.map((x, i) => {
          const s = sp(t, bt(1 + i), 10, 200);
          if (s <= 0) return null;
          const sc = s + jolt * (i === 1 ? -1 : 1);
          return (
            <g key={i} transform={`translate(${x} 430) scale(${sc}) rotate(${(1 - s) * 40 + rnd(`d${i}`) * 4})`}>
              <Cut pts={circPts(0, 0, 210, 44)} fill={cols[i]} seed={`disc${i}`} f={f} amp={5} />
            </g>
          );
        })}
      </Svg>
      {items.map((it, i) => {
        const s = sp(t, bt(1 + i) + 2, 10, 200);
        return s > 0 ? (
          <Pop key={i} x={xs[i]} y={442} s={s + jolt} rot={rnd(`n${i}`) * 4}>
            <div style={{display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap', color: C.wh, lineHeight: 1}}>
              <span style={{fontFamily: DM, fontSize: it.size}}>{it.n}</span>
              {it.unit && <span style={{fontFamily: SERIF, fontWeight: 900, fontSize: it.size * 0.38, marginLeft: it.size * 0.04}}>{it.unit}</span>}
            </div>
          </Pop>
        ) : null;
      })}
      {items.map((it, i) => it.label ? <Type key={i} text={it.label} size={it.labelSize} color={C.ink} seed={`lb${i}`} x={xs[i]} y={672} align="center" t={t} at={bt(1 + i) + 5} stagger={4} /> : null)}
      {c.head && <Type text={c.head} size={c.headSize} font={BEBAS} color={C.ink} seed="cast" x={110} y={66} t={t} at={4} stagger={1} spacing={c.headSize * 0.29} wobble={0.5} />}
      {c.note && <Type text={c.note} size={c.noteSize} color={C.red} seed="nine" x={1810} y={70} align="right" t={t} at={bt(n + 1.5)} stagger={2} />}
    </AbsoluteFill>
  );
};

/* ═══ cast：主演一位一位登場（剪影色塊從上落下、名字從黑條底下抽出、角色小字、重點小框） ═══ */
type CastIt = {name: string; nameSize: number; en: string; enSize: number; role: string; roleSize: number; hook: string; hookSize: number; icon: string; at: number; slot: number};
export const ChCast: React.FC<ChP> = ({t, f, c}) => {
  const items = c.items as CastIt[];
  const n = items.length;
  const strip = k(t, 0, 12, EO);
  const jolt = 0.06 * bell(k(t, H1 - 1, H1 + 8, LIN));
  const cols = [C.or, C.mu];
  const win = (s: number) => {
    const ts = bt(items[s].at);
    const te = ts + bt(items[s].slot);
    return {ts, te, last: s === n - 1};
  };
  return (
    <AbsoluteFill style={{background: C.te}}>
      <Svg>
        <g transform={`translate(0 ${(strip - 1) * 1200})`}>
          <Cut pts={rectPts(100, -30, 236, 1140)} fill={C.cr} seed="strip" f={f} amp={4} />
        </g>
        {items.map((it, s) => {
          const {ts, te, last} = win(s);
          const pin = k(t, ts, ts + 9, EO);
          const pout = last ? 0 : k(t, te - 6, te + 3, EI);
          if (pin <= 0 || pout >= 1) return null;
          const y = (pin - 1) * 1100 + pout * 1100;
          const sc = 1 + jolt + 0.03 * bell(k(t, ts + 9, ts + 15, LIN));
          const col = cols[s % 2];
          return (
            <g key={s} transform={`translate(700 ${470 + y}) scale(${sc}) rotate(${rnd(`bl${s}`) * 6})`}>
              <Cut pts={circPts(0, 0, 270, 40)} fill={col} seed={`blob${s}`} f={f} amp={9} step={50} />
              <g transform="translate(-230 -230) scale(2.3)"><Icon name={it.icon} fill={C.ink} hole={col} wheel={C.ink} t={t} /></g>
            </g>
          );
        })}
        {items.map((it, s) => {
          const {ts, te, last} = win(s);
          const pin = k(t, ts + 1, ts + 9, EO);
          const pout = last ? 0 : k(t, te - 5, te + 2, EI);
          if (pin <= 0 || pout >= 1) return null;
          const x = 1420 - (1 - pin) * 2200 + pout * 2200;
          return <Cut key={s} pts={barPts(x, 505, 780, 20, 0)} fill={C.ink} seed={`ul${s}`} f={f} amp={2} />;
        })}
      </Svg>
      <Type text={c.head} size={c.headSize} color={C.ink} seed="zy" x={218 - c.headSize / 2} y={180} vertical t={t} at={4} stagger={4} />
      <div style={{position: 'absolute', left: 218, top: 540, transform: 'translateX(-50%)', fontFamily: BEBAS, fontSize: c.headEnSize, letterSpacing: c.headEnSize * 0.12, color: C.te, opacity: strip, whiteSpace: 'nowrap'}}>{c.headEn}</div>
      {items.map((it, s) => {
        const {ts, te, last} = win(s);
        const op = last ? 1 : 1 - k(t, te - 5, te, LIN);
        if (t < ts || op <= 0) return null;
        return (
          <div key={s} style={{position: 'absolute', inset: 0, opacity: op}}>
            <Slide p={k(t, ts + 3, ts + 12, EO)} x={1030} y={318}>
              <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: it.nameSize, lineHeight: 1.2, color: C.wh}}>{it.name}</div>
            </Slide>
            {it.en && (
              <Slide p={k(t, ts + 6, ts + 14, EO)} x={1032} y={530}>
                <div style={{fontFamily: BEBAS, fontSize: it.enSize, letterSpacing: it.enSize * 0.21, color: C.mu, lineHeight: 1.1}}>{it.en}</div>
              </Slide>
            )}
            {it.role && (
              <Slide p={k(t, ts + 8, ts + 16, EO)} x={1032} y={610}>
                <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: it.roleSize, color: C.cr, lineHeight: 1.3}}>{it.role}</div>
              </Slide>
            )}
            {it.hook && (
              <Pop x={1040} y={740} s={sp(t, ts + 13, 10, 220)} rot={-3}>
                <div style={{transform: 'translateX(50%)', background: C.mu, color: C.ink, fontFamily: SERIF, fontWeight: 900, fontSize: it.hookSize, padding: '6px 22px', whiteSpace: 'nowrap'}}>{it.hook}</div>
              </Pop>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ═══ cards：2～4 張剪紙卡從兩側飛入（剪影＋名字＋說明＋英文），中央紅色標在銅管搶拍彈出 ═══ */
type CardIt = {name: string; nameSize: number; sub: string; subSize: number; en: string; enSize: number; icon: string; at: number};
const CARD_POS: Record<number, [number, number, number][]> = {
  2: [[90, 110, -1], [990, 560, 1]],
  3: [[90, 110, -1], [990, 110, 1], [540, 560, -1]],
  4: [[90, 110, -1], [990, 110, 1], [90, 560, -1], [990, 560, 1]],
};
export const ChCards: React.FC<ChP> = ({t, f, c}) => {
  const items = c.items as CardIt[];
  const pos = CARD_POS[items.length] ?? CARD_POS[4];
  const tagAt: number = c.tagAt;
  const tag = tagAt ? sp(t, bt(tagAt), 9, 240) : 0;
  return (
    <AbsoluteFill style={{background: C.mu}}>
      <Svg>
        <SlideBar t={t} at={2} cx={960} cy={480} len={1000} th={20} deg={90} seed="c0" f={f} />
        <SlideBar t={t} at={7} cx={960} cy={482} len={1780} th={22} deg={0} from={-1} seed="c1" f={f} />
      </Svg>
      {items.map((it, i) => {
        const [x, y, dir] = pos[i];
        const at = bt(it.at);
        const p = sp(t, at, 13, 170);
        if (p <= 0) return null;
        const bob = -6 * Math.max(0, 1 - ((t % B) / B) / 0.4) * (t > at + 12 ? 1 : 0);
        return (
          <div key={i} style={{position: 'absolute', left: x + (1 - p) * dir * 1500, top: y, width: 840, height: 300, transform: `rotate(${(1 - p) * dir * 9 + rnd(`cd${i}`) * 1.2}deg)`}}>
            <svg width={860} height={320} style={{position: 'absolute', left: -10, top: -10}}>
              <Cut pts={rectPts(10, 10, 840, 300)} fill={C.cr} seed={`card${i}`} f={f} amp={4} />
              <g transform={`translate(36 ${48 + bob}) scale(1.2)`}><Icon name={it.icon} fill={C.ink} hole={C.cr} wheel={C.ink} t={t} /></g>
            </svg>
            <Type text={it.name} size={it.nameSize} color={C.ink} seed={`cn${i}`} x={300} y={64} t={t} at={at + 6} stagger={2} />
            {it.sub && <div style={{position: 'absolute', left: 304, top: 172, fontFamily: SERIF, fontWeight: 900, fontSize: it.subSize, color: C.te, whiteSpace: 'nowrap', opacity: k(t, at + 12, at + 18)}}>{it.sub}</div>}
            {it.en && <div style={{position: 'absolute', left: 304, top: 228, fontFamily: BEBAS, fontSize: it.enSize, letterSpacing: it.enSize * 0.22, color: C.or, whiteSpace: 'nowrap', opacity: k(t, at + 14, at + 20)}}>{it.en}</div>}
          </div>
        );
      })}
      {tag > 0 && (
        <Pop x={960} y={482} s={tag} rot={-3}>
          <div style={{background: C.red, padding: '8px 34px', display: 'flex', alignItems: 'baseline', gap: 24, whiteSpace: 'nowrap', boxShadow: '7px 9px 0 rgba(22,20,18,0.25)'}}>
            {c.tag && <span style={{fontFamily: SERIF, fontWeight: 900, fontSize: c.tagSize, color: C.wh}}>{c.tag}</span>}
            {c.tagEn && <span style={{fontFamily: BEBAS, fontSize: c.tagEnSize, letterSpacing: c.tagEnSize * 0.2, color: C.cr}}>{c.tagEn}</span>}
          </div>
        </Pop>
      )}
    </AbsoluteFill>
  );
};

