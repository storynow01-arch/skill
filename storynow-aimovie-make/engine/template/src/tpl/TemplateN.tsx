/* 範本 N：行前通知（皇小米）—— 2026-10-10，和範本M 同一套手繪線稿（米白紙、黑色粗線稿、磚紅點綴、字模糊淡入、章節大數字、白底黑框字幕、換場疊化）。
   場景＝範本M 的 10 種（title、scenario、definition、cards、vs、stat、quiz、recap、qaEnd、code）＋行前通知專用 7 種：
     when 桌曆翻頁＋時鐘從開始跑到結束＋進度條填滿＋時數章 ／ drive 俯視地圖開車進校門、警衛對話、柵欄升起、停進指定停車場（追蹤框）
     walk 俯視校園步行路線（皇小米沿紅色虛線走，經過的地標彈出名字）／ building 大樓立面，皇小米搭電梯到目的樓層、簽到簽退打勾
     seats 俯視教室座位一格格亮起到名額上限 ／ steps 流程節點一個個亮起＋方格進度條 ／ stamp 文件蓋紅章＋注意事項大字
   招牌特徵見 templates/範本N_行前通知/README.md；畫面上的字全部來自 storyboard（場景語彙見 templates/範本風格_場景語彙.md）。
   品檢約束同範本M：畫面內容 y<900、字 ≥32px、小字深色、裝飾標 data-qa="ignore"、動態都連續（不單格跳）。 */
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {At, Blur, C, Check, DARK, Draw, HandIcon, MONO, SANS, SERIF, Shake, Stamp, TINTS, ACCENTS, clamp, jolt, p, pop} from '../lib/hand/kit';
import {Mascot} from '../lib/hand/mascot';
import {FLOOR, HAND_SCENES, P, Sfx, fit, handLabel, lines, makeHandTemplate} from './TemplateM';
import {cue, textW} from './common';

