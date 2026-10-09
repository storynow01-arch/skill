/* 廣C：每份文件的內容（文件本地座標，左上角為原點）。字全部來自 storyboard（打字機文字在 timeline.json 的 type、手寫在 hand）。
   原作的台灣→日本地圖、櫻花與鳥居插圖改成不帶國家符號的抽象地圖與五種插圖（building／mountain／cup／book／star）。 */
import React from 'react';
import {interpolate} from 'remotion';
import T from './timeline.json';
import {clamp, k} from './kit';
import {Typed, Hand, PenPath, Stamp, INK, RED, PAPER, KRAFT, textX} from './parts';
import {SERIF, ELITE, STAMP} from './fonts';
import {E, TY, HD, D, HAS, CIRCLE, UNDER, ROUTE, bez, TICK_PTS} from './scene';

/* eslint-disable @typescript-eslint/no-explicit-any */
const printed = (size: number, color = INK, fam = ELITE): React.CSSProperties => ({position: 'absolute', fontFamily: `'${fam}', '${SERIF}'`, fontSize: size, color, lineHeight: 1.1, whiteSpace: 'nowrap'});
const Bar: React.FC<{x: number; y: number; w: number; h?: number}> = ({x, y, w, h = 30}) => <div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: '#191614', opacity: 0.9}} />;
const T_ = (f: number, key: string, size: number, x: number, y: number, extra: Partial<React.ComponentProps<typeof Typed>> = {}) =>
  TY[key] ? <Typed f={f} text={TY[key].text} start={TY[key].start} step={TY[key].step} size={size} x={x} y={y} seed={key} {...extra} /> : null;
/** 字太長時縮小（以半形 0.6、全形 1 估寬） */
const fitSize = (s: string, size: number, maxw: number) => Math.min(size, maxw / Math.max(0.1, textX(s, Array.from(s).length, 1)));

/* ───── 任務簡報 ───── */
export const Doc1: React.FC<{f: number}> = ({f}) => (
  <>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 14, background: RED}} />
    <div style={{...printed(30, RED), left: 70, top: 34}}>CLASSIFIED</div>
    {D.folder.file && <div style={{...printed(30, '#5a524a'), right: 60, top: 34}}>{D.folder.file}</div>}
    {T_(f, 'b1h', 84, 66, 82, {weight: 900})}
    {T_(f, 'b1e', 40, 72, 196, {color: '#4a443d'})}
    <div style={{position: 'absolute', left: 70, right: 70, top: 262, borderTop: '3px dashed #8a8174'}} />
    {T_(f, 'b1a', 48, 80, 300)}
    {T_(f, 'b1b', 48, 80, 400)}
    <Bar x={80} y={520} w={640} />
    <Bar x={80} y={572} w={420} />
    <Bar x={540} y={572} w={160} />
    <svg width={1180} height={700} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      {CIRCLE.on && <PenPath p={k(f, E.circle, E.circle + 26, (x) => x)} w={6}
        d={Array.from({length: 61}, (_, i) => {
          const t = -Math.PI * 0.95 + (i / 60) * Math.PI * 2.15;
          return `${i ? 'L' : 'M'}${(CIRCLE.cx + Math.cos(t) * CIRCLE.rx).toFixed(1)},${(CIRCLE.cy + Math.sin(t) * CIRCLE.ry * (1 + i / 400)).toFixed(1)}`;
        }).join('')} />}
      {UNDER.on && <PenPath p={k(f, E.underline, E.underline + 16, (x) => x)} w={7} d={`M${UNDER.x0 - 4},462 Q${(UNDER.x0 + UNDER.x1) / 2},470 ${UNDER.x1 + 4},458`} />}
    </svg>
  </>
);

