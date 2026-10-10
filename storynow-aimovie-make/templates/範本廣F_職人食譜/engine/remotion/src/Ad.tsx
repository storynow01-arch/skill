/* 範本廣F「職人食譜」——俯拍料理檯，主廚的手照著黑板把任何主題寫成一份食譜：
   標題／副標／出處 → 材料 1～4 項（道具滑進來，手剁蔥、敲蛋、倒牛奶拉花、打蛋，回黑板打勾）
   → 步驟 1～4 項（桌牌、餐蓋、香料、蛋糕；手撒香料、放莓果）→ 道具全部飛進烤盤 → 推進烤箱、轉計時器、滴答 →「叮！」
   → 開門端出盤子，醬汁寫出名稱、撒裝飾 → 黑板寫上菜與結語，手放上出處小卡。
   所有時間、位置、字都讀 timeline.json（engine/timeline.py 依 storyboard 排）；配樂 music.py 讀同一份。
   原作：02_試做/廣告30風格 第 15 支 Ad15.tsx（固定 60 秒、屏榮餐飲科）。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {C, EI, EIO, EO, J, k, lerp, LIN, settle, ev, evs, has, Task, Prop} from './core';
import {Board, eraserAt, LINES, lineBox, tickAt, writeP} from './board';
import {WENKAI} from './fonts';
import {Bowl, Cake, Card, Cloche, Counter, Cup, CuttingBoard, Dish, Flour, Hand, Hat, Oven, Plate, Saucer, Spice, Tag, Tent, Timer, Tool, WhiskBowl} from './art';

/* ───────── 鏡頭（整個世界一起動；拍點上推一下、震一下） ───────── */
const CAM = J.cam;
const cam = (f: number) => {
  let i = 0;
  while (i + 1 < CAM.length && f >= CAM[i + 1][0]) i++;
  const a = CAM[i];
  const b = CAM[Math.min(i + 1, CAM.length - 1)];
  const p = b === a ? 0 : k(f, a[0], b[0], EIO);
  let s = lerp(a[1], b[1], p);
  let ty = 0;
  for (const [t, amp] of J.kicks) {
    if (f >= t && f < t + 40) {
      const e = Math.exp(-(f - t) / 5);
      s *= 1 + amp * e;
      ty += amp * 260 * e * Math.cos((f - t) * 1.3);
    }
  }
  return {s, ox: lerp(a[2], b[2], p), oy: lerp(a[3], b[3], p), ty};
};

/* ───────── 主角：主廚的手（任務排程讀時間表） ───────── */
type Pose = {x: number; y: number; rot: number; grip: number; tool: Tool; pour?: number};
const DISH = {x: 1150, y: 480};
const [push0, push1] = evs('push');
const dishX = (f: number) => lerp(DISH.x, 1650, k(f, push0, push1, EIO));
const hasCard = !!(J.d.card.url || J.d.card.head);
const [card0, card1] = hasCard ? evs('card_in') : [1e9, 1e9];
const cardX = (f: number) => lerp(2240, 1650, k(f, card0, card1, EO));
const n = (t: Task, key: string) => t[key] as number;