const ez = Easing.bezier(0.22, 1, 0.36, 1);
const hm = (s: string) => {
  const m = /(\d{1,2})[:：](\d{2})/.exec(String(s));
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};
const fmt = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.floor(min) % 60).padStart(2, '0')}`;
/** 依關鍵格內插位置 */
const track = (f: number, keys: [number, number, number][]) => {
  if (f <= keys[0][0]) return {x: keys[0][1], y: keys[0][2]};
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, x0, y0] = keys[i], [b, x1, y1] = keys[i + 1];
    if (f <= b) { const t = ez((f - a) / Math.max(1, b - a)); return {x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t}; }
  }
  const k = keys[keys.length - 1];
  return {x: k[1], y: k[2]};
};
const Pill: React.FC<{text: string; f: number; at: number; bg?: string; fg?: string; border?: string; size?: number}> = ({text, f, at, bg = C.red, fg = C.white, border = C.ink, size = 46}) =>
  f < at ? null : (
    <div style={{display: 'inline-block', transform: `scale(${pop(f, at)})`, background: bg, color: fg, border: `4px solid ${border}`, borderRadius: 50, padding: '8px 32px', fontFamily: SANS, fontWeight: 700, fontSize: size, whiteSpace: 'nowrap', boxShadow: `5px 5px 0 ${C.ink}`}}>{text}</div>
  );

/* ── when：桌曆翻到那一天、時鐘從開始跑到結束、進度條填滿、蓋時數章 ── */
const When: React.FC<P> = ({p: q, cues, dur, f}) => {
  const a = cue(cues, q.cueMap?.[0], 10), st = cue(cues, q.cueMap?.[1], Math.round(dur * 0.6));
  const s0 = hm(q.start), s1 = hm(q.end) || s0;
  const e = Math.max(a + 30, Math.min(st - 6, a + 75));
  const v = interpolate(f, [a, e], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const flip = p(f, 6, 14, Easing.in(Easing.cubic));
  const month = lines(q.month, 8, 1)[0] ?? '', day = String(q.day ?? ''), wd = lines(q.weekday, 5, 1)[0] ?? '';
  const range = lines(q.range ?? (q.start && q.end ? `${q.start} － ${q.end}` : ''), 16, 1)[0] ?? '';
  return (<>
    <div style={{position: 'absolute', left: 200, top: 170, width: 440, height: 500}}>
      {[105, 315].map((x) => <div key={x} data-qa="ignore" style={{position: 'absolute', left: x, top: -26, width: 20, height: 56, border: `4px solid ${C.ink}`, borderRadius: 10, background: C.white, zIndex: 3}} />)}
      <div style={{position: 'absolute', inset: 0, border: `5px solid ${C.ink}`, borderRadius: 18, background: C.white, boxShadow: `10px 10px 0 ${C.ink}`, overflow: 'hidden'}}>
        <div style={{height: 104, background: C.navy, borderBottom: `5px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontWeight: 700, fontSize: fit([month], 400, 48), color: C.white}}>{month}</div>
        <div style={{textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: day.length > 2 ? 170 : 240, lineHeight: '280px', color: C.redT}}>{day}</div>
        <div style={{textAlign: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 54, color: C.ink}}>{wd}</div>
      </div>
      {flip < 1 && (
        <div data-qa="ignore" style={{position: 'absolute', inset: 0, border: `5px solid ${C.ink}`, borderRadius: 18, background: C.white, transformOrigin: '50% 0%', transform: `perspective(1400px) rotateX(${flip * 120}deg)`, opacity: 1 - flip * 0.6, zIndex: 2}}>
          <div style={{height: 104, borderBottom: `5px solid ${C.ink}`, background: C.navyTint}} />
        </div>
      )}
    </div>
    {/* 數位鐘 */}
    <div style={{position: 'absolute', left: 940, top: 190, width: 560, height: 230}}>
      <div style={{position: 'absolute', inset: 0, border: `6px solid ${C.ink}`, borderRadius: 36, background: C.white, transform: 'skewX(-3deg)', boxShadow: `8px 8px 0 ${C.ink}`}} />
      <div style={{position: 'absolute', left: 28, top: 26, right: 28, bottom: 32, border: `5px solid ${C.ink}`, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 112, color: C.ink, transform: 'skewX(-3deg)'}}>{fmt(s0 + (s1 - s0) * v)}</div>
    </div>
    <div style={{position: 'absolute', left: 940, top: 520, width: 560}}>
      <div style={{position: 'absolute', right: 0, top: -76, fontFamily: SANS, fontWeight: 700, fontSize: 56, color: C.ink}}>{Math.round(v * 100)}%</div>
      <div style={{height: 60, border: `5px solid ${C.ink}`, borderRadius: 12, padding: 7, background: C.white}}><div style={{height: '100%', width: `${v * 100}%`, background: C.navy, borderRadius: 4}} /></div>
    </div>
    {range && <At x={1220} y={650}><div style={{opacity: p(f, a, 10), fontFamily: SANS, fontWeight: 700, fontSize: 46, color: C.ink}}>{range}</div></At>}
    {q.stamp && <Stamp f={f} at={st} text={String(q.stamp)} x={1640} y={740} size={230} />}
    <Mascot f={f} x={790} y={FLOOR} scale={0.62} mood={f >= st ? 'happy' : 'idle'} moodAt={f >= st ? st : 0} />
    {Array.from({length: 10}, (_, i) => <Sfx key={i} at={Math.round(a + (i * (e - a)) / 10)} name="tick" vol={0.4} />)}
    <Sfx at={e} name="ding" vol={0.5} />
    {q.stamp && <Sfx at={st} name="stamp" />}
  </>);
};

