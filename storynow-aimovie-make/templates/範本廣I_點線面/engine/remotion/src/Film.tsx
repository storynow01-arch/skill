/* 範本廣I：片中片（4 維＝時間）——鏡頭鑽進點長成的鏡頭裡，幾何積木變成演員演一支小廣告。座標 1920×1080。
   標題、副標、兩句口號讀 storyboard 的 film；REC／SCENE 4D／TAKE 01 是範本固定的片場記號。 */
import React from 'react';
import {easeOutBack, k, lerp, LIN, pulse, rnd} from './kit';
import {BF, C, D, Film as FilmT, MK, NOTO, SG, WText} from './lib';

const STAGE = 830;
const HOME = [420, 760, 1100, 1440];
type Act = {x: number; y: number; sx: number; sy: number; rot: number};

const hop = (f: number, t0: number, t1: number, a: [number, number], b: [number, number], hgt: number) => {
  const u = k(f, t0, t1, LIN);
  return {x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u) - hgt * Math.sin(Math.PI * u)};
};
const squash = (f: number, land: number) => (f >= land && f < land + 10 ? Math.sin(((f - land) / 10) * Math.PI) * 0.28 * Math.exp(-(f - land) / 6) : 0);

const actor = (F: FilmT, i: number, f: number): Act => {
  const a = F.actors[i];
  const st = F.stack;
  let x = -260, y = STAGE, land = a;
  if (f < a - 12) return {x, y, sx: 1, sy: 1, rot: 0};
  let p = hop(f, a - 12, a, [-260, STAGE], [HOME[i], STAGE], 360);
  x = p.x; y = p.y;
  if (f >= a) {
    const ph = ((f - a) % BF) / BF;
    y = STAGE - 34 * Math.sin(Math.PI * ph);
    land = a + Math.floor((f - a) / BF) * BF;
  }
  // 疊成角色：方塊→身體、圓→頭、三角→帽子、點→眼睛
  const tgt: [number, number][] = [[960, 680], [960, STAGE], [960, 520], [995, 640]];
  const when = [st[1], st[0], st[2], st[2] + 8];
  if (f >= when[i] - 10) {
    p = hop(f, when[i] - 10, when[i], [HOME[i], STAGE], tgt[i], 260);
    x = p.x; y = p.y; land = when[i];
  }
  const sq = squash(f, land);
  return {x, y, sx: 1 + sq, sy: 1 - sq, rot: 0};
};

const Shape: React.FC<{i: number; s: Act}> = ({i, s}) => {
  const body =
    i === 0 ? <circle cx={0} cy={-80} r={80} fill={C.red} /> :
    i === 1 ? <rect x={-75} y={-150} width={150} height={150} fill={C.blue} /> :
    i === 2 ? <path d="M-90,0L90,0L0,-156Z" fill={C.yellow} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" /> :
    <circle cx={0} cy={-28} r={28} fill={C.ink} />;
  return <g transform={`translate(${s.x} ${s.y}) scale(${s.sx} ${s.sy})`}>{body}</g>;
};