/* ───── 目標地圖（抽象陸塊，不是真實國家） ───── */
const LAND_A = [[150, 470], [210, 448], [262, 470], [282, 520], [268, 580], [232, 618], [186, 612], [150, 572], [138, 520]];
const LAND_B = [[520, 330], [560, 300], [618, 286], [672, 262], [722, 228], [770, 196], [812, 170], [850, 158], [884, 176], [880, 222], [846, 258], [796, 290], [736, 318], [672, 338], [606, 350], [548, 352]];
const ISLE = [[880, 92], [924, 76], [960, 92], [948, 124], [904, 128]];
const poly = (pts: number[][]) => 'M' + pts.map((p) => p.join(',')).join('L') + 'Z';
export const MapDoc: React.FC<{f: number}> = ({f}) => {
  const m = D.map;
  const rp = k(f, E.route, E.route + 48, (x) => x);
  const n = 48;
  const route = Array.from({length: n + 1}, (_, i) => { const [x, y] = bez(i / n); return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join('');
  return (
    <>
      <div style={{...printed(44, INK, SERIF), fontWeight: 900, left: 50, top: 28}}>{m.title ?? '目標地圖'}</div>
      <div style={{...printed(30, '#5a524a'), left: 70 + Array.from(String(m.title ?? '目標地圖')).length * 44, top: 40}}>TARGET MAP / 01</div>
      <svg width={1060} height={760} style={{position: 'absolute', left: 0, top: 0}}>
        <rect x={40} y={100} width={980} height={510} fill="#d6ddd2" stroke="#3b3631" strokeWidth={3} />
        {Array.from({length: 9}, (_, i) => <line key={'v' + i} x1={40 + (i + 1) * 98} y1={100} x2={40 + (i + 1) * 98} y2={610} stroke="#9aa79a" strokeWidth={1.5} />)}
        {Array.from({length: 4}, (_, i) => <line key={'h' + i} x1={40} y1={100 + (i + 1) * 102} x2={1020} y2={100 + (i + 1) * 102} stroke="#9aa79a" strokeWidth={1.5} />)}
        {[LAND_A, LAND_B, ISLE].map((p, i) => <path key={i} d={poly(p)} fill="#efe5c9" stroke="#2c2824" strokeWidth={3} strokeLinejoin="round" />)}
        {[[320, 470], [360, 444], [400, 420], [440, 398], [480, 382]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5} fill="#efe5c9" stroke="#2c2824" strokeWidth={2} />)}
        <circle cx={ROUTE.x0} cy={ROUTE.y0} r={9} fill={RED} />
        <g transform="translate(950,540)">
          <circle r={38} fill="none" stroke="#3b3631" strokeWidth={2} />
          <path d="M0,-34 L9,0 L0,34 L-9,0Z" fill="#3b3631" />
        </g>
        <path d={route} fill="none" stroke={RED} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - rp} opacity={rp > 0 ? 1 : 0} />
      </svg>
      <div style={{...printed(32, '#3b3631', SERIF), left: 238, top: 600}}>{m.from}</div>
      <div style={{...printed(32, '#3b3631', SERIF), left: 640, top: 360}}>{m.to}</div>
      {T_(f, 'map', 56, 56, 640)}
    </>
  );
};