const poseOf = (t: Task, f: number): Pose => {
  switch (t.type) {
    case 'write': {
      const id = t.id as string;
      const L = LINES[id];
      const p = writeP(f, id);
      if (L.kind === 'tick') {
        const [tx, ty] = tickAt(p);
        return {x: L.x + 6 + tx, y: L.y + ty + 4, rot: 26, grip: 0.7, tool: 'chalk'};
      }
      const {left, w} = lineBox(id);
      const cnt = Math.max(1, [...L.text].length);
      const wob = Math.sin(p * cnt * Math.PI * 3) * L.size * 0.2;
      return {x: left + p * w, y: L.y + L.size * 0.85 + wob, rot: 26 - 6 * p, grip: 0.7, tool: 'chalk'};
    }
    case 'erase': {
      const e = eraserAt(Math.min(t.b, Math.max(t.a, f)))!;
      return {x: e.x, y: e.y + 34, rot: 14, grip: 0.5, tool: 'eraser'};
    }
    case 'chop': {
      const hits = t.hits as number[];
      const gap = n(t, 'gap');
      const ff = Math.max(f, hits[0] - gap);
      const idx = Math.max(0, Math.min(3, Math.round((ff - hits[0]) / gap)));
      const h3 = hits[hits.length - 1];
      const h = f > h3 ? 70 * k(f, h3, h3 + 8) : 70 * Math.abs(Math.sin((Math.PI * (ff - hits[0])) / gap));
      return {x: n(t, 'x') - idx * 24 * n(t, 'sc'), y: n(t, 'y') - h, rot: 6, grip: 0.8, tool: 'cleaver'};
    }
    case 'egg': {
      const g = n(t, 'go');
      const c = n(t, 'crack');
      const p = k(f, g, c, EIO);
      const hit = f >= c ? Math.exp(-(f - c) / 4) * 14 : 0;
      return {x: lerp(n(t, 'x0'), n(t, 'x1'), p), y: lerp(n(t, 'y0'), n(t, 'y1'), p) + hit, rot: 4, grip: f >= c ? 0.2 : 0.75, tool: f >= c ? 'none' : 'egg'};
    }
    case 'pour': {
      const tilt = k(f, n(t, 'p0') - 6, n(t, 'p0') + 4) * (1 - k(f, n(t, 'p1') - 4, n(t, 'p1') + 4));
      return {x: n(t, 'x') + Math.sin(f * 0.25) * 6 * tilt, y: n(t, 'y'), rot: -4, grip: 0.8, tool: 'pitcher', pour: tilt};
    }
    case 'whisk': {
      const on = k(f, n(t, 'w0') - 2, n(t, 'w0') + 4) * (1 - k(f, n(t, 'w1') - 2, n(t, 'w1') + 4));
      const th = (f - n(t, 'w0')) * 0.62;
      return {x: n(t, 'x') + Math.cos(th) * 34 * on * n(t, 'sc'), y: n(t, 'y') - 64 + Math.sin(th) * 22 * on, rot: 6 + Math.sin(th) * 6 * on, grip: 0.85, tool: 'whisk'};
    }
    case 'sprinkle':
      return {x: n(t, 'x') + Math.sin(f * 1.6) * 9, y: n(t, 'y'), rot: 10, grip: 0.9, tool: 'pinch'};
    case 'berry': {
      const p = k(f, n(t, 'p0'), n(t, 'p1'), EIO);
      const done = f >= n(t, 'p1');
      return {x: lerp(n(t, 'x0'), n(t, 'x1'), p), y: lerp(n(t, 'y0'), n(t, 'y1'), p) - (done ? 18 * k(f, n(t, 'p1'), n(t, 'p1') + 4) : 0), rot: 4, grip: done ? 0.3 : 0.8, tool: done ? 'none' : 'berry'};
    }
    case 'push':
      return {x: dishX(f) - 196, y: 470, rot: -34, grip: 0.25, tool: 'none'};
    case 'twist':
      return {x: 1060, y: 712, rot: 12 - 40 * k(f, t.a + 4, t.b - 4, EIO), grip: 0.85, tool: 'none'};
    case 'tap': {
      const ph = ((f - t.a) % J.beat) / J.beat;
      const tap = Math.max(0, 1 - ph / 0.35);
      return {x: 640, y: 900 - 14 * (1 - tap), rot: 22, grip: 0.55 + 0.25 * tap, tool: 'chalk'};
    }
    case 'card':
      return {x: cardX(f) - 30, y: 586, rot: 18, grip: 0.7, tool: 'none'};
    default:
      return {x: -999, y: -999, rot: 0, grip: 0, tool: 'none'};
  }
};

