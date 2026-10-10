/* 廣O 經典電影片頭（Saul Bass 風）：整支像一部電影的片頭字幕。剪紙色塊（邊緣手剪微抖）、黑條一根根滑入、幾何剪影、片頭字幕排版、迷魂記螺旋。
   招牌轉場：每個換章點一種剪紙手法（斜向黑條掃過、剪刀剪開、光圈收放、百葉黑條、色塊撕開、同心色環、直條落下），進片尾一律光圈。
   章的順序、每章的字、每章多長、用哪種轉場全部讀 timeline.json（timeline.py 依 storyboard 排好）。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import T from './timeline.json';
import {BEBAS, DM, SERIF} from './fonts';
import {C, Chap, Cut, EI, EIO, EO, LIN, Pt, Svg, barPts, cpoly, k, lerp, rnd, rnd01} from './kit';
import {ChCards, ChCast, ChDiscs, ChTitle} from './chA';
import {ChBox, ChCredits, ChEnd, ChPan, ChSynopsis} from './chB';

const CHS = T.chapters as unknown as Chap[];
const CH = CHS.map((c) => c.from);
const N = CHS.length;
const VIEW: Record<string, React.FC<{t: number; f: number; c: Chap; i: number}>> = {
  title: ChTitle, discs: ChDiscs, cast: ChCast, cards: ChCards, synopsis: ChSynopsis, boxoffice: ChBox, pan: ChPan, credits: ChCredits, end: ChEnd,
};
const at = (f: number) => {
  let i = 0;
  while (i + 1 < N && f >= CH[i + 1]) i++;
  return {i, t: f - CH[i]};
};
const scene = (i: number, t: number, f: number) => {
  const V = VIEW[CHS[i].type];
  return <V t={t} f={f} c={CHS[i]} i={i} />;
};

/* 靜態紙張顆粒（只算一次） */
const GRAIN = Array.from({length: 320}, (_, i) => ({
  x: rnd01(`gx${i}`) * 1920, y: rnd01(`gy${i}`) * 1080, r: 0.8 + rnd01(`gr${i}`) * 1.8,
  c: i % 5 === 0 ? 'rgba(251,246,234,0.35)' : 'rgba(22,20,18,0.16)',
}));
const Grain: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <Svg>{GRAIN.map((g, i) => <circle key={i} cx={g.x} cy={g.y} r={g.r} fill={g.c} />)}</Svg>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 62%, rgba(22,20,18,0.22) 100%)'}} />
  </AbsoluteFill>
);

/* ───── 換章招牌轉場 ───── */
const Layer: React.FC<{clip?: string; style?: React.CSSProperties; children: React.ReactNode}> = ({clip, style, children}) => (
  <AbsoluteFill style={{clipPath: clip, ...style}}>{children}</AbsoluteFill>
);
const SPLIT: Pt[] = Array.from({length: 15}, (_, i) => {
  const u = i / 14;
  return [lerp(1150, 780, u) + (i > 0 && i < 14 ? rnd(`sp${i}`) * 40 : 0), lerp(-40, 1120, u)] as Pt;
});
const Iris: React.FC<{r: number; children: React.ReactNode}> = ({r, children}) => (
  <AbsoluteFill style={{background: C.dark}}>
    <Svg>
      {Array.from({length: 12}, (_, i) => <circle key={i} cx={960} cy={520} r={160 + i * 90} fill="none" stroke="rgba(242,230,207,0.07)" strokeWidth={3} />)}
      <circle cx={960} cy={520} r={12} fill={C.red} />
    </Svg>
    <Layer clip={`circle(${Math.max(0, r)}px at 960px 520px)`}>{children}</Layer>
    <Svg>{r > 2 && <circle cx={960} cy={520} r={r + 5} fill="none" stroke={C.cr} strokeWidth={8} />}</Svg>
  </AbsoluteFill>
);

