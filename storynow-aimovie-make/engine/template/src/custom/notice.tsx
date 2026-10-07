/* 研習說明影片專用場景（行前通知）。只用 theme token。 */
import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {dropGlow, ease, easeIO, glowOf, useTheme} from '../theme';
import {Heading, abs, panelStyle} from '../kit';
import {SceneProps, cue} from '../scenes';

const at = (cues: number[], map: number[] | undefined, i: number, fb: number) => cue(cues, map ? map[i] : i, fb) + (map ? 0 : 0);

/* ---------- 2×2 資訊卡 ---------- */
export const InfoGrid: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cols = [t.c.accent, t.c.accent2, t.c.accent3, t.c.ok];
  return (
    <AbsoluteFill>
      <Heading zh={p.heading} en={p.en} accent={accent} />
      <div style={abs({left: 140, right: 140, top: 330, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 36})}>
        {p.items.map((it: {label: string; value: string; note?: string}, i: number) => {
          const s = spring({frame: f - at(cues, p.cueMap, i, 8 + i * 10), fps, config: {damping: 14}});
          const col = cols[i % 4];
          return (
            <div key={i} style={{...panelStyle(t, col, true), padding: '30px 40px', height: 240, opacity: Math.min(1, s * 1.4),
              transform: `translateY(${(1 - s) * 40}px)`, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
              <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 30, color: col, letterSpacing: 6}}>{it.label}</div>
              <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 54, color: t.c.fg, marginTop: 8, whiteSpace: 'nowrap'}}>{it.value}</div>
              {it.note && <div style={{fontFamily: t.f.tc, fontWeight: 500, fontSize: 28, color: t.c.muted, marginTop: 8}}>{it.note}</div>}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 交通：校門 → 警衛室 → 停車場；電梯 ---------- */
export const Parking: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const c0 = cue(cues, 0, 6), c2 = cue(cues, 2, 90), c4 = cue(cues, 4, 150);
  const pts: [number, number][] = [[200, 700], [520, 700], [520, 470], [780, 470]];
  const prog = easeIO(f, c0 + 6, 70);
  // 車子沿折線走
  const seg = [0, 320, 550, 810];
  const d = prog * seg[3];
  let k = 0;
  while (k < 2 && d > seg[k + 1]) k++;
  const u = (d - seg[k]) / (seg[k + 1] - seg[k]);
  const car = [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * u, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * u];
  const stop = (i: number, label: string, sub: string, x: number, y: number, col: string, show: number) => (
    <g opacity={show} key={label}>
      <rect x={x - 110} y={y - 70} width={220} height={140} rx={t.radius} fill={t.c.panel} stroke={col} strokeWidth={4} style={{filter: dropGlow(t, col, 10)}} />
      <text x={x} y={y - 6} textAnchor="middle" fontFamily={t.f.tc} fontWeight={t.w.tc} fontSize={40} fill={t.c.fg}>{label}</text>
      <text x={x} y={y + 40} textAnchor="middle" fontFamily={t.f.tc} fontWeight={500} fontSize={24} fill={col}>{sub}</text>
    </g>
  );
  const elev = ease(f, c2, 14);
  const early = ease(f, c4, 14);
  return (
    <AbsoluteFill>
      <Heading zh={p.heading} en={p.en} accent={accent} />
      <svg width={1920} height={1080} style={abs({left: 0, top: 0})}>
        <polyline points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={`${accent}55`} strokeWidth={10} strokeLinejoin="round" />
        <polyline points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={accent} strokeWidth={10} strokeLinejoin="round"
          strokeDasharray={`${d} 2000`} style={{filter: dropGlow(t, accent, 8)}} />
        {stop(0, '校門', 'GATE', 200, 700, t.c.accent3, ease(f, c0, 10))}
        {stop(1, '警衛室', '說明來參加研習', 520, 700, t.c.accent2, ease(f, c0 + 20, 10))}
        {stop(2, '停車場', '本校指定停車場', 900, 470, t.c.ok, ease(f, cue(cues, 1, 50), 10))}
        <g transform={`translate(${car[0]} ${car[1] - 4})`} opacity={ease(f, c0 + 4, 8)}>
          <rect x={-34} y={-20} width={68} height={34} rx={10} fill={accent} />
          <rect x={-20} y={-34} width={40} height={18} rx={6} fill={accent} />
          <circle cx={-18} cy={16} r={8} fill={t.c.bg} stroke={accent} strokeWidth={3} />
          <circle cx={18} cy={16} r={8} fill={t.c.bg} stroke={accent} strokeWidth={3} />
        </g>
        {/* 電梯 */}
        <g transform="translate(1440 520)" opacity={elev}>
          <rect x={-150} y={-200} width={300} height={400} rx={t.radius} fill={t.c.panel} stroke={t.c.accent3} strokeWidth={4} />
          <rect x={-110} y={-130} width={105} height={290} fill={`${t.c.accent3}22`} stroke={t.c.accent3} strokeWidth={3}
            transform={`translate(${-12 * easeIO(f, c2 + 10, 20)} 0)`} />
          <rect x={5} y={-130} width={105} height={290} fill={`${t.c.accent3}22`} stroke={t.c.accent3} strokeWidth={3}
            transform={`translate(${12 * easeIO(f, c2 + 10, 20)} 0)`} />
          <text y={-155} textAnchor="middle" fontFamily={t.f.num} fontWeight={t.w.num} fontSize={34} fill={t.c.accent2}>▲ 3F</text>
          <text y={250} textAnchor="middle" fontFamily={t.f.tc} fontWeight={t.w.tc} fontSize={40} fill={t.c.fg}>電梯今日開放</text>
        </g>
      </svg>
      <div style={abs({left: 140, top: 830, opacity: early, transform: `translateY(${(1 - early) * 20}px)`, ...panelStyle(t, t.c.accent2, true),
        padding: '14px 34px', fontFamily: t.f.tc, fontWeight: 700, fontSize: 34, color: t.c.fg})}>
        ⏰ 建議提前 <span style={{color: t.c.accent2}}>10 分鐘</span> 到校，方便停車與報到
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 流程步驟 ---------- */
export const Flow: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const steps = p.steps as {title: string; sub?: string}[];
  const W = 380, gap = 110;
  const x0 = 960 - (steps.length * W + (steps.length - 1) * gap) / 2;
  const cols = [t.c.accent, t.c.accent2, t.c.ok, t.c.accent3];
  return (
    <AbsoluteFill>
      <Heading zh={p.heading} en={p.en} accent={accent} />
      {steps.map((s, i) => {
        const a = ease(f, at(cues, p.cueMap, i, 8 + i * 14), 14);
        const x = x0 + i * (W + gap);
        const col = cols[i % 4];
        return (
          <React.Fragment key={i}>
            <div style={abs({left: x, top: 400, width: W, height: 300, ...panelStyle(t, col, a > 0.9), opacity: 0.2 + 0.8 * a,
              transform: `scale(${0.92 + 0.08 * a})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'})}>
              <div style={{fontFamily: t.f.num, fontWeight: t.w.num, fontSize: 70, color: col, textShadow: glowOf(t, col, 0.7)}}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 56, color: t.c.fg, marginTop: 10}}>{s.title}</div>
              {s.sub && <div style={{fontFamily: t.f.tc, fontWeight: 500, fontSize: 28, color: t.c.muted, marginTop: 10}}>{s.sub}</div>}
            </div>
            {i < steps.length - 1 && (
              <div style={abs({left: x + W + 18, top: 520, fontFamily: t.f.num, fontWeight: t.w.num, fontSize: 60, color: accent,
                opacity: ease(f, at(cues, p.cueMap, i + 1, 22 + i * 14), 10)})}>➜</div>
            )}
          </React.Fragment>
        );
      })}
      {p.result && (
        <div style={abs({left: 0, right: 0, top: 770, textAlign: 'center', opacity: ease(f, cue(cues, cues.length - 1, 60) + 10, 14),
          fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 46, color: t.c.accent2, textShadow: glowOf(t, t.c.accent2, 0.5)})}>{p.result}</div>
      )}
    </AbsoluteFill>
  );
};

/* ---------- 打勾清單 ---------- */
export const Checklist: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      <Heading zh={p.heading} en={p.en} accent={accent} />
      <div style={abs({left: 200, right: 200, top: 300, display: 'flex', flexDirection: 'column', gap: 16})}>
        {p.items.map((it: {title: string; note?: string}, i: number) => {
          const st = at(cues, p.cueMap, i, 10 + i * 20);
          const a = ease(f, st - 6, 12);
          const tick = spring({frame: f - st - 8, fps, config: {damping: 10, stiffness: 180}});
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 34, padding: '14px 36px', ...panelStyle(t, accent, tick > 0.5),
              opacity: 0.25 + 0.75 * a, transform: `translateX(${(1 - a) * 40}px)`}}>
              <div style={{width: 64, height: 64, flex: '0 0 64px', borderRadius: Math.min(t.radius, 12), border: `4px solid ${t.c.ok}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', background: tick > 0.5 ? `${t.c.ok}33` : 'transparent'}}>
                <span style={{fontSize: 46, color: t.c.ok, transform: `scale(${tick})`, fontWeight: 900, fontFamily: t.f.tc}}>✓</span>
              </div>
              <div>
                <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 44, color: t.c.fg}}>{it.title}</div>
                {it.note && <div style={{fontFamily: t.f.tc, fontWeight: 500, fontSize: 28, color: t.c.muted, marginTop: 4}}>{it.note}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 課程時間軸（講到哪段亮哪段） ---------- */
export const Schedule: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const rows = p.rows as {time: string; title: string; tag?: string}[];
  // lightMap[k] = 第 k 句旁白要亮的列
  const lightMap: number[][] = p.lightMap;
  // 亮起程度 w[i]（0～1）：換到下一組時用 9 格（0.3 秒）漸變，不再瞬間切換（2026-10-07 最終品檢 F11 抓到課程表突跳）
  let w = rows.map(() => 0);
  let prev: number[] = [];
  for (let k = 0; k < lightMap.length; k++) {
    const s = cue(cues, k, 1e9) - 3;
    if (f < s) break;
    const g = Math.min(1, (f - s) / 9);
    w = rows.map((_, i) => (prev.includes(i) ? 1 : 0) * (1 - g) + (lightMap[k].includes(i) ? 1 : 0) * g);
    prev = lightMap[k];
  }
  const anyOn = Math.max(0, ...w);
  return (
    <AbsoluteFill>
      <Heading zh={p.heading} en={p.en} accent={accent} top={130} />
      <div style={abs({left: 200, right: 200, top: 270, display: 'flex', flexDirection: 'column', gap: 10})}>
        {rows.map((r, i) => {
          const a = ease(f, 4 + i * 3, 10);
          const on = w[i];
          const col = r.tag === 'break' ? t.c.accent2 : r.tag === 'core' ? t.c.bad : accent;
          return (
            <div key={i} style={{position: 'relative', display: 'flex', alignItems: 'center', height: 58, padding: '0 28px', borderRadius: Math.min(t.radius, 10),
              background: `${t.c.panel}aa`, border: `2px solid ${t.c.muted}33`, opacity: a * (1 - 0.45 * anyOn * (1 - on)),
              transform: `translateX(${(1 - a) * 30}px) scale(${1 + 0.015 * on})`}}>
              <div style={{position: 'absolute', inset: -2, borderRadius: Math.min(t.radius, 10), background: `${col}33`, border: `2px solid ${col}`,
                boxShadow: glowOf(t, col, 0.4), opacity: on}} />
              <div style={{position: 'relative', width: 260, whiteSpace: 'nowrap', fontFamily: t.f.num, fontWeight: t.w.num, fontSize: t.f.num.includes('Press') ? 16 : 28,
                color: on > 0.5 ? col : t.c.muted}}>{r.time}</div>
              <div style={{position: 'relative', fontFamily: t.f.tc, fontWeight: 700, fontSize: 32, color: t.c.fg}}>{r.title}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const NOTICE_SCENES = {infoGrid: InfoGrid, parking: Parking, flow: Flow, checklist: Checklist, schedule: Schedule};
