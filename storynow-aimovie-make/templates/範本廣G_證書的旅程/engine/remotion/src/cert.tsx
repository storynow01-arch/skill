/* 範本廣G：主角「會害羞的紙片」、印章、章印。紙片上的字、章上的字、小圓章的字都讀 timeline.json（storyboard）。 */
import React from 'react';
import {T, NG, CLIMAX, GRAIN, kk, mix, OUT, IN, SM, decay, face, lookAt, Face} from './core';
import {FONT} from './fonts';

export const RED = '#d9483b';
const G = T.d.gates;
/** 小圓章收進紙片底下的格子：門數 1～4，平均排開 */
const SP = NG <= 3 ? 74 : 62;
const SLOT_X = G.map((_, i) => (i - (NG - 1) / 2) * SP);
const SLOT_Y = 76;
const SEAL_Y = 14;
const big = (i: number) => i === CLIMAX && NG > 1;

/** 大章印在紙片上顯示的程度（0..1）：這段時間臉和小章淡下去，讓章上的字讀得清楚 */
export const bigSeal = (f: number) =>
  Math.max(0, ...T.stamps.map((S) => kk(f, S + 8, S + 20) * (1 - kk(f, S + 42, S + 54))));

/** 共用 defs：蠟筆／印泥顆粒遮罩 */
export const Defs: React.FC = () => (
  <defs>
    <pattern id="adGg" patternUnits="userSpaceOnUse" width={256} height={256}>
      <image href={GRAIN} width={256} height={256} />
    </pattern>
    <mask id="adGink" maskContentUnits="userSpaceOnUse">
      <rect x={-2000} y={-2000} width={6000} height={6000} fill="url(#adGg)" />
    </mask>
  </defs>
);

export const paperPath = (amp: number, ph: number) => {
  const w = 150, h = 110, n = 10;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const x = -w + (2 * w * i) / n;
    pts.push(`${x.toFixed(1)},${(-h + amp * Math.sin(i * 0.9 + ph)).toFixed(1)}`);
  }
  for (let i = n; i >= 0; i--) {
    const x = -w + (2 * w * i) / n;
    pts.push(`${x.toFixed(1)},${(h + amp * Math.sin(i * 0.9 + ph + 1.3)).toFixed(1)}`);
  }
  return 'M' + pts.join('L') + 'Z';
};

const Eye: React.FC<{x: number; fc: Face; lx: number; ly: number}> = ({x, fc, lx, ly}) => {
  const ink = '#4a3631';
  const sw = {stroke: ink, strokeWidth: 5, strokeLinecap: 'round' as const, fill: 'none'};
  if (fc === 'sleep') return <path d={`M${x - 13},0 Q${x},11 ${x + 13},0`} {...sw} />;
  if (fc === 'blink') return <path d={`M${x - 12},3 Q${x},7 ${x + 12},3`} {...sw} />;
  if (fc === 'happy') return <path d={`M${x - 13},7 Q${x},-11 ${x + 13},7`} {...sw} />;
  const s = fc === 'worry' ? 0.85 : fc === 'shy' ? 0.75 : 1;
  const ex = x + lx * 5, ey = ly * 5 + (fc === 'shy' ? 4 : 0);
  return (
    <g>
      <ellipse cx={ex} cy={ey} rx={12 * s} ry={16 * s} fill={ink} />
      <circle cx={ex + 4} cy={ey - 6 * s} r={4.2 * s} fill="#fff" />
      <circle cx={ex - 4} cy={ey + 6 * s} r={1.8 * s} fill="#fff" opacity={0.8} />
    </g>
  );
};