/* ── drive：俯視地圖，車子從大路開進校門、警衛對話、柵欄升起、停進指定停車場；追蹤框跟著車 ── */
const Car: React.FC<{x: number; y: number; deg: number}> = ({x, y, deg}) => (
  <g transform={`translate(${x} ${y}) rotate(${deg})`}>
    <rect x={-42} y={-82} width={84} height={164} rx={30} fill={C.white} stroke={C.ink} strokeWidth={5} />
    <path d="M-30 -36 Q0 -50 30 -36 L26 -14 Q0 -22 -26 -14 Z" fill={C.ink} />
    <path d="M-28 40 Q0 50 28 40 L24 24 Q0 30 -24 24 Z" fill="none" stroke={C.ink} strokeWidth={4} />
    <circle cx={0} cy={4} r={14} fill={C.gold} stroke={C.ink} strokeWidth={3} />
  </g>
);
const Brackets: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 115}) => (
  <g stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="square">
    {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dy], i) => <path key={i} d={`M${x + dx * s} ${y + dy * s - dy * 32} L${x + dx * s} ${y + dy * s} L${x + dx * s - dx * 32} ${y + dy * s}`} />)}
  </g>
);
const Drive: React.FC<P> = ({p: q, cues, dur, f}) => {
  const c0 = cue(cues, q.cueMap?.[0], 6), c1 = cue(cues, q.cueMap?.[1], Math.round(dur * 0.5));
  const gate = c0 + 40, ask = gate + 8, okAt = Math.max(ask + 24, c1 - 12), park = Math.min(dur - 30, Math.max(okAt + 40, c1 + 40));
  const early = q.badge ? Math.min(dur - 20, park + 14) : 1e9;
  const keys: [number, number, number][] = [[c0, 2080, 770], [gate - 34, 1200, 770], [gate - 18, 980, 712], [gate, 960, 630], [okAt + 6, 960, 630], [okAt + 30, 960, 400], [park - 26, 1060, 262], [park - 8, 1270, 232], [park, 1270, 222]];
  const pos = track(f, keys), nxt = track(f + 2, keys);
  const moving = Math.hypot(nxt.x - pos.x, nxt.y - pos.y) > 0.3;
  const deg = moving ? (Math.atan2(nxt.y - pos.y, nxt.x - pos.x) * 180) / Math.PI + 90 : 0;
  const bar = p(f, okAt, 12);
  const say = lines(q.say, 10, 1)[0] ?? '';
  return (<>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      <g stroke={C.ink} strokeWidth={4} fill="none" strokeLinecap="round">
        <line x1={-50} y1={700} x2={1970} y2={700} /><line x1={-50} y1={840} x2={1970} y2={840} />
        <line x1={-50} y1={770} x2={1970} y2={770} strokeDasharray="40 30" strokeWidth={3} />
        <line x1={-50} y1={620} x2={880} y2={620} strokeWidth={7} /><line x1={1040} y1={620} x2={1970} y2={620} strokeWidth={7} />
        <line x1={880} y1={620} x2={880} y2={700} /><line x1={1040} y1={620} x2={1040} y2={700} />
        <path d="M880 620 L880 330 L1100 330" /><path d="M1040 620 L1040 450 L1700 450" />
        <rect x={1100} y={110} width={620} height={220} fill={f >= park ? 'rgba(94,143,90,0.14)' : 'none'} stroke={f >= park ? C.sage : C.ink} strokeWidth={f >= park ? 7 : 4} />
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={1210 + i * 120} y1={110} x2={1210 + i * 120} y2={240} />)}
        <rect x={150} y={110} width={620} height={400} fill={C.white} /><rect x={185} y={145} width={550} height={330} />
        <rect x={300} y={210} width={120} height={80} /><rect x={520} y={340} width={150} height={90} />
      </g>
      <rect x={1080} y={520} width={110} height={80} fill={C.navy} stroke={C.ink} strokeWidth={4} />
      <g transform={`rotate(${80 * bar} 1040 620)`}><line x1={1040} y1={620} x2={890} y2={620} stroke={C.red} strokeWidth={10} strokeLinecap="round" strokeDasharray="22 14" /></g>
      <g data-qa="ignore"><Car x={pos.x} y={pos.y} deg={deg} /></g>
      {f > c0 + 6 && f < park + 20 && <Brackets x={pos.x} y={pos.y} />}
    </svg>
    {q.guard && <div style={{position: 'absolute', left: 1205, top: 540}}><div style={{fontFamily: SANS, fontWeight: 700, fontSize: 34}}>{lines(q.guard, 6, 1)[0]}</div></div>}
    {q.building && <At x={460} y={555}><div style={{fontFamily: SANS, fontWeight: 700, fontSize: 40}}>{lines(q.building, 10, 1)[0]}</div></At>}
    {q.lot && <At x={1410} y={370}><div style={{fontFamily: SANS, fontWeight: 700, fontSize: 40, color: f >= park ? C.sageT : C.ink}}>{lines(q.lot, 10, 1)[0]}</div></At>}
    {say && f >= ask && (
      <div style={{position: 'absolute', left: 1210, top: 410, transform: `scale(${pop(f, ask)})`, transformOrigin: '0% 100%', padding: '12px 28px', border: `5px solid ${C.ink}`, borderRadius: 30, background: C.white, fontFamily: SANS, fontWeight: 700, fontSize: 40, display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap'}}>
        {say}{f >= okAt && <Check t={p(f, okAt, 8)} size={48} />}
      </div>
    )}
    {q.badge && <div style={{position: 'absolute', right: 70, top: 22}}><Pill text={lines(q.badge, 12, 1)[0] ?? ''} f={f} at={early} /></div>}
    <Mascot f={f} x={830} y={600} scale={0.4} mood={f >= okAt ? 'happy' : 'wave'} moodAt={f >= okAt ? okAt : ask} shadow={false} />
    <Sfx at={ask} name="pop" /><Sfx at={okAt} name="ding" vol={0.5} /><Sfx at={park} name="tick" />{q.badge && <Sfx at={early} name="pop" />}
  </>);
};

