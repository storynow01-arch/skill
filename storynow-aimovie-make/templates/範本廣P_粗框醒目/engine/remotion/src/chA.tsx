/* 廣P 章型（一）：start 開始按鈕→名稱視窗爆出／buttons 大按鈕／board 看板拖曳／checklist 勾選清單（原作第 1～5 章）。
   每章的字、字級、登場拍點全部讀 timeline.json（c＝這一章的資料，t＝章內格數）。 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ChP, DigitCol, EI, EIO, EO, LAB, bell, k, lerp, nb, sp} from './kit';
import {Btn, Burst, C, Check, Cursor, DotBg, MONO, SG, Sticker, TC, Tape, Win, abs, bx, clicks, path, pop, slap, tap} from './ui';

/* ───── start：游標點下「開始」→ 名稱視窗爆出 ───── */
export const ChStart: React.FC<ChP> = ({t, c}) => {
  const hit = nb(4);
  const pr = tap(t, nb(3), 6);
  const btnS = pop(t, 0) * (1 - k(t, hit, hit + 4, EI));
  const winS = pop(t, hit);
  const [cx, cy] = path(t, [[0, 1760, 800], [nb(2), 1000, 570], [nb(4) + 3, 1000, 570], [nb(6), 1990, 800]]);
  const cl = clicks(t, [nb(3)], 6);
  const sub = k(t, nb(5), nb(5) + 7, EO);
  const st = c.stickers as {text: string; size: number; at: number}[];
  return (
    <AbsoluteFill>
      <DotBg bg={C.y} />
      <Tape y={0} t={t} text={c.tape} bg={C.w} p={c.tape ? k(t, nb(c.tapeAt), nb(c.tapeAt) + 8, EO) : 0} />
      {t < hit + 4 && (
        <Btn x={760} y={455} w={400} h={170} bg={C.p} press={pr} s={btnS}>
          <span style={{fontFamily: TC, fontWeight: 900, fontSize: c.btnSize, color: C.k, marginRight: 26, whiteSpace: 'nowrap'}}>{c.btn}</span>
          <svg width={60} height={70}><path d="M4,4 L56,35 L4,66 Z" fill={C.k} /></svg>
        </Btn>
      )}
      <Win x={260} y={170} w={1400} h={600} title={c.app} bar={C.p} s={winS}>
        <div style={{...abs, inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{fontFamily: TC, fontWeight: 900, fontSize: c.titleSize, lineHeight: 1.1, color: C.k, letterSpacing: '0.04em', whiteSpace: 'nowrap'}}>{c.title}</div>
          {c.sub && (
            <div style={{overflow: 'hidden', marginTop: 10}}>
              <div style={{fontFamily: MONO, fontWeight: 700, fontSize: c.subSize, color: C.k, whiteSpace: 'nowrap', transform: `translateY(${(1 - sub) * 110}%)`}}>&gt; {c.sub}_</div>
            </div>
          )}
        </div>
      </Win>
      <Burst t={t} at={hit} cx={960} cy={470} seed="c1" n={20} />
      {c.badge.length > 0 && (
        <Win x={1340} y={92} w={500} h={230} title={c.badgeTitle} bar={C.y} bg={C.b} rot={4} s={pop(t, nb(6))}>
          <div style={{...abs, inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: SG, fontWeight: 700,
            fontSize: c.badgeSize, lineHeight: 1, color: C.w, whiteSpace: 'nowrap'}}>
            {(c.badge as string[]).map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </Win>
      )}
      {c.en && <Sticker x={300} y={722} p={slap(t, nb(c.enAt))} rot={-4} bg={C.m} font={MONO} fs={c.enSize}>{c.en}</Sticker>}
      {st[0] && <Sticker x={60} y={300} p={slap(t, nb(st[0].at))} rot={-8} bg={C.b} color={C.w} fs={st[0].size}>{st[0].text}</Sticker>}
      {st[1] && <Sticker right={1880} y={706} p={slap(t, nb(st[1].at))} rot={6} bg={C.w} fs={st[1].size}>{st[1].text}</Sticker>}
      {t < nb(6) + 2 && <Cursor x={cx} y={cy} down={cl.down} click={cl.click} />}
    </AbsoluteFill>
  );
};

/* ───── buttons：2～3 顆大按鈕從上方掉下來，游標一顆顆按下 ───── */
const BG2 = [C.y, C.p, C.m];
const BAR2 = [C.p, C.m, C.y];
export const ChButtons: React.FC<ChP> = ({t, c}) => {
  const IT = c.items as {n: string; size: number; unit: string; en: string; enSize: number; tip: string; tipSize: number; tap: number}[];
  const N = IT.length;
  const x0 = 960 - (N * 570 - 50) / 2;
  const hs = k(t, 0, 6, EO);
  const taps = IT.map((it) => nb(it.tap));
  const cl = clicks(t, taps);
  const keys: [number, number, number][] = [[taps[0] - nb(1), 1990, 800]];
  IT.forEach((_, i) => {
    keys.push([taps[i] - 2, x0 + i * 570 + 280, 500]);
    keys.push([taps[i] + 4, x0 + i * 570 + 280, 500]);
  });
  const outAt = taps[N - 1] + nb(2);
  keys.push([outAt, 1990, 800]);
  const [cx, cy] = path(t, keys);
  return (
    <AbsoluteFill>
      <DotBg bg={C.b} dot="rgba(17,17,17,0.32)" />
      {c.head && (
        <div style={{...abs, left: 430, top: 56, width: 1060, height: 150, ...bx(C.w, 14), display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: TC, fontWeight: 900, fontSize: c.headSize, color: C.k, whiteSpace: 'nowrap', transform: `scale(${lerp(1.5, 1, hs)}) rotate(${lerp(-6, -1.5, hs)}deg)`}}>
          {c.head}
        </div>
      )}
      <Sticker x={1400} y={30} p={slap(t, nb(c.allAt))} rot={7} bg={C.y} font={MONO} fs={32}>{LAB.selectAll}</Sticker>
      {IT.map((it, i) => {
        const at = nb(1 + i);
        if (t < at) return null;
        const dr = sp(t, at, 12, 200);
        const x = x0 + i * 570;
        const pr = tap(t, taps[i]);
        return (
          <React.Fragment key={i}>
            <Btn x={x} y={270} w={520} h={380} bg={BG2[i]} press={pr} style={{flexDirection: 'column', transform: `translate(${14 * pr}px,${(1 - dr) * -900 + 14 * pr}px) rotate(${(1 - dr) * (i - 1) * 14}deg)`}}>
              <div style={{display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap'}}>
                <span style={{fontFamily: SG, fontWeight: 700, fontSize: it.size, lineHeight: 0.95, color: C.k}}>{it.n}</span>
                {it.unit && <span style={{fontFamily: TC, fontWeight: 900, fontSize: it.size * 0.5, color: C.k, marginLeft: it.size * 0.06}}>{it.unit}</span>}
              </div>
              {it.en && <div style={{fontFamily: MONO, fontWeight: 700, fontSize: it.enSize, color: C.k, marginTop: 10, ...bx(C.w, 0, 4), padding: '2px 16px', whiteSpace: 'nowrap'}}>{it.en}</div>}
            </Btn>
            {it.tip && (
              <Win x={x} y={700} w={520} h={180} title={`${it.n} ${it.unit}`} bar={BAR2[i]} s={pop(t, taps[i] + 3)} ox="top center" sh={10}>
                <div style={{...abs, inset: 0, display: 'flex', alignItems: 'center', padding: '6px 22px', fontFamily: TC, fontWeight: 700, fontSize: it.tipSize, lineHeight: 1.3, color: C.k}}>{it.tip}</div>
              </Win>
            )}
            <Sticker x={x + 340} y={246} p={slap(t, taps[i] + 2)} rot={9} bg={C.w} fs={34}>{LAB.selected}</Sticker>
          </React.Fragment>
        );
      })}
      {t > taps[0] - nb(1) && t < outAt + 2 && <Cursor x={cx} y={cy} down={cl.down} click={cl.click} />}
    </AbsoluteFill>
  );
};

/* ───── 看板卡片 ───── */
type CardD = {name: string; nameSize: number; tag: string; tagSize: number; en: string; enSize: number; hook: string; hookSize: number;
  st: number; grab: number; drop: number; hookAt: number};
const Card: React.FC<{x: number; y: number; w: number; h: number; col: string; d: CardD; rot?: number; s?: number; sh?: number; big?: boolean; children?: React.ReactNode}> = (q) => (
  <div style={{...abs, left: q.x, top: q.y, width: q.w, height: q.h, ...bx(C.w, q.sh ?? 12), transform: `rotate(${q.rot ?? 0}deg) scale(${q.s ?? 1})`}}>
    <div style={{height: q.big ? 58 : 50, background: q.col, borderBottom: `5px solid ${C.k}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 16px',
      fontFamily: MONO, fontWeight: 700, fontSize: q.d.enSize, color: q.col === C.b ? C.w : C.k, whiteSpace: 'nowrap', overflow: 'hidden'}}>{q.d.en}</div>
    <div style={{padding: q.big ? '20px 24px' : '14px 18px'}}>
      <div style={{fontFamily: TC, fontWeight: 900, fontSize: q.d.nameSize, lineHeight: 1.15, color: C.k, whiteSpace: 'nowrap'}}>{q.d.name}</div>
      {q.d.tag && <div style={{fontFamily: TC, fontWeight: 700, fontSize: q.d.tagSize, lineHeight: 1.3, color: C.k, marginTop: 10}}>{q.d.tag}</div>}
    </div>
    {q.children}
  </div>
);
const COL3 = [C.y, C.p, C.b, C.m];

/* ───── board：卡片被游標拖進看板（deck＝從左邊牌堆拖進格子；drop＝從畫面上方拖下來） ───── */
export const ChBoard: React.FC<ChP> = ({t, c}) => {
  const IT = c.items as CardD[];
  const n = IT.length;
  const W: number = c.W, H: number = c.H;
  const deck = c.mode === 'deck';
  const DECK = {x: 110, y: 340};
  const slot = (j: number) => (deck
    ? {x: 660 + (j % 2) * 580, y: n <= 2 ? 330 : 150 + Math.floor(j / 2) * 360}
    : {x: 960 - (n * W + (n - 1) * 50) / 2 + j * (W + 50), y: 210});
  const st = (j: number) => nb(IT[j].st), gr = (j: number) => nb(IT[j].grab), dp = (j: number) => nb(IT[j].drop);
  const keys: [number, number, number][] = deck ? [[0, 1990, 800]] : [[0, slot(0).x + W / 2, -492]];
  for (let j = 0; j < n; j++) {
    const s = slot(j);
    if (deck) {
      keys.push([gr(j) - 1, DECK.x + W / 2, DECK.y + 30], [gr(j), DECK.x + W / 2, DECK.y + 30], [dp(j), s.x + W / 2, s.y + 30]);
    } else {
      keys.push([st(j), s.x + W / 2, -492], [dp(j), s.x + W / 2, 238], [dp(j) + 3, s.x + W / 2, 238]);
    }
  }
  const outAt = dp(n - 1) + (deck ? 12 : 14);
  keys.push([outAt, 1990, 800]);
  const [cx, cy] = path(t, keys);
  const down = IT.some((_, j) => t >= (deck ? gr(j) : st(j)) && t < dp(j) + (deck ? 1 : 2)) ? 1 : 0;
  const grabbed = IT.filter((_, j) => t >= gr(j)).length;
  const hook = (d: CardD, j: number) => d.hook ? (
    <Sticker x={deck ? 18 : 24} y={H - (deck ? 62 : 100)} p={slap(t, nb(d.hookAt))} rot={j % 2 ? 4 : -4} bg={j % 2 ? C.m : C.y} fs={d.hookSize}>{d.hook}</Sticker>
  ) : null;
  const card = (j: number) => {
    const d = IT[j];
    const s = slot(j);
    if (deck) {
      let x = DECK.x + (j - grabbed) * 12, y = DECK.y + (j - grabbed) * 12, rot = 0, sc = 1, sh = 12;
      if (t >= gr(j) && t < dp(j)) {
        const p = k(t, gr(j), dp(j), EIO);
        x = lerp(DECK.x, s.x, p); y = lerp(DECK.y, s.y, p); rot = -7 * bell(p) + (j % 2 ? 3 : -3) * p; sc = 1.06; sh = 24;
      } else if (t >= dp(j)) {
        const se = sp(t, dp(j), 8, 320);
        x = s.x; y = s.y; rot = (1 - se) * (j % 2 ? 3 : -3); sc = lerp(1.06, 1, se);
      }
      return <Card key={j} x={x} y={y} w={W} h={H} col={COL3[j % 4]} d={d} rot={rot} s={sc} sh={sh}>{hook(d, j)}</Card>;
    }
    if (t < st(j) - 1) return null;
    const p = k(t, st(j), dp(j), EIO);
    const se = sp(t, dp(j), 8, 320);
    const dragging = t < dp(j);
    const rot = dragging ? (j % 2 ? -1 : 1) * 6 * bell(p) : (1 - se) * (j % 2 ? -3 : 3);
    return <Card key={j} x={s.x} y={lerp(-560, 210, p)} w={W} h={H} col={COL3[j % 4]} d={d} rot={rot} s={dragging ? 1.05 : lerp(1.05, 1, se)} sh={dragging ? 24 : 12} big>{hook(d, j)}</Card>;
  };
  const idx = IT.map((_, j) => j);
  return (
    <AbsoluteFill>
      <DotBg bg={C.m} />
      <Win x={60} y={40} w={1800} h={860} title={c.title} bar={deck ? C.y : C.p} />
      {idx.map((j) => {
        const s = slot(j);
        return (
          <div key={j} style={{...abs, left: s.x, top: s.y, width: W, height: H, border: '5px dashed rgba(17,17,17,0.35)', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SG, fontWeight: 700, fontSize: 90, color: 'rgba(17,17,17,0.18)'}}>0{j + 1}</div>
        );
      })}
      {deck && <div style={{...abs, left: DECK.x - 10, top: DECK.y - 10, width: W + 40, height: H + 40, border: '5px dashed rgba(17,17,17,0.35)', boxSizing: 'border-box'}} />}
      {c.note && <Sticker x={150} y={deck ? 200 : 122} p={1} rot={-4} bg={deck ? C.p : C.b} color={deck ? C.k : C.w} fs={c.noteSize}>{c.note}</Sticker>}
      {deck ? (
        <>
          {idx.slice().reverse().filter((j) => t < gr(j)).map((j) => card(j))}
          {idx.filter((j) => t >= gr(j)).map((j) => card(j))}
        </>
      ) : idx.map((j) => card(j))}
      {c.notifyAt > 0 && (
        <Win x={1300} y={690} w={520} h={170} title={LAB.notify} bar={C.m} s={pop(t, nb(c.notifyAt))} rot={-2}>
          <div style={{...abs, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TC, fontWeight: 900, fontSize: c.doneSize, color: C.k, whiteSpace: 'nowrap'}}>{c.done}</div>
        </Win>
      )}
      <Sticker x={deck ? 150 : 160} y={deck ? 730 : 700} p={slap(t, nb(c.ddAt))} rot={-5} bg={C.y} font={MONO} fs={34}>{LAB.dragDone}</Sticker>
      {t < outAt && <Cursor x={cx} y={cy} down={down} />}
    </AbsoluteFill>
  );
};

/* ───── checklist：一項項打勾、底色填滿、完成計數 ───── */
const HLC = [C.y, C.p, C.m];
export const ChCheck: React.FC<ChP> = ({t, c}) => {
  const IT = c.items as {text: string; size: number; ck: number}[];
  const n = IT.length;
  const SP: number = c.sp;
  const RH = SP - 18;
  const WH = Math.min(850, 56 + 22 + n * SP + 20 + 70 + 50);
  const WY = Math.max(46, 470 - WH / 2);
  const ck = (i: number) => nb(IT[i].ck);
  const cl = clicks(t, IT.map((_, i) => ck(i)));
  const keys: [number, number, number][] = [[0, 1990, 800]];
  IT.forEach((_, i) => {
    keys.push([ck(i) - 6, 336, WY + 56 + 22 + i * SP + RH / 2 - 8]);
    keys.push([ck(i) + 3, 336, WY + 56 + 22 + i * SP + RH / 2 - 8]);
  });
  const outAt = ck(n - 1) + nb(2);
  keys.push([outAt, 1990, 800]);
  const [cx, cy] = path(t, keys);
  const done = IT.reduce((a, _, i) => a + k(t, ck(i) + 1, ck(i) + 8, EO), 0);
  const st = c.stickers as {text: string; size: number; at: number}[];
  const SR = [{r: 1720, y: 160, rot: 6, bg: C.y}, {r: 1790, y: 372, rot: -4, bg: C.m}, {r: 1850, y: 560, rot: 5, bg: C.p}];
  return (
    <AbsoluteFill>
      <DotBg bg={C.w} />
      <Win x={240} y={WY} w={1440} h={WH} title={c.title} bar={C.b} s={pop(t, 0)}>
        {IT.map((h, i) => {
          const ps = pop(t, i * 4);
          if (ps <= 0.002) return null;
          const fill = k(t, ck(i) + 2, ck(i) + 9, EO);
          return (
            <div key={i} style={{...abs, left: 34, top: 22 + i * SP, width: 1360, height: RH, ...bx(C.w, 6, 5), display: 'flex', alignItems: 'center', gap: 26, padding: '0 22px',
              transform: `translateX(${(1 - Math.min(1, ps)) * -80}px)`, overflow: 'hidden'}}>
              <div style={{...abs, left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: HLC[i % 3]}} />
              <div style={{position: 'relative'}}><Check size={60} p={k(t, ck(i) + 1, ck(i) + 6, EO)} /></div>
              <div style={{position: 'relative', fontFamily: TC, fontWeight: 900, fontSize: h.size, color: C.k, whiteSpace: 'nowrap'}}>{h.text}</div>
            </div>
          );
        })}
        <div style={{...abs, left: 34, top: 22 + n * SP + 20, width: 1360, height: 70, display: 'flex', alignItems: 'center', gap: 24}}>
          <div style={{fontFamily: TC, fontWeight: 900, fontSize: 40, color: C.k, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap'}}>
            {LAB.done} <span style={{fontFamily: SG, marginLeft: 14}}><DigitCol w={done} /></span><span style={{fontFamily: SG}}>/{n}</span>
          </div>
          <div style={{flex: 1, height: 56, ...bx(C.w, 6, 5), position: 'relative', overflow: 'hidden'}}>
            <div style={{...abs, left: 0, top: 0, bottom: 0, width: `${(done / n) * 100}%`, background: C.b, borderRight: done > 0.05 ? `5px solid ${C.k}` : 'none'}} />
          </div>
        </div>
      </Win>
      {st.map((s, i) => (
        <Sticker key={i} right={SR[i].r} y={SR[i].y} p={slap(t, nb(s.at))} rot={SR[i].rot} bg={SR[i].bg} fs={s.size}>{s.text}</Sticker>
      ))}
      {t < outAt && <Cursor x={cx} y={cy} down={cl.down} click={cl.click} />}
    </AbsoluteFill>
  );
};
