/* 廣P 粗框醒目（新粗野主義 Neo-Brutalism）：行銷網頁介面活過來；所有東西都是粗黑框＋硬陰影的視窗、按鈕、卡片、貼紙。
   drum & bass 160 BPM（一拍 11.25 格），每拍都有東西彈出、被按下、被拖走。
   招牌轉場：整個畫面被游標拖出畫面（drag）／大色塊視窗蓋過再收走（cover）／看板橫向捲動（pan）／Ctrl+Z 倒帶收走（undo）。
   畫面最下方固定一條靜止的工作列（y ≥ 994），下方 180 像素不放快速變化的字。
   章的順序、每章的字、每章多長、用哪種轉場全部讀 timeline.json（timeline.py 依 storyboard 排好）。 */
import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import T from './timeline.json';
import {Chap, EI, EIO, LAB, clamp, k, lerp, sp} from './kit';
import {Btn, C, Cursor, MONO, SG, TC, Taskbar, Win, abs, bx, path, tap} from './ui';
import {ChBoard, ChButtons, ChCheck, ChStart} from './chA';
import {ChCounter, ChEnd, ChSettings, ChStack} from './chB';

const CHS = T.chapters as unknown as Chap[];
const CH = CHS.map((c) => c.from);
const N = CHS.length;
const len = (i: number) => (i + 1 < N ? CH[i + 1] : T.frames) - CH[i];
const VIEW: Record<string, React.FC<{t: number; c: Chap}>> = {
  start: ChStart, buttons: ChButtons, board: ChBoard, checklist: ChCheck, counter: ChCounter, settings: ChSettings, stack: ChStack, end: ChEnd,
};
const at = (f: number) => {
  let i = 0;
  while (i + 1 < N && f >= CH[i + 1]) i++;
  return {i, t: f - CH[i]};
};
const show = (i: number, t: number) => {
  const V = VIEW[CHS[i].type];
  return <V t={t} c={CHS[i]} />;
};
const scene = (i: number, f: number) => show(i, f - CH[i]);

/* ───── 拖出畫面：游標抓住整個桌面，像拖視窗一樣甩出去 ───── */
const Drag: React.FC<{j: number; d: number; f: number}> = ({j, d, f}) => {
  const tr = CHS[j].tr as {grab: [number, number]; to: [number, number]};
  const lift = k(d, -18, -13);
  const mv = k(d, -15, 0, EI);
  const sc = lerp(1, 0.9, lift);
  const [gx, gy] = tr.grab;
  const px = 960 + (gx - 960) * sc + tr.to[0] * mv;
  const py = 540 + (gy - 540) * sc + tr.to[1] * mv;
  const [cx, cy] = d < -19 ? path(d, [[-28, 1990, 800], [-19, gx, gy]]) : [px, py];
  return (
    <>
      {scene(j, f)}
      <AbsoluteFill style={{transform: `translate(${tr.to[0] * mv}px,${tr.to[1] * mv}px) rotate(${(tr.to[0] > 0 ? 4 : -4) * mv}deg) scale(${sc})`,
        boxShadow: lift > 0 ? `0 0 0 8px ${C.k}, 28px 28px 0 8px ${C.k}` : 'none'}}>
        {scene(j - 1, f)}
      </AbsoluteFill>
      <Cursor x={cx} y={cy} down={d >= -18 ? 1 : 0} click={d >= -18 && d < -8 ? (d + 18) / 10 : 0} />
    </>
  );
};