const Transition: React.FC<{kind: string; win: [number, number]; u: number; oldN: React.ReactNode; newN: React.ReactNode; f: number; j: number}> = ({kind, win, u, oldN, newN, f, j}) => {
  if (kind === 'sweep') {
    // 斜向黑條掃過：掃過的地方已是下一場
    const xc = lerp(-900, 2820, (u - win[0]) / (win[1] - win[0]));
    const off = (y: number) => (y - 540) * 0.35;
    const band = (c: number, w: number): Pt[] => [[c - w / 2 + off(-40), -40], [c + w / 2 + off(-40), -40], [c + w / 2 + off(1120), 1120], [c - w / 2 + off(1120), 1120]];
    return (
      <AbsoluteFill>
        {newN}
        <Layer clip={cpoly([[xc + off(0), 0], [1920, 0], [1920, 1080], [xc + off(1080), 1080]])}>{oldN}</Layer>
        <Svg>
          <Cut pts={band(xc, 760)} fill={C.ink} seed="sw0" f={f} amp={3} shadow={false} />
          <Cut pts={band(xc - 560, 60)} fill={C.ink} seed="sw1" f={f} amp={2} shadow={false} />
          <Cut pts={band(xc - 680, 22)} fill={C.red} seed="sw2" f={f} amp={2} shadow={false} />
          <Cut pts={band(xc + 520, 34)} fill={C.ink} seed="sw3" f={f} amp={2} shadow={false} />
        </Svg>
      </AbsoluteFill>
    );
  }
  if (kind === 'scissors') {
    // 剪刀剪開：先畫剪線，再兩片紙往兩側掀開
    if (u < 0) {
      const p = k(u, win[0], 0, LIN);
      const n = Math.max(2, Math.ceil(p * SPLIT.length));
      const d = 'M' + SPLIT.slice(0, n).map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L');
      return (
        <AbsoluteFill>
          {oldN}
          <Svg><path d={d} stroke={C.wh} strokeWidth={9} fill="none" strokeDasharray="20 12" /></Svg>
        </AbsoluteFill>
      );
    }
    const p = k(u, 0, win[1], EIO);
    const L: Pt[] = [[-10, -10], ...SPLIT, [-10, 1090]];
    const R: Pt[] = [[1930, -10], ...SPLIT, [1930, 1090]];
    return (
      <AbsoluteFill>
        {newN}
        <Layer clip={cpoly(L)} style={{transform: `translate(${-p * 1300}px, ${-p * 160}px) rotate(${-p * 8}deg)`}}>{oldN}</Layer>
        <Layer clip={cpoly(R)} style={{transform: `translate(${p * 1300}px, ${p * 160}px) rotate(${p * 8}deg)`}}>{oldN}</Layer>
      </AbsoluteFill>
    );
  }
  if (kind === 'iris') {
    // 光圈收縮到一點，再從下一場打開
    const r = u < 0 ? lerp(1150, 0, k(u, win[0], 0, EI)) : lerp(0, 1150, k(u, 0, win[1], EO));
    return <Iris r={r}>{u < 0 ? oldN : newN}</Iris>;
  }
  if (kind === 'blinds' || kind === 'bars') {
    // 黑條一根根掃過（blinds 橫條百葉左右交錯、bars 直條落下）
    const hz = kind === 'blinds';
    const n = hz ? 7 : 6;
    const span = (hz ? 1080 : 1920) / n;
    return (
      <AbsoluteFill>
        {u < 0 ? oldN : newN}
        <Svg>
          {Array.from({length: n}, (_, i) => {
            const dir = hz ? (i % 2 ? -1 : 1) : 1;
            const pin = k(u, -10 + i * 0.9, -3 + i * 0.5, EO);
            const pout = k(u, i * 0.4, 6 + i * 0.5, EIO);
            const D = hz ? 2100 : 1250;
            const o = (-(1 - pin) + pout) * D * dir;
            const pts = hz ? barPts(960 + o, span * (i + 0.5), 2000, span * 0.86, 0) : barPts(span * (i + 0.5), 540 + o, 1160, span * 0.86, 90);
            return pin > 0 && pout < 1 ? <Cut key={i} pts={pts} fill={i === 3 ? C.red : C.ink} seed={`vb${j}${i}`} f={f} amp={3} shadow={false} /> : null;
          })}
        </Svg>
      </AbsoluteFill>
    );
  }
  if (kind === 'tear') {
    // 色塊撕開：下一場從左邊被撕開露出，撕口有白色紙纖維
    const e = lerp(-220, 2200, k(u, win[0], win[1], EIO));
    const edge: Pt[] = Array.from({length: 29}, (_, i) => [e + rnd(`rp${i}`) * 34 + (i * 40 - 540) * 0.18, -20 + i * 40] as Pt);
    const poly: Pt[] = [[-20, -20], ...edge, [-20, 1100]];
    const fiber: Pt[] = [...edge, ...edge.slice().reverse().map((q, i) => [q[0] + 22 + rnd(`fb${i}`) * 8, q[1]] as Pt)];
    return (
      <AbsoluteFill>
        {oldN}
        <Layer clip={cpoly(poly)}>{newN}</Layer>
        <Svg><path d={'M' + fiber.map((q) => `${q[0].toFixed(1)} ${q[1]}`).join('L') + 'Z'} fill={C.wh} /></Svg>
      </AbsoluteFill>
    );
  }
  // rings：同心色環向外擴散，中間露出下一場
  const R = lerp(0, 1350, k(u, win[0], win[1], EO));
  return (
    <AbsoluteFill>
      {oldN}
      <Svg>
        {R > 0 && ([[C.mu, 210], [C.ink, 140], [C.or, 70]] as [string, number][]).map(([c, d], i) => <circle key={i} cx={960} cy={520} r={R + d} fill={c} />)}
      </Svg>
      <Layer clip={`circle(${R}px at 960px 520px)`}>{newN}</Layer>
    </AbsoluteFill>
  );
};

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const {i, t} = at(f);
  let body: React.ReactNode = scene(i, t, f);
  for (let j = 1; j < N; j++) {
    const u = f - CH[j];
    const w = CHS[j].win;
    if (u >= w[0] && u < w[1]) {
      body = <Transition kind={CHS[j].trans} win={w} j={j} u={u} f={f} oldN={scene(j - 1, f - CH[j - 1], f)} newN={scene(j, u, f)} />;
      break;
    }
  }
  return (
    <AbsoluteFill style={{background: C.cr, overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      {body}
      <Grain />
    </AbsoluteFill>
  );
};

/** 全字測試圖：storyboard 用到的每個字用每一種字型串接各排一次，看有沒有缺字方塊 */
export const FontTest: React.FC = () => {
  const txt = Array.from(new Set(Array.from((T.allText as string).replace(/\s/g, '')))).join('');
  const row = (fam: string, w: number, color: string, label: string) => (
    <div style={{marginTop: 14}}>
      <div style={{fontFamily: 'monospace', fontSize: 20, color: C.te}}>{label}</div>
      <div style={{fontFamily: fam, fontWeight: w, fontSize: 34, lineHeight: 1.22, color, wordBreak: 'break-all'}}>{txt}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{background: C.cr, padding: 30}}>
      {row(SERIF, 900, C.ink, 'Noto Serif TC 900')}
      {row(DM, 400, C.red, 'DM Serif Display → Noto Serif TC')}
      {row(BEBAS, 400, C.te, 'Bebas Neue → Noto Serif TC')}
    </AbsoluteFill>
  );
};