/* ───── 拍立得（幾何插圖，五種） ───── */
const Pic: React.FC<{kind: string; id: string}> = ({kind, id}) => {
  const sky = (a: string, b: string) => (
    <>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width={380} height={380} fill={`url(#${id})`} />
    </>
  );
  switch (kind) {
    case 'mountain':
      return (
        <>
          {sky('#f2a27c', '#f8e2bf')}
          <circle cx={270} cy={110} r={40} fill="#fff4dc" />
          <path d="M20,330 L190,120 L360,330Z" fill="#33456a" />
          <path d="M152,167 L190,120 L228,167 L210,160 L196,176 L182,158 L168,172Z" fill="#fff" />
          <rect x={188} y={74} width={5} height={48} fill="#3b3631" />
          <path d="M193,76 L232,88 L193,100Z" fill={RED} />
          <rect x={0} y={318} width={380} height={62} fill="#5c6e4f" />
        </>
      );
    case 'cup':
      return (
        <>
          {sky('#e9d3b4', '#f6ead6')}
          <rect x={0} y={280} width={380} height={100} fill="#8a5a3a" />
          <ellipse cx={190} cy={300} rx={120} ry={22} fill="#f3ecdb" />
          <path d="M100,170 L280,170 L262,292 Q190,316 118,292Z" fill="#f7f5ef" stroke="#3b3631" strokeWidth={4} />
          <path d="M276,196 Q330,196 318,236 Q306,268 266,262" fill="none" stroke="#3b3631" strokeWidth={8} />
          <ellipse cx={190} cy={172} rx={90} ry={14} fill="#6b3f1e" />
          <path d="M178,166 Q170,160 178,154 Q186,160 178,166Z M190,170 Q200,160 210,170 Q200,176 190,170Z" fill="#f3ecdb" />
          {[150, 190, 230].map((x, i) => <path key={i} d={`M${x},140 Q${x - 14},110 ${x},84 Q${x + 14},58 ${x},34`} fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.75} />)}
        </>
      );
    case 'book':
      return (
        <>
          {sky('#9cc2d8', '#e7eef2')}
          <rect x={0} y={300} width={380} height={80} fill="#7a5536" />
          <path d="M40,120 Q115,96 190,126 L190,300 Q115,272 40,292Z" fill="#fbf6e9" stroke="#3b3631" strokeWidth={4} />
          <path d="M340,120 Q265,96 190,126 L190,300 Q265,272 340,292Z" fill="#f3ecdb" stroke="#3b3631" strokeWidth={4} />
          {[0, 1, 2, 3, 4].map((i) => <line key={'l' + i} x1={64} y1={150 + i * 26} x2={168} y2={160 + i * 26} stroke="#9a8f80" strokeWidth={5} />)}
          {[0, 1, 2, 3, 4].map((i) => <line key={'r' + i} x1={212} y1={160 + i * 26} x2={316} y2={150 + i * 26} stroke="#9a8f80" strokeWidth={5} />)}
          <path d="M250,96 L262,60 L274,96Z" fill={RED} />
        </>
      );
    case 'star':
      return (
        <>
          {sky('#33456a', '#6f8aa3')}
          {Array.from({length: 14}, (_, i) => <circle key={i} cx={(i * 97) % 380} cy={(i * 53) % 220} r={2 + (i % 3)} fill="#fff" opacity={0.7} />)}
          <circle cx={190} cy={200} r={110} fill="#d9b55a" stroke="#8a6a1e" strokeWidth={8} />
          <path d={Array.from({length: 10}, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 34 : 80; return `${i ? 'L' : 'M'}${190 + Math.cos(a) * r},${200 + Math.sin(a) * r}`; }).join('') + 'Z'} fill={RED} />
          <path d="M120,300 L150,370 L190,330 L230,370 L260,300Z" fill={RED} opacity={0.9} />
        </>
      );
    default:
      return (
        <>
          {sky('#9cc2d8', '#f2d4b8')}
          <circle cx={300} cy={80} r={44} fill={RED} />
          <rect x={0} y={318} width={380} height={62} fill="#8aa874" />
          <rect x={40} y={170} width={240} height={150} fill="#ece4d2" />
          <path d="M30,172 L160,120 L290,172Z" fill="#4f5e70" />
          <circle cx={160} cy={150} r={14} fill="#fff" stroke="#4f5e70" strokeWidth={4} />
          {Array.from({length: 12}, (_, i) => <rect key={i} x={58 + (i % 4) * 56} y={200 + Math.floor(i / 4) * 38} width={34} height={24} fill="#6f8aa3" />)}
          <rect x={140} y={290} width={40} height={30} fill="#4f5e70" />
          <rect x={318} y={250} width={12} height={70} fill="#5a3b28" />
          {[[324, 220, 46], [292, 240, 30], [352, 246, 30], [320, 190, 32]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#a9c98a' : '#8fb86c'} />)}
        </>
      );
  }
};
export const Polaroid: React.FC<{f: number; which: 1 | 2}> = ({f, which}) => {
  const h = HD[`hand${which}`];
  const size = which === 1 ? 44 : 40;
  return (
    <>
      <svg width={380} height={380} style={{position: 'absolute', left: 30, top: 30}}>
        <Pic kind={(T.pics as string[])[which - 1]} id={`sky${which}`} />
      </svg>
      <Hand f={f} lines={[h.text]} start={h.start} end={h.end} size={Math.min(size, 380 / Math.max(1, textX(h.text, h.text.length, 1)))} x={30} y={440} />
    </>
  );
};