/* ── walk：俯視校園，皇小米從起點沿紅色虛線走到目的地，經過的地標彈出名字 ── */
const SLOTS: [number, number][] = [[560, 560], [960, 640], [1300, 420]];
const Walk: React.FC<P> = ({p: q, cues, dur, f}) => {
  const stops: string[] = (q.stops ?? []).slice(0, 3);
  const a = cue(cues, q.cueMap?.[0], 10), b = Math.min(dur - 24, Math.max(a + 60, cue(cues, q.cueMap?.[1], dur - 40)));
  const slots = stops.length === 1 ? [SLOTS[1]] : stops.length === 2 ? [SLOTS[0], SLOTS[2]] : SLOTS.slice(0, stops.length);
  // 沒寫沿途地標時走兩個轉角的步道（不是斜直線）
  const via: [number, number][] = stops.length ? slots : [[760, 800], [760, 470], [1380, 470]];
  const pts: [number, number][] = [[220, 800], ...via, [1440, 330]];
  const segs = pts.slice(1).map((pt, i) => Math.hypot(pt[0] - pts[i][0], pt[1] - pts[i][1]));
  const total = segs.reduce((s, x) => s + x, 0);
  const t = interpolate(f, [a, b], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  let acc = 0; const arrive = pts.map((_, i) => (i === 0 ? a : a + ((acc += segs[i - 1]) / total) * (b - a)));
  let left = t * total, x = pts[0][0], y = pts[0][1];
  for (let i = 0; i < segs.length; i++) {
    if (left <= segs[i]) { const k = left / segs[i]; x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k; y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k; break; }
    left -= segs[i]; x = pts[i + 1][0]; y = pts[i + 1][1];
  }
  const d = 'M' + pts.map((pt) => pt.join(' ')).join(' L');
  const bob = Math.abs(Math.sin((f - a) / 4)) * 8 * (t > 0 && t < 1 ? 1 : 0);
  const from = lines(q.from, 6, 1)[0] ?? '', to = lines(q.to, 8, 1)[0] ?? '';
  return (<>
    <svg width={1920} height={1080} style={{position: 'absolute'}} data-qa="ignore">
      {/* 背景：沒有名字的校舍、操場、樹（裝飾，不代表真實位置） */}
      {[[220, 130, 380, 200], [880, 600, 300, 160], [1040, 120, 220, 160], [1520, 600, 300, 220]].map(([bx, by, bw, bh], i) => (
        <g key={`b${i}`}><rect x={bx} y={by} width={bw} height={bh} fill={C.white} stroke={C.ink} strokeWidth={4} /><rect x={bx + 18} y={by + 18} width={bw - 36} height={bh - 36} fill="none" stroke={C.mute} strokeWidth={3} /></g>
      ))}
      <rect x={260} y={420} width={360} height={240} rx={110} fill={C.sageTint} stroke={C.ink} strokeWidth={4} />
      <rect x={330} y={480} width={220} height={120} rx={60} fill="none" stroke={C.ink} strokeWidth={3} strokeDasharray="12 10" />
      {[[130, 380], [690, 300], [1180, 360], [1720, 470], [1100, 820], [1820, 860]].map(([tx, ty], i) => (
        <g key={i}><circle cx={tx} cy={ty} r={30} fill={C.sageTint} stroke={C.ink} strokeWidth={4} /><path d={`M${tx - 12} ${ty - 4} Q${tx} ${ty - 16} ${tx + 10} ${ty - 2}`} stroke={C.ink} strokeWidth={3} fill="none" /></g>
      ))}
      <path d={d} stroke={C.mute} strokeWidth={16} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={0.35} />
      <path d={d} stroke={C.red} strokeWidth={8} fill="none" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="22 16" mask="url(#walkmask)" />
      <defs><mask id="walkmask"><path d={d} stroke="#fff" strokeWidth={20} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} /></mask></defs>
      {slots.map(([sx, sy], i) => (
        <g key={i} transform={`translate(${sx + (i % 2 ? -260 : 60)} ${sy - 150})`}><rect width={200} height={120} fill={f >= arrive[i + 1] ? C.goldTint : C.white} stroke={C.ink} strokeWidth={5} /><rect x={24} y={22} width={60} height={40} fill="none" stroke={C.ink} strokeWidth={3} /><rect x={116} y={22} width={60} height={40} fill="none" stroke={C.ink} strokeWidth={3} /></g>
      ))}
      <g transform="translate(1440 140)"><rect width={380} height={260} fill={f >= b ? C.goldTint : C.white} stroke={C.ink} strokeWidth={6} />
        {[0, 1, 2].map((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={34 + c * 116} y={34 + r * 92} width={80} height={60} fill="none" stroke={C.ink} strokeWidth={3} />))}
        <path d="M330 -70 L330 0 M330 -70 L375 -54 L330 -38" stroke={C.ink} strokeWidth={5} fill={C.red} /></g>
      <rect x={120} y={830} width={200} height={26} fill={C.ink} />
    </svg>
    {from && <At x={220} y={790}><div style={{fontFamily: SANS, fontWeight: 700, fontSize: 38, transform: 'translateY(-70px)'}}>{from}</div></At>}
    {stops.map((s, i) => {
      const [sx, sy] = slots[i];
      return <At key={i} x={sx + (i % 2 ? -160 : 160)} y={sy - 190}><Pill text={lines(s, 8, 1)[0] ?? ''} f={f} at={Math.round(arrive[i + 1])} bg={C.white} fg={C.ink} size={38} /></At>;
    })}
    {to && <At x={1630} y={460}><Pill text={to} f={f} at={b} bg={C.red} size={46} /></At>}
    <Mascot f={f} x={x} y={y - bob} scale={0.36} mood={f >= b ? 'happy' : 'idle'} moodAt={f >= b ? b : 0} shadow={false} flip={false} />
    {stops.map((_, i) => <Sfx key={i} at={Math.round(arrive[i + 1])} name="pop" />)}<Sfx at={b} name="ding" vol={0.5} />
  </>);
};