const TASKS: Task[] = [...J.tasks, ...J.erase.map(([a, d]) => ({type: 'erase', a, b: a + d}) as Task)].sort((x, y) => x.a - y.a);
const OFF = 460; // 手收到畫面外（往上）
const mixPose = (a: Pose, b: Pose, p: number): Pose => ({
  x: lerp(a.x, b.x, p),
  y: lerp(a.y, b.y, p),
  rot: lerp(a.rot, b.rot, p),
  grip: lerp(a.grip, b.grip, p),
  tool: p < 0.5 ? a.tool : b.tool,
  pour: 0,
});
const up = (q: Pose, d: number): Pose => ({...q, y: q.y - d});
const handPose = (f: number): Pose => {
  let prev: Task | null = null;
  let next: Task | null = null;
  for (const t of TASKS) {
    if (f >= t.a && f <= t.b) return poseOf(t, f);
    if (t.b < f && (!prev || t.b > prev.b)) prev = t;
    if (t.a > f && !next) next = t;
  }
  if (!prev && next) return mixPose(up(poseOf(next, next.a), OFF + 300), poseOf(next, next.a), k(f, next.a - 16, next.a, EO));
  if (prev && !next) return mixPose(poseOf(prev, prev.b), up(poseOf(prev, prev.b), OFF + 300), k(f, prev.b, prev.b + 20, EI));
  if (!prev || !next) return {x: -999, y: -999, rot: 0, grip: 0, tool: 'none'};
  const A = poseOf(prev, prev.b);
  const Bp = poseOf(next, next.a);
  const gap = next.a - prev.b;
  if (gap <= 46) {
    const T = Math.min(gap, 18);
    return mixPose(A, Bp, k(f, next.a - T, next.a, EIO));
  }
  // 空檔長：先收回畫面上方，再回來
  if (f < prev.b + 18) return mixPose(A, up(A, OFF), k(f, prev.b, prev.b + 18, EI));
  if (f > next.a - 18) return mixPose(up(Bp, OFF), Bp, k(f, next.a - 18, next.a, EO));
  return up(A, OFF + 200);
};

const HandAt: React.FC<{q: Pose; opacity?: number}> = ({q, opacity = 1}) =>
  q.y < -700 ? null : (
    <div style={{position: 'absolute', left: q.x, top: q.y, transform: `rotate(${q.rot}deg)`, transformOrigin: '0 0', opacity}}>
      <Hand grip={q.grip} tool={q.tool} pour={q.pour} />
    </div>
  );

/* ───────── 料理檯上的物件（從上方或右邊滑入、停住、彈一下；快速移動時有殘影） ───────── */
const draw = (p: Prop, f: number): React.ReactNode => {
  const a = (key: string) => p[key] as number[];
  switch (p.kind) {
    case 'cut': return <CuttingBoard cuts={a('hits').map((c) => k(f, c, c + 6, EO))} />;
    case 'flour': return <Flour />;
    case 'bowl': return <Bowl egg={k(f, p.crack as number, (p.crack as number) + 10, EO)} />;
    case 'cup': return <Cup fill={k(f, a('pour')[0] + 6, a('pour')[1] - 6, LIN)} heart={k(f, a('pour')[1] - 10, a('pour')[1] + 6, EO)} />;
    case 'whisk': return <WhiskBowl mix={k(f, a('mix')[0], a('mix')[1], LIN)} />;
    case 'tag': return <Tag text={p.text as string} />;
    case 'tent': return <Tent />;
    case 'saucer': return <Saucer />;
    case 'cloche': return <Cloche />;
    case 'hat': return <Hat />;
    case 'spice': return <Spice color={p.color as string} seed={p.seed as number} />;
    case 'cake': return <Cake berry={k(f, a('berry')[1] - 2, a('berry')[1] + 4, EO)} />;
    default: return null;
  }
};
const G0 = ev('gather');
const itemPose = (it: Prop, i: number, f: number) => {
  const p = k(f, it.at - 14, it.at, EO);
  let x = it.frm === 'right' ? lerp(2250, it.x, p) : it.x;
  let y = it.frm === 'right' ? it.y : lerp(-280, it.y, p);
  let s = settle(f, it.at) * it.s;
  let rot = it.rot + (1 - p) * (it.frm === 'right' ? -10 : 8);
  // 全部倒進烤盤
  const g = k(f, G0 + i * 1.4, G0 + 24 + i * 1.4, EI);
  x = lerp(x, DISH.x, g);
  y = lerp(y, DISH.y, g);
  s *= 1 - g * 0.85;
  rot += g * 90;
  return {x, y, s, rot, o: 1 - k(g, 0.75, 1, LIN), g};
};