/* ───── 便利貼 ───── */
export const StickyDoc: React.FC<{f: number}> = ({f}) => (
  <>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 60, background: 'rgba(0,0,0,0.05)'}} />
    <Hand f={f} lines={T.note as string[]} start={HD.hand3.start} end={HD.hand3.end} size={70} x={40} y={90} lh={1.34} />
    <svg width={340} height={340} style={{position: 'absolute', left: 0, top: 0}}>
      <PenPath p={k(f, HD.hand3.end + 2, HD.hand3.end + 10, (x) => x)} color="#22305a" w={5} d="M190,270 Q250,250 290,280 M278,262 L292,281 L270,288" />
    </svg>
  </>
);

/* ───── 裝備清單 ───── */
export const CheckDoc: React.FC<{f: number}> = ({f}) => (
  <>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 12, background: '#3b3631'}} />
    {T_(f, 'c0', 56, 60, 52, {weight: 900})}
    <div style={{...printed(30, '#5a524a'), left: 62, top: 140}}>{D.check?.en ?? 'EQUIPMENT CHECKLIST'}</div>
    {[230, 380].map((y, i) => <div key={i} style={{position: 'absolute', left: 70, top: y, width: 70, height: 70, border: `5px solid ${INK}`}} />)}
    {T_(f, 'c1', 56, 180, 236)}
    {T_(f, 'c2', 56, 180, 386)}
    <Bar x={70} y={540} w={560} />
    <Bar x={70} y={592} w={300} />
    <svg width={900} height={700} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      {HAS.check && [[E.tick1, 230], [E.tick2, 380]].map(([t, y], i) => (
        <PenPath key={i} p={k(f, t, t + 12, (x) => x)} w={11} d={'M' + TICK_PTS.map(([x, yy]) => `${70 + x},${y + yy}`).join('L')} />
      ))}
    </svg>
  </>
);

/* ───── 最後一份通知（高潮：核准章） ───── */
export const LetterDoc: React.FC<{f: number}> = ({f}) => {
  const L = D.letter;
  const st = L.stamp ?? '核准';
  return (
    <>
      <div style={{position: 'absolute', left: 30, right: 30, top: 24, height: 10, borderTop: `3px solid ${RED}`, borderBottom: `3px solid ${RED}`}} />
      {T_(f, 'l0', 96, 76, 66, {weight: 900})}
      {T_(f, 'l1', 40, 82, 200, {color: '#4a443d'})}
      <div style={{position: 'absolute', left: 76, right: 76, top: 270, borderTop: '3px dashed #8a8174'}} />
      {T_(f, 'l2', 60, 80, 310)}
      <Bar x={80} y={450} w={460} />
      <Bar x={80} y={502} w={330} />
      <Bar x={80} y={554} w={400} />
      {L.foot && <div style={{...printed(30, '#5a524a'), left: 80, top: 640}}>{L.foot}</div>}
      <div style={{position: 'absolute', left: 852, top: 578}}>
        <Stamp f={f} at={E.stamp} w={396} h={330} rot={-9} seed="ok" fall={E.stamp - E.stampLift}>
          <div style={{fontFamily: `'${STAMP}'`, fontWeight: 900, fontSize: fitSize(st, 150, 320), lineHeight: 1, color: RED}}>{st}</div>
          {(L.stampEn ?? 'APPROVED') && <div style={{fontFamily: `'${ELITE}'`, fontSize: 38, color: RED, marginTop: 8, letterSpacing: 5}}>{L.stampEn ?? 'APPROVED'}</div>}
        </Stamp>
      </div>
    </>
  );
};