/* ── building：大樓立面，皇小米搭電梯到目的樓層，樓層牌亮起；右邊簽到簽退打勾 ── */
const Building: React.FC<P> = ({p: q, cues, dur, f}) => {
  const floors = Math.max(2, Math.min(6, Number(q.floors ?? 3))), target = Math.max(1, Math.min(floors, Number(q.floor ?? floors)));
  const c0 = cue(cues, q.cueMap?.[0], 8), c1 = cue(cues, q.cueMap?.[1], Math.round(dur * 0.55));
  const up0 = c0 + 12, up1 = Math.max(up0 + 30, Math.min(c1 - 14, up0 + 24 * (target - 1) + 20)), lab = up1 + 4;
  const checks: string[] = (q.checks ?? []).slice(0, 3);
  const ckAt = checks.map((_, i) => cue(cues, q.checkCues?.[i], c1 + 10 + i * 34));
  const G = 860, top = 170, fh = Math.min(200, (G - top) / floors);
  const lift = interpolate(f, [up0, up1], [0, target - 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const carY = G - fh * (lift + 1);
  const cur = Math.round(lift) + 1;
  const name = lines(q.name, 8, 1)[0] ?? '', room = lines(q.room, 9, 1)[0] ?? '';
  return (<>
    <svg width={1920} height={1080} style={{position: 'absolute'}} data-qa="ignore">
      <g stroke={C.ink} strokeWidth={5} fill={C.white} strokeLinejoin="round">
        <rect x={220} y={top} width={860} height={G - top} />
        <path d={`M200 ${top} L1100 ${top} L1100 ${top - 26} L200 ${top - 26} Z`} fill={C.ink} />
        {Array.from({length: floors - 1}, (_, i) => <line key={i} x1={220} y1={G - fh * (i + 1)} x2={1080} y2={G - fh * (i + 1)} />)}
        <rect x={260} y={top} width={150} height={G - top} fill="#F3F0E8" />
        {Array.from({length: floors}, (_, r) => [0, 1, 2, 3].map((c) => (
          <rect key={`${r}${c}`} x={470 + c * 150} y={G - fh * (r + 1) + fh * 0.22} width={100} height={fh * 0.56} fill={r + 1 === target && f >= lab ? C.goldTint : C.white} />
        )))}
      </g>
      <g transform={`translate(0 ${carY})`}><rect x={272} y={fh * 0.08} width={126} height={fh * 0.88} fill={C.white} stroke={C.ink} strokeWidth={5} /></g>
      <line x1={335} y1={top} x2={335} y2={carY + fh * 0.08} stroke={C.ink} strokeWidth={3} />
      <line x1={170} y1={G} x2={1150} y2={G} stroke={C.ink} strokeWidth={6} />
    </svg>
    <Mascot f={f} x={335} y={carY + fh * 0.94} scale={Math.min(0.3, (fh * 0.8) / 400)} mood={f >= lab ? 'happy' : 'idle'} moodAt={f >= lab ? lab : 0} shadow={false} />
    {Array.from({length: floors}, (_, i) => <div key={i} style={{position: 'absolute', left: 150, top: G - fh * i - fh / 2 - 22, fontFamily: MONO, fontWeight: 700, fontSize: 36, color: cur === i + 1 && f >= up0 ? C.redT : C.grey}}>{i + 1}F</div>)}
    {name && <At x={650} y={100}><Blur text={name} f={f} at={4} size={72} /></At>}
    {room && f >= lab && (
      <div style={{position: 'absolute', left: 1040, top: G - fh * target + fh * 0.2, transform: `scale(${pop(f, lab)})`, transformOrigin: '0% 50%', padding: '10px 28px', background: C.red, color: C.white, fontFamily: SERIF, fontWeight: 900, fontSize: 52, border: `4px solid ${C.ink}`, boxShadow: `6px 6px 0 ${C.ink}`, whiteSpace: 'nowrap'}}>{room}</div>
    )}
    {checks.length > 0 && f >= c1 - 6 && (
      <div style={{position: 'absolute', left: 1440, top: 300, width: 400, height: 140 + checks.length * 150, opacity: p(f, c1 - 6, 10), transform: `translateY(${(1 - p(f, c1 - 6, 14)) * 40}px) rotate(3deg)`}}>
        <div style={{position: 'absolute', inset: 0, border: `5px solid ${C.ink}`, borderRadius: 18, background: C.white, boxShadow: `8px 8px 0 ${C.ink}`}} />
        <div data-qa="ignore" style={{position: 'absolute', left: 130, top: -22, width: 140, height: 50, background: C.ink, borderRadius: 10}} />
        {checks.map((t, i) => (
          <div key={i} style={{position: 'absolute', left: 40, top: 70 + i * 150, right: 40, height: 120, borderBottom: `4px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <span style={{fontFamily: SERIF, fontWeight: 900, fontSize: fit([t], 230, 66)}}>{lines(t, 6, 1)[0]}</span>
            <Check t={p(f, ckAt[i], 10)} size={96} />
          </div>
        ))}
      </div>
    )}
    <Sfx at={up0} name="whoosh" vol={0.35} /><Sfx at={lab} name="ding" vol={0.5} />
    {ckAt.map((a, i) => <Sfx key={i} at={a} name="tick" />)}
  </>);
};

/* ── seats：俯視教室，座位一格格亮起到名額上限，右邊大數字跟著數 ── */
const Seats: React.FC<P> = ({p: q, cues, dur, f}) => {
  const limit = Math.max(1, Math.min(48, Number(q.limit ?? 30)));
  const cols = limit > 30 ? 8 : 6, rows = Math.ceil(limit / cols);
  const a = cue(cues, q.cueMap?.[0], 10), b = Math.min(dur - 30, Math.max(a + 30, cue(cues, q.cueMap?.[1], a + 50)));
  const k = interpolate(f, [a, b], [0, limit], {...clamp, easing: Easing.out(Easing.quad)});
  const RX = 240, RY = 150, RW = 1120, RH = 700;
  const dw = Math.min(140, (RW - 120) / cols - 24), dh = Math.min(70, (RH - 230) / rows - 26);
  const label = lines(q.label, 8, 1)[0] ?? '', note = lines(q.note, 12, 1)[0] ?? '', podium = lines(q.podium, 4, 1)[0] ?? '';
  return (<>
    <svg width={1920} height={1080} style={{position: 'absolute'}} data-qa="ignore">
      <rect x={RX} y={RY} width={RW} height={RH} fill={C.white} stroke={C.ink} strokeWidth={6} />
      <rect x={RX + RW / 2 - 160} y={RY + 30} width={320} height={70} fill={C.navyTint} stroke={C.ink} strokeWidth={5} />
      <line x1={RX + 40} y1={RY + 6} x2={RX + RW - 40} y2={RY + 6} stroke={C.ink} strokeWidth={10} />
      {Array.from({length: limit}, (_, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        const x = RX + 60 + c * ((RW - 120) / cols) + ((RW - 120) / cols - dw) / 2, y = RY + 150 + r * ((RH - 200) / rows);
        const on = i < Math.floor(k);
        const s = on ? 1 + 0.15 * (1 - p(f, a + ((i + 1) / limit) * (b - a), 6)) : 1;
        return (
          <g key={i} transform={`translate(${x + dw / 2} ${y + dh / 2}) scale(${s}) translate(${-dw / 2} ${-dh / 2})`}>
            <rect width={dw} height={dh} rx={6} fill={on ? C.goldTint : C.white} stroke={C.ink} strokeWidth={4} />
            <rect x={dw * 0.3} y={dh * 0.18} width={dw * 0.4} height={dh * 0.4} fill="none" stroke={on ? C.ink : C.mute} strokeWidth={3} />
          </g>
        );
      })}
    </svg>
    {podium && <At x={RX + RW / 2} y={RY + 65}><div style={{fontFamily: SANS, fontWeight: 700, fontSize: 36, color: C.navy}}>{podium}</div></At>}
    <At x={1640} y={330}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 10, whiteSpace: 'nowrap'}}>
        <span style={{fontFamily: SERIF, fontWeight: 900, fontSize: 170, color: C.redT, lineHeight: 1, minWidth: `${String(limit).length * 0.62}em`, textAlign: 'right', display: 'inline-block'}}>{Math.floor(k)}</span>
        <span style={{fontFamily: SANS, fontWeight: 700, fontSize: 52}}>／{limit}</span>
      </div>
    </At>
    {label && <At x={1640} y={480}><Pill text={label} f={f} at={b} size={48} /></At>}
    {note && <At x={1640} y={580}><div style={{opacity: p(f, b + 8, 10), fontFamily: SANS, fontWeight: 700, fontSize: 38, color: C.grey}}>{note}</div></At>}
    <Mascot f={f} x={1640} y={FLOOR} scale={0.62} mood={f >= b ? 'happy' : 'point'} moodAt={f >= b ? b : 0} flip />
    {Array.from({length: Math.min(limit, 16)}, (_, i) => <Sfx key={i} at={Math.round(a + ((i + 1) / Math.min(limit, 16)) * (b - a) * 0.9)} name="tick" vol={0.35} />)}
    <Sfx at={b} name="ding" vol={0.5} />
  </>);
};

/* ── steps：流程節點一個個亮起（線稿圖示＋淡彩圓＋彩色圓環），下方方格進度條跟著填 ── */
const Steps: React.FC<P> = ({p: q, cues, dur, f}) => {
  const items: {icon?: string; sketch?: string; title?: string; tag?: string}[] = (q.items ?? []).slice(0, 5);
  const n = Math.max(1, items.length);
  const at0 = items.map((_, i) => cue(cues, q.cueMap?.[i], 20 + i * Math.round((dur - 60) / n)));
  // 同一句的節點錯開 8 格依序亮、每個節點 6 格漸亮（同一格一起亮會被 F11 判成畫面突跳，2026-10-10）
  const at: number[] = [];
  at0.forEach((a, i) => at.push(i && a < at[i - 1] + 8 ? at[i - 1] + 8 : a));
  const lit = (i: number) => p(f, at[i], 6);
  const head = lines(q.title, 14, 1)[0] ?? '';
  const slot = 1600 / n, X0 = 160, r = Math.min(110, slot * 0.32);
  const blocks = 16, k = interpolate(f, [at[0], at[n - 1] + 10], [0, blocks], clamp);
  return (<>
    {head && <At x={960} y={170}><Blur text={head} f={f} at={2} size={fit([head], 1400, 80)} stagger={1.5} /></At>}
    <svg width={1920} height={1080} style={{position: 'absolute'}} data-qa="ignore">
      {items.slice(0, -1).map((_, i) => <Draw key={i} d={`M${X0 + slot * (i + 0.5) + r + 10} 420 L${X0 + slot * (i + 1.5) - r - 10} 420`} f={f} at={at[i] + 4} dur={Math.max(8, at[i + 1] - at[i] - 4)} sw={5} />)}
      {items.map((_, i) => {
        const k = lit(i);
        return (
          <g key={i} transform={`translate(${X0 + slot * (i + 0.5)} 420)`} opacity={0.28 + 0.72 * k}>
            <circle r={r} fill={C.white} stroke={k > 0.5 ? C.ink : C.mute} strokeWidth={6} />
            <circle r={r - 3} fill={TINTS[i % 4]} opacity={k} />
            <circle r={r} fill="none" stroke={ACCENTS[i % 4]} strokeWidth={8} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p(f, at[i], 16)} transform="rotate(-90)" />
          </g>
        );
      })}
    </svg>
    {items.map((it, i) => (
      <React.Fragment key={i}>
        <div style={{position: 'absolute', left: X0 + slot * (i + 0.5) - r * 0.7, top: 420 - r * 0.7, opacity: 0.28 + 0.72 * lit(i)}}><HandIcon icon={it.sketch ?? it.icon} f={f} at={at[i]} size={r * 1.4} /></div>
        <At x={X0 + slot * (i + 0.5)} y={610}>
          <div style={{textAlign: 'center', opacity: 0.3 + 0.7 * lit(i), whiteSpace: 'nowrap'}}>
            {it.tag && <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 34, color: DARK[i % 4]}}>{lines(it.tag, 6, 1)[0]}</div>}
            <div style={{fontFamily: SANS, fontWeight: 700, fontSize: fit(lines(it.title, 8, 1), slot - 30, 42), color: C.ink}}>{lines(it.title, 8, 1)[0]}</div>
          </div>
        </At>
      </React.Fragment>
    ))}
    <div data-qa="ignore" style={{position: 'absolute', left: 960 - (blocks * 62 - 10) / 2, top: 760, display: 'flex', gap: 10}}>
      {Array.from({length: blocks}, (_, i) => <div key={i} style={{width: 52, height: 52, border: `4px solid ${C.ink}`, background: i < Math.floor(k) ? C.navy : C.white}} />)}
    </div>
    {at.map((a, i) => <Sfx key={i} at={a} name="pop" />)}<Sfx at={at[n - 1] + 12} name="ding" vol={0.5} />
  </>);
};

/* ── stamp：文件（名冊、通知單）蓋紅章＋注意事項大字；皇小米驚訝 ── */
const StampDoc: React.FC<P> = ({p: q, cues, dur, f}) => {
  const st = cue(cues, q.cueMap?.[0], Math.round(dur * 0.35)) + (q.cueMap?.[0] !== undefined ? 10 : 0);
  const cap = Math.max(st + 12, cue(cues, q.cueMap?.[1], st + 20));
  const jx = jolt(f, st, 7);
  const doc = lines(q.doc, 8, 1)[0] ?? '', warn = lines(q.warn, 8, 1)[0] ?? '', em = lines(q.em, 6, 1)[0] ?? '';
  return (<>
    <div style={{position: 'absolute', left: 360, top: 90, width: 620, height: 760, transform: `translate(${jx}px, ${jx * 0.5}px) rotate(-2deg)`, border: `5px solid ${C.ink}`, borderRadius: 10, background: C.white, boxShadow: `10px 10px 0 ${C.ink}`, opacity: p(f, 0, 8)}}>
      <div style={{margin: '44px 50px 24px', fontFamily: SERIF, fontWeight: 900, fontSize: 60}}>{doc}</div>
      {Array.from({length: 7}, (_, i) => (
        <div key={i} data-qa="ignore" style={{margin: '0 50px', height: 70, borderTop: `3px solid ${C.ink}`, display: 'flex', alignItems: 'center', gap: 30}}>
          <span style={{fontFamily: MONO, fontSize: 32, color: C.mute, width: 40}}>{i + 1}</span>
          <div style={{width: 120 + ((i * 53) % 80), height: 22, background: C.ink, borderRadius: 4, opacity: 0.85}} />
          <div style={{width: 160 + ((i * 31) % 60), height: 22, background: C.mute, borderRadius: 4}} />
        </div>
      ))}
      {q.stamp && <Stamp f={f} at={st} text={String(q.stamp)} x={330} y={440} size={330} rot={-14} />}
    </div>
    <Shake f={f} at={st} x={690} y={530} r={220} angles={[-160, -120, -60, -20, 20]} />
    {warn && <At x={1450} y={330}><Blur text={warn} f={f} at={cap} size={fit([warn], 700, 84)} /></At>}
    {em && <At x={1450} y={460}><Blur text={em} f={f} at={cap + 6} size={fit([em], 700, 110)} color={C.redT} stagger={2} /></At>}
    <Mascot f={f} x={1450} y={FLOOR} scale={0.75} mood="oops" moodAt={st} />
    <Sfx at={st} name="stamp" />
  </>);
};

const NOTICE_SCENES: Record<string, React.FC<P>> = {when: When, drive: Drive, walk: Walk, building: Building, seats: Seats, steps: Steps, stamp: StampDoc};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noticeLabel = (type: string, q: any): string => {
  const pick = (v: unknown, fb: string) => (v ? lines(v, 12, 1)[0] ?? fb : fb);
  switch (type) {
    case 'when': return pick(q.heading, '什麼時候');
    case 'drive': return pick(q.heading, '怎麼來');
    case 'walk': return pick(q.heading, '怎麼走');
    case 'building': return pick(q.heading, '在哪裡');
    case 'seats': return pick(q.heading, '名額');
    case 'steps': return pick(q.heading, '流程');
    case 'stamp': return pick(q.heading, '注意');
    default: return handLabel(type, q);
  }
};

export const TemplateN = makeHandTemplate({...HAND_SCENES, ...NOTICE_SCENES}, noticeLabel, ['code', 'cards', 'quiz', 'qaEnd', 'when', 'drive', 'walk', 'building', 'seats', 'steps']);
void textW;