/** 紙片本人（本地座標，中心 0,0，寬 300 高 220） */
export const CertBody: React.FC<{f: number; flying: number; ghost?: boolean}> = ({f, flying, ghost}) => {
  const fc = face(f);
  const [lx, ly] = lookAt(f);
  const amp = 2.5 + 9 * flying;
  const d = paperPath(amp, f * 0.45);
  const happy = fc === 'happy' || fc === 'shy';
  const blush = fc === 'shy' ? 1 : happy ? 0.85 : fc === 'sleep' ? 0.5 : 0.45;
  if (ghost) return <path d={d} fill="#fffaf0" stroke="#e3b673" strokeWidth={4} />;
  const ink = '#4a3631';
  const dim = 1 - 0.85 * bigSeal(f);
  let mouth: React.ReactNode;
  if (fc === 'happy') mouth = <path d="M-15,26 Q0,50 15,26 Z" fill="#e8706f" stroke={ink} strokeWidth={3.5} strokeLinejoin="round" />;
  else if (fc === 'worry') mouth = <ellipse cx={0} cy={34} rx={6} ry={7} fill="#e8706f" stroke={ink} strokeWidth={3} />;
  else if (fc === 'sleep') mouth = <ellipse cx={0} cy={32} rx={4} ry={4.5} fill="none" stroke={ink} strokeWidth={3} />;
  else if (fc === 'shy') mouth = <path d="M-12,33 q3,-4 6,0 q3,4 6,0 q3,-4 6,0 q3,4 6,0" fill="none" stroke={ink} strokeWidth={3.2} strokeLinecap="round" />;
  else mouth = <path d="M-11,29 Q0,39 11,29" fill="none" stroke={ink} strokeWidth={3.5} strokeLinecap="round" />;
  return (
    <g>
      <path d={d} fill="#fffaf0" stroke="#e3b673" strokeWidth={4} strokeLinejoin="round" />
      <rect x={-134} y={-94} width={268} height={188} rx={10} fill="none" stroke="#f0cf95" strokeWidth={2.5} strokeDasharray="10 6" />
      <text x={-6} y={-58 + (34 - T.d.heroSize) * 0.3} textAnchor="middle" fontFamily={FONT} fontSize={T.d.heroSize} fill="#b06a45" opacity={dim}>{T.d.hero}</text>
      {/* 玫瑰花結 */}
      <g transform="translate(122,-84)">
        <path d="M-8,10 L-16,40 L-8,34 L-2,42 Z" fill="#f29bb0" />
        <path d="M8,10 L16,40 L8,34 L2,42 Z" fill="#f4b6c4" />
        {Array.from({length: 8}, (_, i) => (
          <circle key={i} cx={Math.cos((i / 8) * Math.PI * 2) * 13} cy={Math.sin((i / 8) * Math.PI * 2) * 13} r={8} fill="#f6a7ba" />
        ))}
        <circle r={10} fill="#ffd36e" />
      </g>
      {/* 臉 */}
      <g opacity={dim}>
        {fc === 'worry' && (
          <g stroke={ink} strokeWidth={3.5} strokeLinecap="round">
            <line x1={-62} y1={-26} x2={-40} y2={-32} />
            <line x1={62} y1={-26} x2={40} y2={-32} />
          </g>
        )}
        <ellipse cx={-84} cy={28} rx={19} ry={10} fill="#f59bb0" opacity={blush} />
        <ellipse cx={84} cy={28} rx={19} ry={10} fill="#f59bb0" opacity={blush} />
        <Eye x={-50} fc={fc} lx={lx} ly={ly} />
        <Eye x={50} fc={fc} lx={lx} ly={ly} />
        {mouth}
      </g>
    </g>
  );
};

/** 章面上的字（1～2 行，字級由 timeline.py 依字數算好） */
const SealText: React.FC<{lines: string[]; size: number; rect: boolean}> = ({lines, size, rect}) => {
  if (lines.length === 1) return <text x={0} y={size * 0.36} textAnchor="middle" fontFamily={FONT} fontSize={size * 1.15} fill={RED}>{lines[0]}</text>;
  const gap = rect ? 60 : 46;
  return (
    <>
      <text x={0} y={-gap / 2 + size * 0.36} textAnchor="middle" fontFamily={FONT} fontSize={size} fill={RED}>{lines[0]}</text>
      <text x={0} y={gap / 2 + size * 0.36} textAnchor="middle" fontFamily={FONT} fontSize={size * (rect ? 0.92 : 1)} fill={RED}>{lines[1]}</text>
    </>
  );
};