/* ───── 大色塊視窗蓋過全畫面，再往上收走 ───── */
const COVER = [{bg: C.p, fg: C.k}, {bg: C.b, fg: C.w}, {bg: C.m, fg: C.k}];
const Cover: React.FC<{j: number; d: number; f: number}> = ({j, d, f}) => {
  const tr = CHS[j].tr as {label: string; labelSize: number; title: string; col: number};
  const post = CHS[j].win[1];
  const col = COVER[tr.col % 3];
  const grow = interpolate(d, [-12, -1], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
  const s = lerp(0.12, 1, grow);
  const up = k(d, 1, post, EIO);
  const bar = k(d, -10, 4, (x) => x);
  return (
    <>
      {d < 0 ? scene(j - 1, f) : scene(j, f)}
      <Win x={-30} y={-14} w={1980} h={1120} title={tr.title} bar={C.y} bg={col.bg} s={s} dy={-1250 * up} sh={24} barH={64}>
        <div style={{...abs, inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 50, paddingBottom: 80}}>
          <div style={{fontFamily: TC, fontWeight: 900, fontSize: tr.labelSize, color: col.fg, whiteSpace: 'nowrap'}}>{tr.label}</div>
          <div style={{width: 1000, height: 74, ...bx(C.w, 12), position: 'relative', overflow: 'hidden'}}>
            <div style={{...abs, left: 0, top: 0, bottom: 0, width: `${bar * 100}%`, background: C.y, borderRight: `6px solid ${C.k}`}} />
            {Array.from({length: 20}, (_, i) => (
              <div key={i} style={{...abs, left: i * 50 + 18, top: 0, bottom: 0, width: 14, background: 'rgba(17,17,17,0.18)', transform: 'skewX(-25deg)'}} />
            ))}
          </div>
        </div>
      </Win>
    </>
  );
};

/* ───── 看板橫向捲動 ───── */
const Pan: React.FC<{j: number; d: number; f: number}> = ({j, d, f}) => {
  const [pre, post] = CHS[j].win;
  const p = k(d, pre, post, EIO);
  return (
    <>
      <AbsoluteFill style={{transform: `translateX(${-1920 * p}px)`}}>{scene(j - 1, f)}</AbsoluteFill>
      <AbsoluteFill style={{transform: `translateX(${1920 * (1 - p)}px)`}}>{scene(j, f)}</AbsoluteFill>
      {/* 捲軸 */}
      <div style={{...abs, left: 300, top: 930, width: 1320, height: 34, ...bx(C.w, 6, 5)}}>
        <div style={{...abs, top: 2, left: lerp(4, 1320 - 12 - 520, p), width: 500, height: 20, background: C.k}} />
      </div>
    </>
  );
};

/* ───── Ctrl+Z：上一章倒帶收走 ───── */
const Undo: React.FC<{j: number; d: number; f: number}> = ({j, d, f}) => {
  const [pre, post] = CHS[j].win;
  const lenA = len(j - 1);
  const tA = interpolate(d, [pre, -3], [lenA + pre, 0], {...clamp, easing: EIO});
  const ks = sp(d, pre, 11, 260);
  const fly = k(d, 0, post, EI);
  const pr = tap(d, pre + 3, 14);
  const key = (x: number, w: number, label: string, font: string, fs: number) => (
    <Btn x={x} y={360} w={w} h={240} bg={C.w} press={pr} sh={18} s={ks}>
      <span style={{fontFamily: font, fontWeight: 700, fontSize: fs, color: C.k}}>{label}</span>
    </Btn>
  );
  return (
    <>
      {d < 0 ? show(j - 1, tA) : scene(j, f)}
      <AbsoluteFill style={{transform: `translateY(${-1100 * fly}px)`}}>
        {key(440, 400, LAB.ctrl, SG, 120)}
        <div style={{...abs, left: 896, top: 400, fontFamily: SG, fontWeight: 700, fontSize: 120, color: C.k, transform: `scale(${ks})`}}>+</div>
        {key(1040, 300, LAB.z, SG, 150)}
        <div style={{...abs, left: 760, top: 650, ...bx(C.y, 8, 5), padding: '6px 26px', fontFamily: MONO, fontWeight: 700, fontSize: 40, color: C.k,
          transform: `rotate(-3deg) scale(${ks})`, whiteSpace: 'nowrap'}}>{LAB.undo}</div>
      </AbsoluteFill>
    </>
  );
};

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const {i, t} = at(f);
  let body: React.ReactNode = show(i, t);
  for (let j = 1; j < N; j++) {
    const d = f - CH[j];
    const [a, b] = CHS[j].win;
    if (d < a || d >= b) continue;
    const kind = CHS[j].trans;
    if (kind === 'drag') body = <Drag j={j} d={d} f={f} />;
    else if (kind === 'cover') body = <Cover j={j} d={d} f={f} />;
    else if (kind === 'pan') body = <Pan j={j} d={d} f={f} />;
    else body = <Undo j={j} d={d} f={f} />;
  }
  return (
    <AbsoluteFill style={{background: C.w, overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      {body}
      <Taskbar />
    </AbsoluteFill>
  );
};

/** 全字測試圖：storyboard 用到的每個字用每一種字型串接各排一次，看有沒有缺字方塊 */
export const FontTest: React.FC = () => {
  const txt = Array.from(new Set(Array.from((T.allText as string).replace(/\s/g, '')))).join('');
  const row = (fam: string, w: number, label: string) => (
    <div style={{marginTop: 14}}>
      <div style={{fontFamily: 'monospace', fontSize: 20, color: C.b}}>{label}</div>
      <div style={{fontFamily: fam, fontWeight: w, fontSize: 34, lineHeight: 1.22, color: C.k, wordBreak: 'break-all'}}>{txt}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{background: C.w, padding: 30}}>
      {row(TC, 900, 'Noto Sans TC 900')}
      {row(SG, 700, 'Space Grotesk 700 → Noto Sans TC')}
      {row(MONO, 700, 'IBM Plex Mono 700 → Noto Sans TC')}
    </AbsoluteFill>
  );
};