/* ───── 檔案夾封面（正面） ───── */
export const CoverFront: React.FC<{f: number}> = ({f}) => {
  const F = D.folder, END = D.end;
  const rip = k(f, E.rip, E.rip + 22, EO2);
  const gone = interpolate(f, [E.rip + 16, E.rip + 32], [1, 0], clamp);
  const titleW = textX(F.title, Array.from(String(F.title)).length, 46);
  const sec = F.secret ?? '極機密';
  return (
    <>
      <div style={{position: 'absolute', left: 50, top: -78, width: 420, height: 90, background: KRAFT, borderRadius: '14px 14px 0 0'}}>
        <div style={{position: 'absolute', left: 18, top: 14, width: 384, height: 58, background: PAPER}} />
        {T_(f, 'label', 40, 34, 18, {weight: 500})}
      </div>
      <div style={{position: 'absolute', left: 70, top: 64, padding: '6px 22px', border: `6px solid ${RED}`, transform: 'rotate(-2deg)'}}>
        <div style={{fontFamily: `'${ELITE}'`, fontSize: 92, color: RED, lineHeight: 1}}>TOP SECRET</div>
      </div>
      <div style={{...printed(46, '#2e2014', SERIF), fontWeight: 900, left: 76, top: 206}}>{F.title}</div>
      {F.en && <div style={{...printed(30, '#3a2a18'), left: 76 + titleW + 30, top: 220}}>{F.en}</div>}
      <div style={{position: 'absolute', left: 70, right: 200, top: 290, borderTop: '3px dashed rgba(58,42,24,0.6)'}} />
      <div style={{position: 'absolute', left: 860, top: 160}}>
        <Stamp f={f} at={E.secret} w={260} h={120} rot={8} seed="sec" fall={12}>
          <div style={{fontFamily: `'${STAMP}'`, fontWeight: 900, fontSize: fitSize(sec, 72, 220), lineHeight: 1, color: RED}}>{sec}</div>
        </Stamp>
      </div>
      <div style={{position: 'absolute', left: 330, top: 410}}>
        <Stamp f={f} at={E.school} w={500} h={150} rot={-3} seed="sch" fall={14}>
          <div style={{fontFamily: `'${STAMP}'`, fontWeight: 900, fontSize: fitSize(END.name, 100, 420), lineHeight: 1, color: RED, letterSpacing: 10}}>{END.name}</div>
        </Stamp>
      </div>
      {T_(f, 'slogan', 74, 74, 516, {weight: 500})}
      {T_(f, 'url', 48, 78, 646, {color: '#2a2016'})}
      {gone > 0 && [0, 1].map((half) => (
        <div key={half} style={{position: 'absolute', left: 1068, width: 84, top: half ? 410 : -6, height: 416, background: '#b3242a', opacity: gone,
          clipPath: half ? 'polygon(0 6%,20% 0,40% 5%,60% 0,80% 6%,100% 1%,100% 100%,0 100%)' : 'polygon(0 0,100% 0,100% 99%,80% 94%,60% 100%,40% 95%,20% 100%,0 94%)',
          transform: `translate(${half ? 20 : -14}px, ${(half ? 1 : -1) * rip * 90}px) rotate(${(half ? 1 : -1) * rip * 9}deg)`, boxShadow: '0 4px 10px rgba(0,0,0,0.35)'}}>
          <div style={{position: 'absolute', left: 10, top: half ? 40 : 100, fontFamily: `'${STAMP}'`, fontWeight: 900, fontSize: 60, color: PAPER}}>{half ? '' : '封'}</div>
          <div style={{position: 'absolute', left: 58, top: half ? 40 : 200, fontFamily: `'${ELITE}'`, fontSize: 30, color: PAPER, transform: 'rotate(90deg)', transformOrigin: '0 0', whiteSpace: 'nowrap'}}>{half ? 'SEALED' : 'CONFIDENTIAL'}</div>
        </div>
      ))}
    </>
  );
};
const EO2 = (x: number) => 1 - Math.pow(1 - x, 3);