/** 章印（大的：在紙片上；小的：收進底下的格子） */
export const SealsOnCert: React.FC<{f: number}> = ({f}) => {
  const bg = bigSeal(f);
  return (
    <g>
      {G.map((s, i) => {
        const S = T.stamps[i];
        if (f < S) return <circle key={i} cx={SLOT_X[i]} cy={SLOT_Y} r={22} fill="none" stroke="#f0cf95" strokeWidth={2.5} strokeDasharray="5 5" opacity={1 - bg} />;
        const own = f < S + 56;
        const mv = kk(f, S + 40, S + 62, SM);
        const pop = 1 + 0.12 * decay(f, S, 4);
        const x = mix(0, SLOT_X[i], mv), y = mix(SEAL_Y, SLOT_Y, mv);
        const sc = mix(1, 0.27, mv) * pop;
        const bigO = 1 - kk(f, S + 46, S + 58);
        const miniO = kk(f, S + 54, S + 64);
        return (
          <g key={i} transform={`translate(${x},${y}) rotate(${mix(-6 + i * 4, 0, mv)})`}>
            {bigO > 0 && (
              <g transform={`scale(${sc})`} opacity={0.92 * bigO} mask="url(#adGink)">
                {s.rect ? (
                  <>
                    <rect x={-112} y={-82} width={224} height={164} rx={22} fill="none" stroke={RED} strokeWidth={8} />
                    <rect x={-100} y={-70} width={200} height={140} rx={14} fill="none" stroke={RED} strokeWidth={2.5} />
                  </>
                ) : (
                  <>
                    <circle r={92} fill="none" stroke={RED} strokeWidth={8} />
                    <circle r={80} fill="none" stroke={RED} strokeWidth={2.5} />
                  </>
                )}
                <SealText lines={s.seal} size={s.ssize} rect={s.rect} />
              </g>
            )}
            {miniO > 0 && (
              <g opacity={miniO * (own ? 1 : 1 - 0.85 * bg)}>
                <circle r={23} fill="#fff4ee" stroke={RED} strokeWidth={4} />
                <text x={0} y={10} textAnchor="middle" fontFamily={FONT} fontSize={28} fill={RED}>{s.mini}</text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};

/** 印章（木頭章，從上面砸下來；本地座標＝紙片座標） */
const StampShape: React.FC<{i: number}> = ({i}) => {
  const w = big(i) ? 250 : 216;
  const pad = ['#f29bb0', '#9fd8c0', '#c9b6ec', '#ffd36e'][big(i) ? 3 : i % 3];
  return (
    <g>
      <rect x={-w / 2} y={-40} width={w} height={34} rx={8} fill={RED} />
      <rect x={-w / 2 - 6} y={-150} width={w + 12} height={114} rx={22} fill="#f3d3a0" stroke="#c99a62" strokeWidth={4} />
      <path d={`M${-w / 2 + 16},-128 L${w / 2 - 16},-128`} stroke="#fff3dc" strokeWidth={8} strokeLinecap="round" opacity={0.7} />
      <rect x={-24} y={-230} width={48} height={86} rx={14} fill="#f3d3a0" stroke="#c99a62" strokeWidth={4} />
      <circle cx={0} cy={-262} r={46} fill={pad} stroke="#c97a8a" strokeWidth={4} />
      <circle cx={-14} cy={-276} r={12} fill="#fff" opacity={0.6} />
    </g>
  );
};

export const stampY = (f: number, S: number) => {
  if (f < S) return -1000 * (1 - kk(f, S - 32, S, IN));
  if (f < S + 10) return 0;
  return -1000 * kk(f, S + 10, S + 32, OUT);
};

export const Stamp: React.FC<{f: number}> = ({f}) => {
  const i = T.stamps.findIndex((S) => f >= S - 34 && f < S + 34);
  if (i < 0) return null;
  const S = T.stamps[i];
  const y = stampY(f, S);
  const press = f >= S && f < S + 10 ? 1 - 0.1 * Math.sin((Math.PI * (f - S)) / 10) : 1;
  const base = SEAL_Y + 92 + (big(i) ? 8 : 0);
  const shadowO = f < S ? kk(f, S - 34, S) * 0.25 : 0.25 * (1 - kk(f, S + 10, S + 24));
  const vel = Math.abs(y - stampY(f - 1.5, S));
  return (
    <g>
      <ellipse cx={0} cy={SEAL_Y} rx={110} ry={100} fill="#6b3a2a" opacity={shadowO * 0.6} />
      {vel > 12 &&
        [3, 2, 1].map((k) => (
          <g key={k} transform={`translate(0,${base + y - (vel * k) / 1.5})`} opacity={0.12 * (4 - k)}>
            <StampShape i={i} />
          </g>
        ))}
      <g transform={`translate(0,${base + y}) scale(${2 - press},${press})`}>
        <StampShape i={i} />
      </g>
    </g>
  );
};
