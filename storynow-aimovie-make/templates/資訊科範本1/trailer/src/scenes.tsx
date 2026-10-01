import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {C, EN, MONO, NUM, TC, ease, easeIO, glow} from './theme';
import {ChapterTag, CodeWindow, Counter, Heading, Medal, Pop} from './ui';

const abs = (s: React.CSSProperties): React.CSSProperties => ({position: 'absolute', ...s});

/* ============ 0. INTRO：開機終端 → Logo ============ */
const BOOT = [
  ['$', ' ssh future@haiching-it.edu.tw'],
  ['[ OK ]', ' Mounting C / Python compilers ......... done'],
  ['[ OK ]', ' Loading algorithms & data structures .. done'],
  ['[ OK ]', ' Edge-AI accelerator ................... online'],
  ['[ OK ]', ' ESP32 / Arduino IoT mesh .............. 64 nodes'],
  ['[ OK ]', ' Collaborative robot arm ............... calibrated'],
  ['$', ' ./launch --trailer 2026'],
];

export const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const collapse = 1 - easeIO(f, 150, 15);
  let budget = Math.max(0, (f - 15) * 3.2);
  const logo = ease(f, 160, 18);
  return (
    <AbsoluteFill>
      {collapse > 0.01 && (
        <div style={abs({left: 240, right: 240, top: 290, height: 480, transform: `scaleY(${collapse})`, opacity: ease(f, 5, 12),
          background: '#06101ee6', border: `2px solid ${C.cyan}88`, borderRadius: 14, boxShadow: `0 0 60px ${C.cyan}33`})}>
          <div style={{height: 38, background: '#0e2446', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px'}}>
            {[C.pink, C.gold, C.green].map((c) => <div key={c} style={{width: 13, height: 13, borderRadius: 7, background: c}} />)}
            <div style={{fontFamily: MONO, color: C.grey, fontSize: 17, marginLeft: 14}}>tty1 — haiching-it</div>
          </div>
          <div style={{padding: '26px 40px', fontFamily: MONO, fontSize: 28, lineHeight: 1.7, whiteSpace: 'pre'}}>
            {BOOT.map(([p, s], i) => {
              const full = p + s;
              if (budget <= 0) return null;
              const shown = full.slice(0, Math.floor(budget));
              budget -= full.length + 6;
              const ok = p.startsWith('[');
              return (
                <div key={i}>
                  <span style={{color: ok ? C.green : C.cyan}}>{shown.slice(0, p.length)}</span>
                  <span style={{color: ok ? C.white : C.cyan}}>{shown.slice(p.length)}</span>
                  {budget <= 0 && Math.floor(f / 7) % 2 === 0 && <span style={{background: C.cyan}}> </span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {logo > 0 && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: logo}}>
          <div style={{fontFamily: EN, fontWeight: 700, fontSize: 28, letterSpacing: 12, color: C.cyan}}>OFFICIAL TRAILER · 2026</div>
          <div style={{fontFamily: TC, fontWeight: 700, fontSize: 56, letterSpacing: 18, color: C.white, marginTop: 18}}>海青工商</div>
          <div style={{fontFamily: TC, fontWeight: 900, fontSize: 160, letterSpacing: 40, color: C.white, lineHeight: 1.15,
            textShadow: glow(C.cyan, 1.2), transform: `scale(${1.15 - 0.15 * logo})`}}>資訊科</div>
          <div style={{width: 1040 * ease(f, 170, 22), height: 2, background: C.cyan, boxShadow: glow(C.cyan, 0.5), margin: '14px 0'}} />
          <div style={{fontFamily: EN, fontWeight: 700, fontSize: 28, letterSpacing: 9, color: '#ffffffdd', opacity: ease(f, 180, 18)}}>
            DEPARTMENT OF INFORMATION TECHNOLOGY
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ============ 1. TITLE ============ */
export const Title: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 14, mass: 0.8}});
  const sub = 'BUILD DREAMS TOGETHER · ENGINEER THE FUTURE';
  const subShown = sub.slice(0, Math.max(0, Math.floor((f - 22) * 1.4)));
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <svg width={1920} height={1080} style={abs({left: 0, top: 0})}>
        <g transform="translate(960 530)">
          {[{r: 430, sp: 0.5, c: C.cyan}, {r: 480, sp: -0.35, c: C.blue}, {r: 540, sp: 0.2, c: C.violet}].map(({r, sp, c}, k) => (
            <ellipse key={k} rx={r * ease(f, k * 2, 20)} ry={r * 0.42 * ease(f, k * 2, 20)} fill="none" stroke={c} strokeWidth={2}
              strokeDasharray="60 22 8 22" strokeDashoffset={f * sp * 10} opacity={0.6} />
          ))}
          {Array.from({length: 60}, (_, i) => {
            const ang = (i / 60) * Math.PI * 2 + f * 0.008;
            const r0 = 590, r1 = i % 5 ? 604 : 630;
            return <line key={i} x1={r0 * Math.cos(ang)} y1={r0 * 0.42 * Math.sin(ang)} x2={r1 * Math.cos(ang)} y2={r1 * 0.42 * Math.sin(ang)}
              stroke={C.cyan} strokeWidth={2} opacity={0.5 * ease(f, 6, 20)} />;
          })}
        </g>
      </svg>
      <div style={{fontFamily: TC, fontWeight: 700, fontSize: 34, letterSpacing: 10, color: C.cyan, opacity: ease(f, 8, 14)}}>海青工商資訊科　官方宣傳片</div>
      <div style={{width: 840 * ease(f, 8, 20), height: 2, background: `${C.cyan}99`, margin: '26px 0 10px'}} />
      <div style={{fontFamily: TC, fontWeight: 900, fontSize: 156, color: C.white, letterSpacing: 6, textShadow: glow(C.cyan, 1.4),
        transform: `scale(${interpolate(s, [0, 1], [1.3, 1])})`, opacity: Math.min(1, s * 2)}}>攜手築夢·智造未來</div>
      <div style={{width: 1400 * ease(f, 8, 24), height: 3, background: C.cyan, boxShadow: glow(C.cyan, 0.6), margin: '8px 0 30px'}} />
      <div style={{fontFamily: EN, fontWeight: 700, fontSize: 32, letterSpacing: 8, color: C.white, height: 40}}>{subShown}</div>
    </AbsoluteFill>
  );
};

/* ============ 2. CH1a：C / Python ============ */
const C_CODE = ['#include <stdio.h>', 'int main(void) {', '    int dream = 1, future = 0;', '    while (dream) {',
  '        future += learn();  // level up', '    }', '    return future;', '}'];
const PY_CODE = ['import numpy as np', 'from edge_ai import Model', '', 'model = Model("yolo-nano")',
  'for frame in camera.stream():', '    result = model.detect(frame)', '    esp32.send(result.label)'];

const Ch1Tag = () => <ChapterTag num="01" zh="AI & 軟體工程" en="AI & SOFTWARE ENGINEERING" accent={C.cyan} />;

export const Code: React.FC = () => {
  const f = useCurrentFrame();
  const a1 = ease(f, 3, 14), a2 = ease(f, 14, 14);
  return (
    <AbsoluteFill>
      <Ch1Tag />
      <Heading zh="核心程式力" en="CORE CODING" accent={C.cyan} top={330} />
      <div style={abs({left: 140, top: 470, display: 'flex', alignItems: 'baseline', gap: 36, opacity: ease(f, 10, 14)})}>
        <span style={{fontFamily: NUM, fontWeight: 900, fontSize: 150, color: C.cyan, textShadow: glow(C.cyan, 1)}}>C</span>
        <span style={{fontFamily: EN, fontSize: 80, color: '#ffffff88'}}>×</span>
        <span style={{fontFamily: NUM, fontWeight: 900, fontSize: 130, color: C.gold, textShadow: glow(C.gold, 1)}}>Python</span>
      </div>
      <div style={abs({left: 140, top: 700, display: 'flex', gap: 20})}>
        {['程式設計基礎', '演算法思維', 'AI 應用開發'].map((s, i) => (
          <div key={s} style={{fontFamily: TC, fontWeight: 700, fontSize: 26, color: C.white, border: `2px solid ${C.cyan}`, borderRadius: 30,
            padding: '8px 26px', opacity: ease(f, 24 + i * 5, 12), boxShadow: `0 0 16px ${C.cyan}44`}}>{s}</div>
        ))}
      </div>
      <CodeWindow title="main.c" lines={C_CODE} accent={C.cyan} start={8} cpf={3.6}
        style={{left: 1020 + (1 - a1) * 200, top: 240, width: 780, opacity: a1, transform: 'perspective(1400px) rotateY(-10deg)'}} />
      <CodeWindow title="edge_ai.py" lines={PY_CODE} accent={C.gold} start={30} cpf={3.6}
        style={{left: 1080 + (1 - a2) * 200, top: 610, width: 780, opacity: a2, transform: 'perspective(1400px) rotateY(-10deg)'}} />
    </AbsoluteFill>
  );
};

/* ============ 3. CH1b：演算法 × 資料結構 ============ */
const BST_VALS = [50, 30, 70, 20, 40, 60, 80, 35, 65, 90];
const BST = (() => {
  const OFF = [230, 120, 62];
  const pos: Record<number, [number, number]> = {[BST_VALS[0]]: [0, 0]};
  const parent: Record<number, number> = {};
  const child: Record<string, number> = {};
  for (const v of BST_VALS.slice(1)) {
    let n = BST_VALS[0];
    for (;;) {
      const side = v < n ? 'L' : 'R';
      const k = `${n}${side}`;
      if (child[k] !== undefined) { n = child[k]; continue; }
      child[k] = v; parent[v] = n;
      const [px, d] = pos[n];
      pos[v] = [px + (side === 'L' ? -1 : 1) * OFF[d], d + 1];
      break;
    }
  }
  return {pos, parent};
})();

const BUBBLE = (() => {
  const a = [7, 3, 11, 5, 9, 2, 12, 6, 10, 1, 8, 4];
  const st: [number[], number][] = [[a.slice(), -1]];
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < a.length - 1 - i; j++)
      if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; st.push([a.slice(), j]); }
  st.push([a.slice(), -1]);
  return st;
})();

export const Algo: React.FC = () => {
  const f = useCurrentFrame();
  const k = Math.min(BUBBLE.length - 1, Math.floor(ease(f, 15, 85) * (BUBBLE.length - 1)));
  const [arr, j] = BUBBLE[k];
  const done = k === BUBBLE.length - 1;
  const ox = 520, oy = 480;
  return (
    <AbsoluteFill>
      <Ch1Tag />
      <Heading zh="演算法 × 資料結構" en="ALGORITHMS & DATA STRUCTURES" accent={C.cyan} />
      <svg width={1920} height={1080} style={abs({left: 0, top: 0})}>
        {BST_VALS.map((v, i) => {
          const at = 9 + i * 6.5;
          const a = ease(f, at, 9);
          if (a <= 0) return null;
          const [bx, d] = BST.pos[v];
          const x = ox + bx, y = oy + d * 120;
          const p = BST.parent[v];
          const hot = f - at >= 0 && f - at < 12;
          return (
            <g key={v}>
              {p !== undefined && (() => {
                const [pbx, pd] = BST.pos[p];
                const px = ox + pbx, py = oy + pd * 120;
                return <line x1={px} y1={py} x2={px + (x - px) * a} y2={py + (y - py) * a} stroke={C.cyan} strokeWidth={3} opacity={0.75} />;
              })()}
              <circle cx={x} cy={y} r={34 * a} fill="#0a1e3c" stroke={hot ? C.gold : C.cyan} strokeWidth={3}
                style={{filter: `drop-shadow(0 0 ${hot ? 16 : 8}px ${hot ? C.gold : C.cyan})`}} />
              <text x={x} y={y + 10} textAnchor="middle" fontFamily={NUM} fontWeight={700} fontSize={26} fill={C.white} opacity={a}>{v}</text>
            </g>
          );
        })}
        <text x={ox} y={955} textAnchor="middle" fontFamily={MONO} fontSize={24} fill={C.grey}>Binary Search Tree · insert()</text>
        {arr.map((v, i) => {
          const h = v * 38 * ease(f, 6, 14);
          const col = i === j || i === j + 1 ? C.gold : done ? C.green : C.cyan;
          return <rect key={i} x={1080 + i * 60} y={900 - h} width={44} height={h} rx={4} fill={col} opacity={0.9}
            style={{filter: `drop-shadow(0 0 10px ${col})`}} />;
        })}
        <text x={1440} y={955} textAnchor="middle" fontFamily={MONO} fontSize={24} fill={C.grey}>sort(arr)  →  O(n²) → O(n log n)</text>
        {done && <text x={1440} y={380} textAnchor="middle" fontFamily={NUM} fontWeight={900} fontSize={36} fill={C.green}
          style={{filter: `drop-shadow(0 0 12px ${C.green})`}}>SORTED ✓</text>}
      </svg>
    </AbsoluteFill>
  );
};

/* ============ 4. CH1c：AI 邊緣運算 × IoT ============ */
const NN = [4, 6, 6, 3];
export const AiIot: React.FC = () => {
  const f = useCurrentFrame();
  const ox = 200, oy = 700, gx = 170;
  const nodes = NN.map((n, li) => Array.from({length: n}, (_, k) => [ox + li * gx, oy + (k - (n - 1) / 2) * 62] as [number, number]));
  const ap = ease(f, 5, 16);
  const s = ease(f, 14, 16);
  const cx = 1400, cy = 660;
  const sensors: [string, number, number][] = [['TEMP', -330, -250], ['CAM', 330, -250], ['SERVO', -330, 250], ['LED', 330, 250], ['ARDUINO', 0, -300]];
  return (
    <AbsoluteFill>
      <Ch1Tag />
      <Heading zh="AI 邊緣運算 × 智慧物聯網" en="EDGE AI · ESP32 / ARDUINO IoT" accent={C.cyan} />
      <svg width={1920} height={1080} style={abs({left: 0, top: 0})}>
        <g opacity={ap}>
          {nodes.slice(0, -1).map((col, li) => col.flatMap((a, i) => nodes[li + 1].map((b, k) =>
            <line key={`${li}-${i}-${k}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.blue} strokeWidth={1} opacity={0.4} />)))}
          {Array.from({length: 26}, (_, p) => {
            const ph = (f / 30 * 1.3 + p * 0.137) % 1;
            const li = Math.floor(ph * 3), t = ph * 3 - li;
            const a = nodes[li][(p * 7) % nodes[li].length], b = nodes[li + 1][(p * 5 + li) % nodes[li + 1].length];
            return <circle key={p} cx={a[0] + (b[0] - a[0]) * t} cy={a[1] + (b[1] - a[1]) * t} r={5} fill={C.cyan} style={{filter: `drop-shadow(0 0 6px ${C.cyan})`}} />;
          })}
          {nodes.map((col, li) => col.map(([x, y], k) => (
            <circle key={`n${li}${k}`} cx={x} cy={y} r={16} fill="#0a1e3c" stroke={li < 3 ? C.cyan : C.gold} strokeWidth={3}
              opacity={0.6 + 0.4 * Math.sin(f / 5 + li + k)} />)))}
          {['person 0.97', 'robot 0.93', 'chip 0.88'].map((l, k) => (
            <text key={l} x={nodes[3][k][0] + 34} y={nodes[3][k][1] + 7} fontFamily={MONO} fontSize={20} fill={C.gold}>{l}</text>))}
          <text x={ox + 255} y={965} textAnchor="middle" fontFamily={MONO} fontSize={22} fill={C.grey}>EDGE AI INFERENCE  ·  12 ms</text>
        </g>
        {sensors.map(([lab, dx, dy], i) => {
          const a = ease(f, 26 + i * 4, 12);
          const sx = cx + dx, sy = cy + dy;
          const t = (f / 30 * 0.9 + i * 0.3) % 1;
          return (
            <g key={lab} opacity={a}>
              <line x1={cx} y1={cy} x2={sx} y2={sy} stroke={C.blue} strokeWidth={2} strokeDasharray="12 12" strokeDashoffset={-f * 2} />
              <rect x={cx + dx * t - 7} y={cy + dy * t - 7} width={14} height={14} fill={C.green} style={{filter: `drop-shadow(0 0 8px ${C.green})`}} />
              <rect x={sx - 85} y={sy - 32} width={170} height={64} rx={12} fill="#0a1a32" stroke={C.green} strokeWidth={2} />
              <text x={sx} y={sy + 9} textAnchor="middle" fontFamily={EN} fontWeight={700} fontSize={26} fill={C.white}>{lab}</text>
            </g>
          );
        })}
        {[0, 1, 2].map((k) => {
          const r = ((f * 4 + k * 60) % 180) + 40;
          return <path key={k} d={`M ${cx - r * 0.77} ${cy - 170 - r * 0.64 + r} A ${r} ${r} 0 0 1 ${cx + r * 0.77} ${cy - 170 - r * 0.64 + r}`}
            transform={`translate(0 ${-r})`} fill="none" stroke={C.cyan} strokeWidth={3} opacity={(1 - (r - 40) / 180) * s} />;
        })}
        <g transform={`translate(${cx} ${cy}) scale(${s})`}>
          {Array.from({length: 12}, (_, k) => (
            <g key={k}>
              <rect x={-192} y={-112 + k * 20} width={22} height={6} fill={C.silver} />
              <rect x={170} y={-112 + k * 20} width={22} height={6} fill={C.silver} />
            </g>))}
          <rect x={-170} y={-130} width={340} height={260} rx={14} fill="#10161f" stroke={C.cyan} strokeWidth={3}
            style={{filter: `drop-shadow(0 0 20px ${C.cyan}88)`}} />
          <rect x={-150} y={-110} width={60} height={30} fill="none" stroke={C.gold} strokeWidth={2} />
          <text y={0} textAnchor="middle" fontFamily={NUM} fontWeight={900} fontSize={56} fill={C.white}>ESP32</text>
          <text y={48} textAnchor="middle" fontFamily={EN} fontWeight={700} fontSize={22} fill={C.cyan}>Wi-Fi · BLE · Dual-Core</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/* ============ 5. CH1d：協作機械手臂 ============ */
const BASE: [number, number] = [1300, 900];
const LEN = [260, 220, 70];
const ik = (x: number, y: number) => {
  const wx = x, wy = y - LEN[2];
  const dx = wx - BASE[0], dy = BASE[1] - wy;
  const D = Math.max(-1, Math.min(1, (dx * dx + dy * dy - LEN[0] ** 2 - LEN[1] ** 2) / (2 * LEN[0] * LEN[1])));
  const q2 = -Math.acos(D);
  const q1 = Math.atan2(dy, dx) - Math.atan2(LEN[1] * Math.sin(q2), LEN[0] + LEN[1] * Math.cos(q2));
  return [q1, q2];
};
// [秒, x, y, 夾爪, 指令]
const KEYS: [number, number, number, number, number][] = [
  [0, 1480, 640, 0, 0], [0.6, 1060, 820, 0, 0], [0.9, 1060, 820, 1, 1], [1.6, 1300, 560, 1, 2],
  [2.3, 1560, 820, 1, 2], [2.6, 1560, 820, 0, 3], [3.4, 1480, 640, 0, 4], [9, 1480, 640, 0, 4]];
const CMDS = ['MOVJ  P[1]  V=60%  ; approach', 'GRIP  CLOSE        ; pick', 'MOVL  P[2]  V=250mm/s', 'GRIP  OPEN         ; place', 'MOVJ  HOME         ; done'];

export const Robot: React.FC = () => {
  const f = useCurrentFrame();
  const t = Math.max(0, f / 30 - 0.3);
  let x = 1480, y = 640, g = 0, ci = 4;
  for (let k = 0; k < KEYS.length - 1; k++) {
    const [t0, x0, y0, g0, c0] = KEYS[k], [t1, x1, y1, g1, c1] = KEYS[k + 1];
    if (t >= t0 && t < t1) {
      const e = Easing.inOut(Easing.cubic)((t - t0) / (t1 - t0));
      x = x0 + (x1 - x0) * e; y = y0 + (y1 - y0) * e; g = e < 0.5 ? g0 : g1; ci = e > 0.05 ? c1 : c0;
      break;
    }
  }
  const [q1, q2] = ik(x, y);
  const j1 = [BASE[0] + LEN[0] * Math.cos(q1), BASE[1] - LEN[0] * Math.sin(q1)];
  const j2 = [j1[0] + LEN[1] * Math.cos(q1 + q2), j1[1] - LEN[1] * Math.sin(q1 + q2)];
  const tip = [j2[0], j2[1] + LEN[2]];
  const block = t < 0.9 ? [1060, 876] : t < 2.6 ? [tip[0], tip[1] + 22] : [1560, 876];
  const a = ease(f, 3, 14);
  const deg = (r: number) => (r * 180) / Math.PI;
  const gap = g ? 12 : 30;
  return (
    <AbsoluteFill>
      <Ch1Tag />
      <Heading zh="協作型機械手臂程式控制" en="COLLABORATIVE ROBOT ARM PROGRAMMING" accent={C.cyan} />
      <div style={abs({left: 140, top: 470, width: 640, padding: '22px 30px', opacity: a, background: '#0a1a34dd', border: `2px solid ${C.cyan}88`,
        borderRadius: 14, fontFamily: MONO, fontSize: 24})}>
        <div style={{color: C.grey, fontSize: 19, marginBottom: 12}}>cobot_task.prg</div>
        {CMDS.map((c, k) => (
          <div key={k} style={{padding: '8px 12px', borderRadius: 6, whiteSpace: 'pre', color: k === ci && t > 0 ? C.white : C.grey,
            background: k === ci && t > 0 ? `${C.blue}77` : 'transparent', boxShadow: k === ci && t > 0 ? `0 0 20px ${C.blue}66` : 'none'}}>
            {String(k + 1).padStart(2, '0')}  {c}
          </div>
        ))}
      </div>
      <div style={abs({right: 120, top: 420, textAlign: 'right', fontFamily: MONO, fontSize: 26, lineHeight: '46px', opacity: a})}>
        {[q1, q2, -(q1 + q2) - Math.PI / 2].map((q, k) => (
          <div key={k} style={{color: C.cyan}}>J{k + 1}  {deg(q) >= 0 ? '+' : ''}{deg(q).toFixed(1).padStart(6, '0')}°</div>))}
        <div style={{color: C.gold}}>TCP X{Math.round(x - BASE[0])} Z{Math.round(BASE[1] - y)}</div>
      </div>
      <svg width={1920} height={1080} style={abs({left: 0, top: 0, opacity: a})}>
        <rect x={900} y={900} width={860} height={18} fill="#1e3250" />
        <rect x={1520} y={896} width={80} height={4} fill={C.green} />
        <text x={1560} y={940} textAnchor="middle" fontFamily={MONO} fontSize={18} fill={C.green}>P[2]</text>
        <text x={1060} y={940} textAnchor="middle" fontFamily={MONO} fontSize={18} fill={C.cyan}>P[1]</text>
        <rect x={block[0] - 24} y={block[1] - 24} width={48} height={48} fill={C.gold} stroke="#fff" strokeWidth={2}
          style={{filter: `drop-shadow(0 0 12px ${C.gold})`}} />
        <rect x={BASE[0] - 70} y={BASE[1] - 20} width={140} height={38} rx={8} fill="#28405e" />
        {[[BASE, j1, 34], [j1, j2, 26], [j2, [tip[0], tip[1] - 14], 16]].map(([p0, p1, w], k) => (
          <g key={k}>
            <line x1={(p0 as number[])[0]} y1={(p0 as number[])[1]} x2={(p1 as number[])[0]} y2={(p1 as number[])[1]} stroke="#c8d7eb"
              strokeWidth={w as number} strokeLinecap="round" />
            <line x1={(p0 as number[])[0]} y1={(p0 as number[])[1]} x2={(p1 as number[])[0]} y2={(p1 as number[])[1]} stroke={C.cyan} strokeWidth={4}
              style={{filter: `drop-shadow(0 0 8px ${C.cyan})`}} />
          </g>))}
        {[[BASE, 30], [j1, 24], [j2, 18]].map(([p, r], k) => (
          <circle key={k} cx={(p as number[])[0]} cy={(p as number[])[1]} r={r as number} fill="#142846" stroke={C.cyan} strokeWidth={4} />))}
        {[-1, 1].map((s) => <line key={s} x1={tip[0] + s * gap} y1={tip[1] - 14} x2={tip[0] + s * gap} y2={tip[1] + 10} stroke={C.gold} strokeWidth={8} />)}
        <line x1={tip[0] - 32} y1={tip[1] - 14} x2={tip[0] + 32} y2={tip[1] - 14} stroke={C.gold} strokeWidth={6} />
      </svg>
    </AbsoluteFill>
  );
};

/* ============ 6. CH2a：10 位國手 + 地球 ============ */
const Ch2Tag = () => <ChapterTag num="02" zh="冠軍搖籃" en="THE CRADLE OF CHAMPIONS" accent={C.gold} />;

const Globe: React.FC<{cx: number; cy: number; R: number; color: string}> = ({cx, cy, R, color}) => {
  const f = useCurrentFrame();
  const a = ease(f, 3, 18);
  const rot = f / 60, tilt = 0.35;
  const proj = (lat: number, lon: number) => {
    const x = Math.cos(lat) * Math.sin(lon + rot), z = Math.cos(lat) * Math.cos(lon + rot), y = Math.sin(lat);
    const y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
    return [cx + x * R * a, cy - y2 * R * a, z2];
  };
  const segs: JSX.Element[] = [];
  const pushLine = (pts: number[][], key: string) => {
    for (let i = 0; i < pts.length - 1; i++)
      segs.push(<line key={`${key}${i}`} x1={pts[i][0]} y1={pts[i][1]} x2={pts[i + 1][0]} y2={pts[i + 1][1]} stroke={color}
        strokeWidth={2} opacity={pts[i][2] > 0 ? 0.6 : 0.13} />);
  };
  for (let la = -60; la <= 60; la += 30) pushLine(Array.from({length: 46}, (_, i) => proj((la * Math.PI) / 180, (i * 8 * Math.PI) / 180)), `la${la}`);
  for (let lo = 0; lo < 180; lo += 20) pushLine(Array.from({length: 46}, (_, i) => proj(((i * 8 - 90) * Math.PI) / 180, (lo * Math.PI) / 180)), `lo${lo}`);
  const cities = [[23.5, 121], [46.9, 7.4], [31.2, 121.5], [45.8, 4.8], [55.8, 49.1], [24.5, 54.4], [48.2, 16.4], [37.5, 127]];
  return (
    <svg width={1920} height={1080} style={abs({left: 0, top: 0})}>
      <circle cx={cx} cy={cy} r={R * a + 18} fill="none" stroke={color} strokeWidth={2} opacity={0.3} strokeDasharray="4 10" />
      {segs}
      {cities.map(([la, lo], i) => {
        const [x, y, z] = proj((la * Math.PI) / 180, (lo * Math.PI) / 180);
        if (z <= 0) return null;
        const rr = 20 + ((f * 1.4) % 40);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={7 + 3 * Math.sin(f / 6 + i)} fill={i === 0 ? '#fff' : color} style={{filter: `drop-shadow(0 0 8px ${color})`}} />
            {i === 0 && <circle cx={x} cy={y} r={rr} fill="none" stroke={color} strokeWidth={2} opacity={1 - (rr - 20) / 40} />}
          </g>
        );
      })}
    </svg>
  );
};

const BigStat: React.FC<{to: number; unit: string; color: string; size: number; top: number; delay?: number; dur?: number}> = (
  {to, unit, color, size, top, delay = 8, dur = 42}) => {
  const f = useCurrentFrame();
  return (
    <div style={abs({left: 140, top, display: 'flex', alignItems: 'flex-end', gap: 22, opacity: ease(f, 3, 8)})}>
      <Counter to={to} size={size} color={color} delay={delay} dur={dur} />
      <span style={{fontFamily: TC, fontWeight: 900, fontSize: 72, color: C.white, marginBottom: 14}}>{unit}</span>
    </div>
  );
};

export const WorldSkills: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Ch2Tag />
      <Globe cx={1380} cy={600} R={300} color={C.gold} />
      <BigStat to={10} unit="位" color={C.gold} size={250} top={360} />
      <div style={abs({left: 150, top: 700, opacity: ease(f, 18, 14)})}>
        <div style={{fontFamily: TC, fontWeight: 900, fontSize: 52, color: C.white}}>WorldSkills 國際技能競賽</div>
        <div style={{fontFamily: TC, fontWeight: 700, fontSize: 32, color: C.gold, marginTop: 10, opacity: ease(f, 24, 14)}}>正取國手 · 代表台灣前進世界技能最高殿堂</div>
        <div style={{fontFamily: EN, fontWeight: 700, fontSize: 22, letterSpacing: 5, color: '#ffffffaa', marginTop: 12, opacity: ease(f, 30, 14)}}>WORLDSKILLS INTERNATIONAL COMPETITORS</div>
      </div>
    </AbsoluteFill>
  );
};

/* ============ 7. CH2b：12 面金牌 ============ */
export const Gold12: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Ch2Tag />
      <BigStat to={12} unit="面" color={C.gold} size={250} top={380} dur={48} />
      <div style={abs({left: 150, top: 720, opacity: ease(f, 15, 14)})}>
        <div style={{fontFamily: TC, fontWeight: 900, fontSize: 58, color: C.white}}>全國技能競賽 金牌</div>
        <div style={{fontFamily: EN, fontWeight: 700, fontSize: 24, letterSpacing: 6, color: C.gold, marginTop: 8}}>12 NATIONAL GOLD MEDALS</div>
      </div>
      {Array.from({length: 12}, (_, i) => (
        <Pop key={i} delay={9 + i * 4} style={abs({left: 930 + (i % 4) * 200, top: 250 + Math.floor(i / 4) * 230})}>
          <Medal size={56} color={C.gold} label="金" />
        </Pop>
      ))}
    </AbsoluteFill>
  );
};

/* ============ 8. CH2c：第 56 屆 金銀銅 ============ */
export const Nat56: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const base = 945;
  const pillars: [string, string, number, number][] = [[C.silver, '銀', 200, 2], [C.gold, '金', 265, 1], [C.bronze, '銅', 150, 3]];
  return (
    <AbsoluteFill>
      <Ch2Tag />
      <div style={abs({left: 0, right: 0, top: 250, textAlign: 'center', opacity: ease(f, 3, 14)})}>
        <div style={{fontFamily: TC, fontWeight: 900, fontSize: 72, color: C.white, textShadow: glow(C.gold, 0.6)}}>第 56 屆全國技能競賽</div>
        <div style={{fontFamily: TC, fontWeight: 900, fontSize: 50, color: C.gold, letterSpacing: 8, marginTop: 6, opacity: ease(f, 9, 14)}}>金 · 銀 · 銅　全包辦</div>
      </div>
      {pillars.map(([col, lab, h, pl], i) => {
        const x = 960 + (i - 1) * 300;
        const hh = h * ease(f, 9 + i * 3, 20);
        const drop = spring({frame: f - 27 - i * 6, fps, config: {damping: 10, stiffness: 120}});
        return (
          <React.Fragment key={lab}>
            <div style={abs({left: x - 120, top: base - hh, width: 240, height: hh, background: `linear-gradient(180deg, ${col}55, ${col}11)`,
              border: `3px solid ${col}`, boxShadow: `0 0 30px ${col}55`, display: 'flex', justifyContent: 'center'})}>
              <span style={{fontFamily: NUM, fontWeight: 900, fontSize: 60, color: col, marginTop: 14, opacity: hh / h}}>{pl}</span>
            </div>
            <div style={abs({left: x - 56, top: interpolate(drop, [0, 1], [base - h - 520, base - h - 245]), opacity: Math.min(1, drop * 2)})}>
              <Medal size={56} color={col} label={lab} />
            </div>
          </React.Fragment>
        );
      })}
      {[[120, C.gold, '技優甄審加分', '最高 30%'], [1470, C.bronze, '全國總決賽', '勇奪銅牌 ★']].map(([x, col, a, b]) => (
        <div key={a as string} style={abs({left: x as number, top: 520, width: 330, padding: '18px 0', textAlign: 'center', borderRadius: 16,
          border: `3px solid ${col}`, background: `${col}18`, opacity: ease(f, 60, 14), boxShadow: `0 0 24px ${col}44`})}>
          <div style={{fontFamily: TC, fontWeight: 700, fontSize: 30, color: C.white}}>{a}</div>
          <div style={{fontFamily: TC, fontWeight: 900, fontSize: 36, color: col as string}}>{b}</div>
        </div>
      ))}
      <div style={abs({left: 0, right: 0, top: 972, textAlign: 'center', fontFamily: TC, fontWeight: 700, fontSize: 30, color: C.white,
        opacity: ease(f, 48, 14)})}>南區分區賽 · 資通訊網路建置 ╳ 資訊與網路技術　雙職類前三名包辦</div>
    </AbsoluteFill>
  );
};

/* ============ 9. CH2d：WorldSkills 時間軸 ============ */
const TL: [string, string, string][] = [['2017', '阿布達比', '世界優勝'], ['2019', '喀山', '正取國手'], ['2022', '特別賽', '世界銀牌×2 · 銅牌'],
  ['2024', '法國里昂', '世界優勝×2'], ['2025', '上海', '正取國手×2']];

export const Timeline: React.FC = () => {
  const f = useCurrentFrame();
  const y = 660, x0 = 200, x1 = 1720;
  const p = easeIO(f, 6, 66);
  return (
    <AbsoluteFill>
      <Ch2Tag />
      <Heading zh="國際技能競賽 · 榮耀足跡" en="WORLDSKILLS HALL OF FAME" accent={C.gold} />
      <div style={abs({left: x0, top: y - 2, width: (x1 - x0) * p, height: 4, background: C.gold, boxShadow: glow(C.gold, 0.6)})} />
      {TL.map(([yr, city, res], i) => {
        const x = x0 + 80 + (i * (x1 - x0 - 160)) / 4;
        const a = ease(f, 6 + (66 * (x - x0)) / (x1 - x0), 10);
        const up = i % 2 === 0;
        return (
          <div key={yr} style={{opacity: a}}>
            <div style={abs({left: x - 16, top: y - 16, width: 32, height: 32, borderRadius: 16, border: `4px solid ${C.gold}`, background: '#1e1405',
              transform: `scale(${a})`, boxShadow: glow(C.gold, 0.5)})} />
            <div style={abs({left: x - 200, width: 400, textAlign: 'center', top: up ? y - 250 : y + 70})}>
              {!up && <div style={{fontFamily: TC, fontWeight: 700, fontSize: 28, color: C.white, marginBottom: 6}}>{res}</div>}
              {up && <div style={{fontFamily: TC, fontWeight: 500, fontSize: 28, color: '#ffffffbb'}}>{city}</div>}
              <div style={{fontFamily: NUM, fontWeight: 900, fontSize: 62, color: C.gold, textShadow: glow(C.gold, 0.6)}}>{yr}</div>
              {!up && <div style={{fontFamily: TC, fontWeight: 500, fontSize: 28, color: '#ffffffbb'}}>{city}</div>}
              {up && <div style={{fontFamily: TC, fontWeight: 700, fontSize: 28, color: C.white, marginTop: 44}}>{res}</div>}
            </div>
          </div>
        );
      })}
      <div style={abs({left: 0, right: 0, top: 920, textAlign: 'center', fontFamily: TC, fontWeight: 900, fontSize: 42, color: C.gold,
        textShadow: glow(C.gold, 0.5), opacity: ease(f, 78, 14)})}>國手 100% 錄取頂大</div>
    </AbsoluteFill>
  );
};

/* ============ 10. CH3a：錄取率約 34% ============ */
const Ch3Tag = () => <ChapterTag num="03" zh="升學與未來" en="ACADEMIC TRIUMPHS & FUTURE PATHWAYS" accent={C.violet} />;

export const Rate: React.FC = () => {
  const f = useCurrentFrame();
  const p = ease(f, 8, 48);
  const R = 260, cx = 1320, cy = 620, circ = 2 * Math.PI * R;
  return (
    <AbsoluteFill>
      <Ch3Tag />
      <svg width={1920} height={1080} style={abs({left: 0, top: 0})}>
        <defs>
          <linearGradient id="rg" x1="0" x2="1"><stop offset="0" stopColor={C.cyan} /><stop offset="1" stopColor={C.violet} /></linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={`${C.violet}44`} strokeWidth={28} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="url(#rg)" strokeWidth={28} strokeLinecap="round"
          strokeDasharray={`${circ * 0.34 * p} ${circ}`} transform={`rotate(-90 ${cx} ${cy})`} style={{filter: `drop-shadow(0 0 18px ${C.cyan})`}} />
        {Array.from({length: 60}, (_, k) => {
          const ang = ((k * 6 - 90) * Math.PI) / 180, r0 = R + 30, r1 = R + (k % 5 ? 40 : 50);
          return <line key={k} x1={cx + r0 * Math.cos(ang)} y1={cy + r0 * Math.sin(ang)} x2={cx + r1 * Math.cos(ang)} y2={cy + r1 * Math.sin(ang)}
            stroke={C.cyan} strokeWidth={2} opacity={k / 60 < 0.34 * p ? 0.9 : 0.25} />;
        })}
      </svg>
      <div style={abs({left: cx - 300, width: 600, top: cy - 110, textAlign: 'center'})}>
        <Counter to={34} suffix="%" size={150} color={C.white} delay={8} dur={48} />
        <div style={{fontFamily: TC, fontWeight: 700, fontSize: 36, color: C.cyan, marginTop: 14, opacity: ease(f, 18, 12)}}>國立科大錄取率</div>
      </div>
      <div style={abs({left: 140, top: 390, opacity: ease(f, 8, 14)})}>
        <div style={{fontFamily: TC, fontWeight: 900, fontSize: 60, color: C.white}}>約</div>
        <div style={{fontFamily: NUM, fontWeight: 900, fontSize: 170, color: C.cyan, lineHeight: 1.1, textShadow: glow(C.cyan, 1.2)}}>34%</div>
        <div style={{fontFamily: TC, fontWeight: 700, fontSize: 44, color: C.white, marginTop: 18, opacity: ease(f, 24, 14)}}>每 3 位同學 就有 1 位上國立</div>
        <div style={{fontFamily: EN, fontWeight: 700, fontSize: 22, letterSpacing: 5, color: C.violet, marginTop: 12, opacity: ease(f, 30, 14)}}>NATIONAL UNIVERSITY ADMISSION RATE</div>
      </div>
    </AbsoluteFill>
  );
};

/* ============ 11. CH3b：26 人次 + 校名 ============ */
const UNIS: [string, string, string][] = [['國立臺灣科技大學', 'Taiwan Tech · NTUST', '技優保送 · 頂大第一志願'],
  ['國立雲林科技大學', 'YunTech', '智慧機器人技優專班'], ['國立高雄科技大學', 'NKUST', '強勢錄取 10 人']];
const MORE = ['勤益科大', '屏東大學', '虎尾科大', '屏東科大', '臺中科大', '臺東專校'];

export const Unis: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Ch3Tag />
      <BigStat to={26} unit="人次" color={C.cyan} size={220} top={340} />
      <div style={abs({left: 150, top: 640, opacity: ease(f, 15, 14)})}>
        <div style={{fontFamily: TC, fontWeight: 900, fontSize: 52, color: C.white}}>國立大專院校錄取</div>
        <div style={{fontFamily: EN, fontWeight: 700, fontSize: 22, letterSpacing: 5, color: C.violet, marginTop: 8}}>ADMITTED TO NATIONAL UNIVERSITIES</div>
      </div>
      {UNIS.map(([zh, en, note], i) => {
        const a = ease(f, 9 + i * 7, 15);
        return (
          <div key={zh} style={abs({left: 900 + (1 - a) * 300, top: 290 + i * 180, width: 880, height: 150, opacity: a, borderRadius: 18,
            background: 'linear-gradient(120deg, #14204acc, #0a1230cc)', border: `3px solid ${i === 0 ? C.cyan : C.violet}`,
            boxShadow: `0 0 30px ${i === 0 ? C.cyan : C.violet}44`, transform: 'perspective(1600px) rotateY(-8deg)'})}>
            <div style={abs({left: 0, top: 20, width: 8, height: 110, background: C.cyan})} />
            <div style={abs({left: 50, top: 18, fontFamily: TC, fontWeight: 900, fontSize: 46, color: C.white})}>{zh}</div>
            <div style={abs({left: 50, top: 92, fontFamily: EN, fontWeight: 700, fontSize: 28, color: C.cyan})}>{en}</div>
            <div style={abs({right: 30, top: 94, fontFamily: TC, fontWeight: 700, fontSize: 28, color: C.gold})}>{note}</div>
          </div>
        );
      })}
      <div style={abs({left: 150, top: 890, display: 'flex', gap: 30})}>
        {MORE.map((s, i) => (
          <div key={s} style={{width: 250, textAlign: 'center', padding: '10px 0', borderRadius: 30, border: `2px solid ${C.violet}`,
            fontFamily: TC, fontWeight: 700, fontSize: 28, color: C.white, opacity: ease(f, 42 + i * 3, 12)}}>{s}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ============ 12. CH3c：職涯前景 ============ */
const CAREERS: [string, string][] = [['AI 軟體工程師', C.cyan], ['半導體韌體研發', C.gold], ['網路資安工程師', C.green], ['物聯網自動化', C.violet], ['全端 / 雲端開發', C.pink]];

export const Career: React.FC = () => {
  const f = useCurrentFrame();
  const x0 = 140, y0 = 920, x1 = 1100, y1 = 480;
  const p = easeIO(f, 9, 66);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    if (t > p) break;
    const yv = t ** 1.8 * 0.92 + 0.04 * Math.sin(t * 14) * (1 - t);
    pts.push([x0 + t * (x1 - x0), y0 - yv * (y0 - y1)]);
  }
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0]},${q[1]}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <AbsoluteFill>
      <Ch3Tag />
      <Heading zh="AI × 軟體開發　黃金前景" en="GOLDEN CAREER PROSPECTS" accent={C.cyan} />
      <svg width={1920} height={1080} style={abs({left: 0, top: 0, opacity: ease(f, 6, 14)})}>
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={C.cyan} stopOpacity={0.45} /><stop offset="1" stopColor={C.cyan} stopOpacity={0} /></linearGradient>
        </defs>
        {Array.from({length: 6}, (_, k) => <line key={k} x1={x0} x2={x1} y1={y0 - (k * (y0 - y1)) / 5} y2={y0 - (k * (y0 - y1)) / 5} stroke="#ffffff18" />)}
        {pts.length > 1 && <>
          <path d={`${d} L${last[0]},${y0} L${x0},${y0} Z`} fill="url(#area)" />
          <path d={d} fill="none" stroke={C.cyan} strokeWidth={6} style={{filter: `drop-shadow(0 0 12px ${C.cyan})`}} />
          <circle cx={last[0]} cy={last[1]} r={12} fill="#fff" style={{filter: `drop-shadow(0 0 14px ${C.cyan})`}} />
        </>}
        {['2020', '2022', '2024', '2026', '2028', '2030'].map((yr, k) => (
          <text key={yr} x={x0 + (k * (x1 - x0)) / 5} y={y0 + 36} textAnchor="middle" fontFamily={EN} fontWeight={700} fontSize={22} fill={C.grey}>{yr}</text>))}
        <text x={x0 + 10} y={y1 - 20} fontFamily={EN} fontWeight={700} fontSize={24} letterSpacing={3} fill={C.cyan}>AI TALENT DEMAND ↗</text>
      </svg>
      {CAREERS.map(([s, col], i) => (
        <Pop key={s} delay={24 + i * 9} style={abs({left: 1190, top: 410 + i * 105, width: 560, height: 80, borderRadius: 40,
          border: `3px solid ${col}`, background: `${col}22`, boxShadow: `0 0 24px ${col}55`, display: 'flex', alignItems: 'center', justifyContent: 'center'})}>
          <span style={{fontFamily: TC, fontWeight: 900, fontSize: 38, color: C.white}}>{s}</span>
        </Pop>
      ))}
      <div style={abs({left: 0, right: 0, top: 975, textAlign: 'center', fontFamily: TC, fontWeight: 700, fontSize: 34, color: C.gold,
        opacity: ease(f, 84, 14)})}>學長姐遍佈半導體、軟體與通訊頂尖大廠</div>
    </AbsoluteFill>
  );
};

/* ============ 13. OUTRO ============ */
export const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 16}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <svg width={1920} height={1080} style={abs({left: 0, top: 0})}>
        {[C.cyan, C.blue, C.violet].map((c, k) => {
          const r = 400 + k * 70;
          return <ellipse key={k} cx={960} cy={500} rx={r} ry={r * 0.42} fill="none" stroke={c} strokeWidth={3} opacity={(0.5 - k * 0.12) * ease(f, k * 3, 20)}
            strokeDasharray={`${r * 3} ${r * 3}`} strokeDashoffset={f * (k % 2 ? 6 : -6)} />;
        })}
      </svg>
      <div style={{fontFamily: TC, fontWeight: 900, fontSize: 146, color: C.white, textShadow: glow(C.cyan, 1.4),
        transform: `scale(${interpolate(s, [0, 1], [1.2, 1])})`, opacity: Math.min(1, s * 2)}}>攜手築夢·智造未來</div>
      <div style={{width: 1280 * ease(f, 9, 24), height: 3, background: C.cyan, boxShadow: glow(C.cyan, 0.6), margin: '12px 0 24px'}} />
      <div style={{fontFamily: TC, fontWeight: 900, fontSize: 58, letterSpacing: 14, color: C.cyan, opacity: ease(f, 12, 15)}}>海青工商　資訊科</div>
      <div style={{fontFamily: TC, fontWeight: 700, fontSize: 34, color: '#ffffffdd', marginTop: 26, opacity: ease(f, 27, 18)}}>有理想 · 有目標 · 不斷進步 · 追求最好還要更好</div>
      <div style={{fontFamily: EN, fontWeight: 700, fontSize: 23, letterSpacing: 5, color: C.gold, marginTop: 22, opacity: ease(f, 39, 18)}}>
        HAICHING INDUSTRIAL HIGH SCHOOL · DEPARTMENT OF INFORMATION TECHNOLOGY</div>
    </AbsoluteFill>
  );
};