export const Film: React.FC<{f: number}> = ({f}) => {
  const F = D.film as FilmT;
  const t0 = F.slate;
  const armA = f < t0 - 8 ? -24 : -24 * (1 - k(f, t0 - 8, t0, LIN));
  const slateOut = k(f, t0 + 2, t0 + 12);
  const blink = Math.floor(f / 15) % 2 === 0;
  const spin = k(f, F.spin, F.spin + 18) * 360;
  const swayOn = F.stack[2] + 12;
  const sway = f >= swayOn ? Math.sin(((f - swayOn) / BF) * Math.PI / 2) * 5 : 0;
  const acts = [0, 1, 2, 3].map((i) => actor(F, i, f));
  const stacked = (i: number) => f >= [F.stack[1], F.stack[0], F.stack[2], F.stack[2] + 8][i];
  const bulb = k(f, F.bulb, F.bulb + 10, easeOutBack);
  const [w1, w2] = F.words;
  return (
    <g>
      <rect x={0} y={0} width={1920} height={1080} fill={C.soft} />
      <g opacity={0.22}>
        <circle cx={1560} cy={330} r={260} fill={C.yellow} />
        <g transform={`rotate(${(f - MK.hit) * 1.2} 300 900)`}><rect x={150} y={750} width={300} height={300} fill={C.blue} /></g>
        <path d="M1700,1016L1920,1016L1920,760Z" fill={C.red} />
      </g>
      <rect x={0} y={0} width={1920} height={64} fill={C.ink} />
      <rect x={0} y={1016} width={1920} height={64} fill={C.ink} />
      {Array.from({length: 22}, (_, i) => (
        <g key={i}>
          <rect x={30 + i * 88} y={20} width={40} height={24} rx={4} fill={C.soft} />
          <rect x={30 + i * 88} y={1036} width={40} height={24} rx={4} fill={C.soft} />
        </g>
      ))}
      <circle cx={120} cy={166} r={16} fill={C.red} opacity={blink ? 1 : 0.25} />
      <text x={150} y={179} fontSize={38} fontFamily={SG} fontWeight={400} fill={C.ink}>REC</text>
      <text x={1800} y={179} fontSize={36} fontFamily={SG} fontWeight={300} fill={C.ink} textAnchor="end">SCENE 4D</text>

      <WText id="fm1" x={960} y={262} size={F.titleSize} text={F.title} p={k(f, F.titleAt, F.titleAt + 28, LIN)} weight={100} anchor="middle" ls={12} />
      <WText id="fm2" x={960} y={334} size={F.subSize} text={F.sub} p={k(f, F.subAt, F.subAt + 22, LIN)} weight={300} anchor="middle" fill={C.red} ls={4} />
      <line x1={120} x2={120 + 1680 * k(f, t0 + 2, t0 + 20)} y1={STAGE} y2={STAGE} stroke={C.ink} strokeWidth={4} />

      {w1 && <WText id="fm3" x={490} y={660} size={F.wordSizes[0]} text={w1} p={k(f, F.word1, F.word1 + 22, LIN)} weight={300} anchor="middle" fill={C.red} />}
      {w2 && <WText id="fm4" x={1430} y={720} size={F.wordSizes[1]} text={w2} p={k(f, F.word2, F.word2 + 22, LIN)} weight={300} anchor="middle" fill={C.blue} />}

      {bulb > 0 && (
        <g transform={`translate(1250 430) scale(${bulb * 0.85})`}>
          <g transform={`rotate(${(f - F.bulb) * 3})`}>
            {Array.from({length: 12}, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return <line key={i} x1={Math.cos(a) * 88} y1={Math.sin(a) * 88} x2={Math.cos(a) * (118 + 12 * pulse(f, BF))} y2={Math.sin(a) * (118 + 12 * pulse(f, BF))} stroke={i % 3 === 0 ? C.red : C.ink} strokeWidth={6} strokeLinecap="round" />;
            })}
          </g>
          <circle r={66} fill={C.yellow} stroke={C.ink} strokeWidth={5} />
          <rect x={-26} y={62} width={52} height={34} fill={C.ink} />
        </g>
      )}

      <g transform={`rotate(${sway} 960 ${STAGE}) rotate(${spin} 960 660)`}>
        {[0, 1, 2, 3].map((i) => stacked(i) ? <Shape key={i} i={i} s={acts[i]} /> : null)}
      </g>
      {[0, 1, 2, 3].map((i) => {
        if (stacked(i)) return null;
        return (
          <g key={i}>
            {[4, 3, 2, 1].map((g) => {
              const s0 = actor(F, i, f - g), s1 = acts[i];
              if (Math.hypot(s0.x - s1.x, s0.y - s1.y) < 8) return null;
              return <g key={g} opacity={0.32 / g}><Shape i={i} s={s0} /></g>;
            })}
            <Shape i={i} s={acts[i]} />
          </g>
        );
      })}
      {f >= F.spin && f < F.spin + 40 && Array.from({length: 26}, (_, i) => {
        const t = f - F.spin;
        const a = (i / 26) * Math.PI * 2 + rnd(`cf${i}`) * 0.3;
        const v = 18 + 10 * Math.abs(rnd(`cv${i}`));
        const x = 960 + Math.cos(a) * v * t;
        const y = 640 + Math.sin(a) * v * t + 0.5 * t * t;
        return <rect key={i} x={x - 9} y={y - 5} width={18} height={10} fill={[C.red, C.blue, C.yellow, C.ink][i % 4]}
          transform={`rotate(${t * 20 + i * 30} ${x} ${y})`} opacity={1 - t / 40} />;
      })}

      {slateOut < 1 && (
        <g transform={`translate(0 ${-900 * slateOut})`}>
          <rect x={560} y={330} width={800} height={470} fill="#fff" stroke={C.ink} strokeWidth={8} />
          <line x1={560} x2={1360} y1={560} y2={560} stroke={C.ink} strokeWidth={3} />
          <line x1={960} x2={960} y1={560} y2={800} stroke={C.ink} strokeWidth={3} />
          <text x={960} y={490} fontSize={F.slateSize} fontFamily={NOTO} fontWeight={300} fill={C.ink} textAnchor="middle">{F.title}</text>
          <text x={760} y={700} fontSize={44} fontFamily={SG} fontWeight={300} fill={C.ink} textAnchor="middle">SCENE 4D</text>
          <text x={1160} y={700} fontSize={44} fontFamily={SG} fontWeight={300} fill={C.ink} textAnchor="middle">TAKE 01</text>
          <g transform={`rotate(${armA} 560 330)`}>
            <rect x={560} y={262} width={800} height={68} fill="#fff" stroke={C.ink} strokeWidth={8} />
            {Array.from({length: 7}, (_, i) => (
              <path key={i} d={`M${600 + i * 112},266L${660 + i * 112},266L${620 + i * 112},326L${560 + i * 112},326Z`} fill={[C.ink, C.red, C.ink, C.blue, C.ink, C.yellow, C.ink][i]} />
            ))}
          </g>
        </g>
      )}
    </g>
  );
};