/** 殘影式動態模糊：位置變化大時，畫 3 層漸淡的舊位置 */
const Ghosted: React.FC<{f: number; pos: (fr: number) => {x: number; y: number}; draw: (fr: number, o: number) => React.ReactNode}> = ({f, pos, draw: d}) => {
  const a = pos(f);
  const b = pos(f - 1);
  const v = Math.hypot(a.x - b.x, a.y - b.y);
  const layers = v > 9 ? [3, 2, 1] : [];
  return (
    <>
      {layers.map((i) => (
        <React.Fragment key={i}>{d(f - i * 0.8, 0.32 * (1 - (i - 1) / 3))}</React.Fragment>
      ))}
      {d(f, 1)}
    </>
  );
};

const Place: React.FC<{x: number; y: number; s?: number; rot?: number; o?: number; children: React.ReactNode}> = ({x, y, s = 1, rot = 0, o = 1, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, opacity: o}}>
    <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s})`}}>{children}</div>
  </div>
);

/* ───────── 擺盤：醬汁寫出名稱 ───────── */
const PlateFood: React.FC<{f: number}> = ({f}) => {
  const [pa, pb] = evs('plating');
  const [ma] = evs('manage');
  const mb = evs('manage')[1];
  const [ga] = evs('garnish');
  const p = k(f, pa, pb, LIN);
  const {name: nm, size, over} = J.d.plate;
  let w = 0;
  for (const ch of nm) w += size * ((ch.codePointAt(0) as number) >= 0x2e80 ? 1 : ch === ' ' ? 0.3 : 0.6);
  const soft = 60;
  const px = p * (w + soft) - soft;
  const mp = k(f, ma, mb, EO);
  const dots = Array.from({length: 16}, (_, i) => i);
  return (
    <>
      <svg width={600} height={600} viewBox="-300 -300 600 600" style={{position: 'absolute', left: -300, top: -300, overflow: 'visible'}}>
        <path d="M-170,110 C-80,170 90,170 170,100" stroke={C.sauce} strokeWidth={14} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k(f, pa - 6, pa + 18, EO)} opacity={0.85} />
        {dots.map((i) => {
          const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
          const r = 196 + (i % 2) * 14;
          const sp = k(f, ga + i * 2, ga + i * 2 + 10, EO) * settle(f, ga + i * 2 + 10, 0.2);
          const col = ['#5C8B39', '#D4567A', '#E6A43A', '#5C8B39'][i % 4];
          return i % 4 === 3 ? (
            <ellipse key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} rx={16 * sp} ry={7 * sp} fill="#6FA34A" transform={`rotate(${(a * 180) / Math.PI + 90} ${Math.cos(a) * r} ${Math.sin(a) * r})`} />
          ) : (
            <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={(i % 2 ? 7 : 11) * sp} fill={col} />
          );
        })}
      </svg>
      {over && (
        <div style={{position: 'absolute', left: -230, top: -size * 0.46 - 56, width: 460, textAlign: 'center', fontFamily: WENKAI, fontWeight: 700, fontSize: 40, color: C.green, opacity: mp, transform: `translateY(${(1 - mp) * 14}px)`, whiteSpace: 'nowrap'}}>
          {over}
        </div>
      )}
      <div
        style={{
          position: 'absolute', left: -w / 2, top: -size * 0.6, width: w + 20, fontFamily: WENKAI, fontWeight: 700, fontSize: size, lineHeight: 1.2, whiteSpace: 'nowrap',
          color: C.sauce, WebkitMaskImage: `linear-gradient(90deg,#000 ${px}px,transparent ${px + soft}px)`, maskImage: `linear-gradient(90deg,#000 ${px}px,transparent ${px + soft}px)`,
        }}
      >
        {nm}
      </div>
    </>
  );
};

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const c = cam(f);

  // 烤盤
  const dIn = ev('dish_in');
  const dishVis = f >= dIn - 14 && f < push1;
  const dishPos = (fr: number) => ({x: fr < push0 ? DISH.x : dishX(fr), y: lerp(-300, DISH.y, k(fr, dIn - 14, dIn, EO))});
  const dough = k(f, G0 + 12, G0 + 34, EO);
  // 烤箱
  const [oi0, oi1] = evs('oven_in');
  const [oo0, oo1] = evs('oven_out');
  const ovenX = (fr: number) => 1420 + 700 * (1 - k(fr, oi0, oi1, EO)) + 760 * k(fr, oo0, oo1, EI);
  const ovenVis = f >= oi0 && f <= oo1;
  const doorC = ev('door_close');
  const door = k(f, doorC - 6, doorC, EI) * (1 - k(f, ev('door_open'), ev('door_open') + 8, EO));
  const glow = k(f, doorC, ev('dingf'), LIN) * (1 - k(f, evs('plate_out')[1], evs('plate_out')[1] + 30, LIN));
  // 計時器
  const [ti0, ti1] = evs('timer_in');
  const ticks = evs('ticks');
  const dingF = ev('dingf');
  let tAng = -160 * k(f, evs('twist')[0], evs('twist')[1], EIO);
  ticks.forEach((t) => (tAng += (160 / (ticks.length + 1)) * k(f, t, t + 4, EO)));
  tAng += (160 / (ticks.length + 1)) * k(f, dingF, dingF + 4, EO);
  const shake = f >= dingF ? Math.exp(-(f - dingF) / 6) * Math.sin((f - dingF) * 1.9) : 0;
  const timerPos = (fr: number) => ({x: 1060, y: lerp(-300, 720, k(fr, ti0 - 12, ti1, EO)) - 1100 * k(fr, dingF + 34, dingF + 52, EI)});
  const timerVis = f >= ti0 - 12 && f < dingF + 52;
  // 盤子
  const [po0, po1] = evs('plate_out');
  const platePos = (fr: number) => {
    const p = k(fr, po0, po1, EO);
    return {x: lerp(1650, 1220, p), y: lerp(500, 470, p), s: lerp(0.5, 1, p)};
  };
  const plateVis = f >= ev('door_open') + 4;
  // 撒香料粒子、牛奶流
  const spr = has('sprinkle') ? evs('sprinkle') : null;
  const cup = J.props.find((p) => p.kind === 'cup');
  const pourOn = cup ? f > (cup.pour as number[])[0] + 2 && f < (cup.pour as number[])[1] - 2 : false;

  const q = handPose(f);
  const q1 = handPose(f - 1);
  const hv = Math.hypot(q.x - q1.x, q.y - q1.y);

  return (
    <AbsoluteFill style={{background: '#E8CDA4', overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <AbsoluteFill style={{transform: `translateY(${c.ty}px) scale(${c.s})`, transformOrigin: `${c.ox}px ${c.oy}px`}}>
        <Counter />
        <Board f={f} />

        {J.props.map((it, i) =>
          f < it.at - 14 || f > G0 + 32 + i * 1.4 ? null : (
            <Ghosted
              key={it.id}
              f={f}
              pos={(fr) => itemPose(it, i, fr)}
              draw={(fr, o) => {
                const ps = itemPose(it, i, fr);
                return (
                  <Place x={ps.x} y={ps.y} s={ps.s} rot={ps.rot} o={o * ps.o}>
                    {draw(it, fr)}
                  </Place>
                );
              }}
            />
          )
        )}

        {/* 牛奶流 */}
        {cup && pourOn && <div style={{position: 'absolute', left: cup.x - 20 * cup.s, top: cup.y - 42 * cup.s, width: 12, height: 52 * cup.s, borderRadius: 6, background: '#FFF8EE', transform: 'rotate(12deg)'}} />}
        {/* 香料粒子 */}
        {spr && f >= spr[0] - 6 && f < spr[0] + 30 &&
          Array.from({length: 18}, (_, i) => {
            const t0 = spr[0] - 6 + (i % 6) * 3;
            const p = k(f, t0, t0 + 14, EI);
            if (f < t0 || p >= 1) return null;
            return <div key={i} style={{position: 'absolute', left: spr[1] + ((i * 37) % 50) - 25, top: spr[2] + p * 120, width: 7, height: 7, borderRadius: 4, background: ['#C8442E', '#E8B53A', '#7EA34A'][i % 3]}} />;
          })}

        {/* 烤箱 */}
        {ovenVis && (
          <Ghosted f={f} pos={(fr) => ({x: ovenX(fr), y: 0})} draw={(fr, o) => (
            <div style={{position: 'absolute', left: ovenX(fr), top: 160, opacity: o}}>
              <Oven door={door} glow={glow} inside={f >= push1 && f < ev('door_open') ? <div style={{position: 'absolute', left: 200, top: 200, width: 0, height: 0}}><div style={{position: 'absolute', transform: 'translate(-50%,-50%) scale(0.72)'}}><Dish dough={1} /></div></div> : null} />
            </div>
          )} />
        )}

        {/* 烤盤 */}
        {dishVis && (
          <Ghosted f={f} pos={dishPos} draw={(fr, o) => {
            const ps = dishPos(fr);
            const s = lerp(1, 0.72, k(fr, push0, push1, EIO)) * settle(fr, dIn);
            return <Place x={ps.x} y={ps.y} s={s} o={o}><Dish dough={dough} /></Place>;
          }} />
        )}

        {/* 計時器 */}
        {timerVis && (
          <Ghosted f={f} pos={timerPos} draw={(fr, o) => {
            const ps = timerPos(fr);
            return <Place x={ps.x} y={ps.y} rot={shake * 12} s={settle(fr, ti1) * (1 + 0.12 * Math.max(0, shake))} o={o}><Timer angle={tAng} /></Place>;
          }} />
        )}
        {/* 叮！的放射線 */}
        {f >= dingF && f < dingF + 22 && (
          <svg width={600} height={600} viewBox="-300 -300 600 600" style={{position: 'absolute', left: 1060 - 300, top: 720 - 300, overflow: 'visible'}}>
            {Array.from({length: 10}, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              const p = k(f, dingF, dingF + 14, EO);
              const r0 = 120 + p * 60;
              const r1 = r0 + 50 * (1 - k(f, dingF + 8, dingF + 22, LIN));
              return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke={i % 2 ? C.sauce : '#E8664E'} strokeWidth={10} strokeLinecap="round" />;
            })}
          </svg>
        )}

        {/* 盤子＋擺盤 */}
        {plateVis && (
          <Ghosted f={f} pos={platePos} draw={(fr, o) => {
            const ps = platePos(fr);
            return (
              <Place x={ps.x} y={ps.y} s={ps.s * settle(fr, po1, 0.05)} o={o}>
                <div style={{position: 'relative', width: 620, height: 620}}>
                  <Plate />
                  {o === 1 && <div style={{position: 'absolute', left: 310, top: 310, width: 0, height: 0}}><PlateFood f={f} /></div>}
                </div>
              </Place>
            );
          }} />
        )}

        {/* 熱氣 */}
        {f >= po1 + 10 &&
          [0, 1, 2].map((i) => {
            const T0 = po1 + 10;
            const cyc = 90;
            const ph = (((f - T0 + i * 30) % cyc) + cyc) % cyc / cyc;
            const o = Math.sin(Math.PI * ph) * 0.55 * k(f, T0, T0 + 30, LIN);
            return (
              <svg key={i} width={80} height={200} viewBox="-40 -100 80 200" style={{position: 'absolute', left: 1140 + i * 80 - 40, top: 150 - ph * 70, opacity: o, overflow: 'visible'}}>
                <path d={`M0,90 C${-24 + i * 6},50 ${24 - i * 4},20 0,-20 S${-18 + i * 8},-70 0,-95`} stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" fill="none" />
              </svg>
            );
          })}

        {/* 出處小卡 */}
        {hasCard && f >= card0 && (
          <Ghosted f={f} pos={(fr) => ({x: cardX(fr), y: 690})} draw={(fr, o) => (
            <Place x={cardX(fr)} y={690} rot={-5 + 8 * (1 - k(fr, card0, card1, EO))} s={0.92 * settle(fr, card1, 0.05)} o={o}><Card head={J.d.card.head} url={J.d.card.url} /></Place>
          )} />
        )}

        {/* 主角的手（殘影） */}
        {hv > 18 && <HandAt q={handPose(f - 2)} opacity={0.18} />}
        {hv > 18 && <HandAt q={q1} opacity={0.3} />}
        <HandAt q={q} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
