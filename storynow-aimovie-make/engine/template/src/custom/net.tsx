/* 網路教學場景組（封包 / 路由 / IP）。全部用 theme token，任何 style 都能用。
   cues[i] = 第 i 句旁白開始的 frame（相對場景起點），動畫跟著旁白走。 */
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {Theme, dropGlow, ease, easeIO, glowOf, useTheme} from '../theme';
import {Chip, Heading, abs, panelStyle} from '../kit';
import {SceneProps, cue} from '../scenes';

const numSize = (t: Theme, n: number) => (t.f.num.includes('Press') ? n * 0.55 : n);

/* ---------- 小圖示（SVG） ---------- */
const Laptop: React.FC<{x: number; y: number; c: string; t: Theme; label?: string}> = ({x, y, c, t, label}) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-70} y={-60} width={140} height={90} rx={8} fill={t.c.panel} stroke={c} strokeWidth={4} />
    <rect x={-58} y={-48} width={116} height={66} rx={3} fill={`${c}22`} />
    <path d="M -95 38 L 95 38 L 80 52 L -80 52 Z" fill={c} />
    {label && <text y={96} textAnchor="middle" fontFamily={t.f.tc} fontWeight={700} fontSize={30} fill={t.c.fg}>{label}</text>}
  </g>
);
const Server: React.FC<{x: number; y: number; c: string; t: Theme; label?: string}> = ({x, y, c, t, label}) => (
  <g transform={`translate(${x} ${y})`}>
    {[0, 1, 2].map((k) => (
      <g key={k}>
        <rect x={-60} y={-70 + k * 46} width={120} height={38} rx={6} fill={t.c.panel} stroke={c} strokeWidth={4} />
        <circle cx={-38} cy={-51 + k * 46} r={6} fill={t.c.ok} />
        <rect x={-18} y={-54 + k * 46} width={60} height={6} rx={3} fill={`${c}88`} />
      </g>
    ))}
    {label && <text y={110} textAnchor="middle" fontFamily={t.f.tc} fontWeight={700} fontSize={30} fill={t.c.fg}>{label}</text>}
  </g>
);
const Router: React.FC<{x: number; y: number; c: string; t: Theme; hot?: number; label?: string}> = ({x, y, c, t, hot = 0, label}) => (
  <g transform={`translate(${x} ${y})`}>
    <line x1={-28} y1={-26} x2={-40} y2={-60} stroke={c} strokeWidth={4} />
    <line x1={28} y1={-26} x2={40} y2={-60} stroke={c} strokeWidth={4} />
    <rect x={-58} y={-28} width={116} height={56} rx={t.radius ? 14 : 0} fill={t.c.panel} stroke={c} strokeWidth={4}
      style={{filter: hot ? dropGlow(t, c, 18 * hot) : undefined}} />
    {[-30, -10, 10, 30].map((dx) => <circle key={dx} cx={dx} cy={0} r={5} fill={hot > 0.3 ? t.c.accent2 : `${c}99`} />)}
    {label && <text y={62} textAnchor="middle" fontFamily={t.f.tc} fontWeight={700} fontSize={24} fill={t.c.muted}>{label}</text>}
  </g>
);
const Cloud: React.FC<{x: number; y: number; c: string; t: Theme}> = ({x, y, c, t}) => (
  <g transform={`translate(${x} ${y})`} fill={t.c.panel} stroke={c} strokeWidth={4}>
    <path d="M -150 50 Q -200 50 -195 5 Q -190 -40 -140 -40 Q -130 -100 -60 -95 Q -20 -140 40 -110 Q 110 -130 130 -60 Q 200 -60 195 0 Q 195 50 140 50 Z" />
  </g>
);

/** 封包方塊：上方色帶 = 信封（標頭），下方 = 資料 */
const PacketBox: React.FC<{x: number; y: number; n: number; t: Theme; env?: number; w?: number; lost?: boolean; color?: string}> = (
  {x, y, n, t, env = 1, w = 74, lost, color}) => {
  const c = lost ? t.c.bad : color ?? t.c.accent2;
  const h = w * 0.82;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={t.radius ? 8 : 0} fill={`${c}33`} stroke={c} strokeWidth={3} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h * 0.38 * env} rx={t.radius ? 8 : 0} fill={c} />
      {env > 0.6 && <text y={-h / 2 + h * 0.29} textAnchor="middle" fontFamily={t.f.num} fontWeight={t.w.num} fontSize={numSize(t, w * 0.27)} fill={t.c.bg}>#{n}</text>}
      {[0, 1].map((k) => <rect key={k} x={-w / 2 + 10} y={h * 0.02 + k * h * 0.2} width={w - 20 - k * 16} height={5} rx={2} fill={`${c}99`} />)}
      {lost && <path d={`M ${-w / 2} ${-h / 2} L ${w / 2} ${h / 2} M ${w / 2} ${-h / 2} L ${-w / 2} ${h / 2}`} stroke={t.c.bad} strokeWidth={8} />}
    </g>
  );
};

/* =============== 1. 大檔切成封包 =============== */
export const PacketSplit: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const n: number = p.n ?? 8;
  const cSplit = cue(cues, 1, 40), cEnv = cue(cues, 2, 80);
  const appear = ease(f, 4, 16);
  const split = easeIO(f, cSplit, 22);
  const line = easeIO(f, cEnv, 26);
  const env = ease(f, cEnv + 8, 16);
  const bx = 560, by = 600, BW = 420, BH = 520;
  return (
    <AbsoluteFill>
      <Heading zh={p.heading ?? '大檔案不會一次送出去'} en={p.en ?? 'FILE → PACKETS'} accent={accent} />
      <svg width={1920} height={1080} style={abs({left: 0, top: 0})}>
        {/* 原始大檔 */}
        <g opacity={appear * (1 - split * 0.85)} transform={`translate(${bx} ${by}) scale(${0.9 + 0.1 * appear})`}>
          <path d={`M ${-BW / 2} ${-BH / 2} L ${BW / 2 - 70} ${-BH / 2} L ${BW / 2} ${-BH / 2 + 70} L ${BW / 2} ${BH / 2} L ${-BW / 2} ${BH / 2} Z`}
            fill={`${accent}18`} stroke={accent} strokeWidth={5} />
          <text y={-40} textAnchor="middle" fontFamily={t.f.tc} fontWeight={t.w.tc} fontSize={52} fill={t.c.fg}>{p.file ?? '作業.pdf'}</text>
          <text y={40} textAnchor="middle" fontFamily={t.f.num} fontWeight={t.w.num} fontSize={numSize(t, 64)} fill={accent}>{p.size ?? '8 MB'}</text>
        </g>
        {/* 切片：從大檔的格子位置 → 右側一排 */}
        {Array.from({length: n}, (_, i) => {
          const gx = bx - BW / 2 + 105 + (i % 2) * 210, gy = by - BH / 2 + 65 + Math.floor(i / 2) * 130;
          const tx = 1000 + (i % 4) * 190, ty = 470 + Math.floor(i / 4) * 200;
          const li = Easing.inOut(Easing.cubic)(Math.max(0, Math.min(1, (line * 1.4 - i * 0.05))));
          const x = interpolate(li, [0, 1], [gx, tx]), y = interpolate(li, [0, 1], [gy, ty]) - Math.sin(li * Math.PI) * 60;
          if (split <= 0) return null;
          return <g key={i} opacity={split}><PacketBox x={x} y={y} n={i + 1} t={t} env={env} w={interpolate(li, [0, 1], [150, 130])} /></g>;
        })}
        {env > 0 && (
          <g opacity={env}>
            <text x={1285} y={930} textAnchor="middle" fontFamily={t.f.tc} fontWeight={t.w.tc} fontSize={48} fill={t.c.accent2}>一塊資料 ＋ 信封 ＝ 封包</text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

/* =============== 2. 分路走、掉了只補一箱 =============== */
const NODES: Record<string, [number, number]> = {S: [230, 640], A: [640, 450], B: [640, 820], C: [1100, 400], D: [1100, 700], E: [1100, 900], R: [1560, 640]};
const PATHS = [['S', 'A', 'C', 'R'], ['S', 'B', 'D', 'R'], ['S', 'A', 'D', 'R'], ['S', 'B', 'E', 'R']];
const EDGES = [['S', 'A'], ['S', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'D'], ['B', 'E'], ['C', 'R'], ['D', 'R'], ['E', 'R']];

const along = (path: string[], u: number): [number, number] => {
  const segs = path.length - 1;
  const k = Math.min(segs - 1, Math.floor(u * segs)), f = u * segs - k;
  const [x0, y0] = NODES[path[k]], [x1, y1] = NODES[path[k + 1]];
  return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
};

export const PacketRoutes: React.FC<SceneProps> = ({p, cues, dur, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const n = 8, lost = 5;
  const travel = 70;                 // 每個封包從頭到尾的 frame 數
  const c1 = cue(cues, 1, 60), c2 = cue(cues, 2, 110);
  const resendAt = c1 + 26;
  const chips = [[cue(cues, 0, 10) + 30, '路不塞車'], [c1 + 6, '掉一箱只補一箱'], [c2 + 4, '分好幾條路同時走']] as [number, string][];
  const arrived: number[] = [];
  return (
    <AbsoluteFill>
      <Heading zh={p.heading ?? '為什麼要切成小箱子？'} en={p.en ?? 'WHY PACKETS'} accent={accent} />
      <svg width={1920} height={1080} style={abs({left: 0, top: 0})}>
        {EDGES.map(([a, b]) => (
          <line key={a + b} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke={`${accent}66`} strokeWidth={4}
            strokeDasharray="14 10" strokeDashoffset={-f * 1.5} opacity={ease(f, 2, 12)} />
        ))}
        {(['A', 'B', 'C', 'D', 'E'] as const).map((k) => <Router key={k} x={NODES[k][0]} y={NODES[k][1]} c={accent} t={t} hot={0} />)}
        <Laptop x={NODES.S[0]} y={NODES.S[1]} c={accent} t={t} label="傳送端" />
        <Server x={NODES.R[0]} y={NODES.R[1]} c={accent} t={t} label="接收端" />
        {Array.from({length: n}, (_, i) => {
          const id = i + 1;
          const st = 14 + i * 9;
          const path = PATHS[i % PATHS.length];
          let u = (f - st) / travel;
          const isLost = id === lost;
          if (isLost && f >= resendAt) u = -1; // 原本那箱已消失，改畫重送
          if (u <= 0) return null;
          if (isLost && u > 0.55) {
            const [x, y] = along(path, 0.55);
            const a = 1 - ease(f, st + travel * 0.55 + 10, 12);
            return <g key={id} opacity={a}><PacketBox x={x} y={y - 50} n={id} t={t} w={62} lost /></g>;
          }
          if (u >= 1) { arrived.push(id); return null; }
          const [x, y] = along(path, u);
          return <PacketBox key={id} x={x} y={y - 50} n={id} t={t} w={62} />;
        })}
        {/* 重送 #5 */}
        {f >= resendAt && (() => {
          const u = (f - resendAt) / travel;
          if (u >= 1) { arrived.push(lost); return null; }
          const [x, y] = along(PATHS[3], Math.max(0, u));
          return (
            <g>
              <PacketBox x={x} y={y - 50} n={lost} t={t} w={62} color={t.c.ok} />
              <text x={x} y={y - 100} textAnchor="middle" fontFamily={t.f.tc} fontWeight={700} fontSize={26} fill={t.c.ok}>重送</text>
            </g>
          );
        })()}
        {/* 接收端的收件匣 */}
        <g transform="translate(1440 900)">
          <text x={120} y={-48} textAnchor="middle" fontFamily={t.f.tc} fontWeight={700} fontSize={24} fill={t.c.muted}>已收到</text>
          {Array.from({length: n}, (_, i) => {
            const got = arrived.includes(i + 1);
            return <rect key={i} x={i * 32} y={-30} width={26} height={26} rx={t.radius ? 5 : 0} fill={got ? (i + 1 === lost ? t.c.ok : t.c.accent2) : 'none'}
              stroke={`${t.c.muted}aa`} strokeWidth={2} />;
          })}
        </g>
      </svg>
      <div style={abs({left: 140, top: 862, display: 'flex', gap: 24})}>
        {chips.map(([at, s], i) => (
          <div key={s} style={{opacity: ease(f, at, 10), transform: `translateY(${(1 - ease(f, at, 10)) * 20}px)`}}>
            <Chip text={`${i + 1}. ${s}`} color={[t.c.accent, t.c.ok, t.c.accent3][i]} size={30} />
          </div>
        ))}
      </div>
      {dur < 0 && null}
    </AbsoluteFill>
  );
};

/* =============== 3. 封包解剖：資料 / 門牌 / 編號 =============== */
export const PacketAnatomy: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c1 = cue(cues, 1, 40), c2 = cue(cues, 2, 110);
  const seg = [
    {k: 'data', label: '資料', sub: 'PAYLOAD', val: '…檔案的第 3 塊…', col: t.c.accent3, w: 640, at: c1 + 2},
    {k: 'addr', label: '門牌', sub: 'DST IP', val: '142.250.66.78', col: t.c.accent2, w: 420, at: c1 + 20},
    {k: 'num', label: '編號', sub: 'SEQ', val: '#3 / 8', col: t.c.ok, w: 280, at: c1 + 40},
  ];
  const X0 = 960 - (640 + 420 + 280 + 40) / 2;
  const box = ease(f, 4, 14);
  // 第三句：亂序到達 → 依編號排好
  const order = [3, 1, 4, 2];
  const sort = easeIO(f, c2 + 16, 30);
  return (
    <AbsoluteFill>
      <Heading zh={p.heading ?? '每個封包身上帶三樣東西'} en={p.en ?? 'ANATOMY OF A PACKET'} accent={accent} />
      <div style={abs({left: X0 - 30, top: 330, width: 1440, height: 290, ...panelStyle(t, accent), opacity: box})} />
      {(() => {
        let x = X0;
        return seg.map((s) => {
          const a = spring({frame: f - s.at, fps, config: {damping: 13}});
          const el = (
            <div key={s.k} style={abs({left: x, top: 360, width: s.w, height: 230, borderRadius: Math.min(t.radius, 12), border: `4px solid ${s.col}`,
              background: `${s.col}22`, opacity: Math.min(1, a * 1.4), transform: `translateY(${(1 - a) * 50}px)`,
              boxShadow: glowOf(t, s.col, 0.35), display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'})}>
              <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 54, color: s.col}}>{s.label}</div>
              <div style={{fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 12 : 20, letterSpacing: 4, color: t.c.muted}}>{s.sub}</div>
              <div style={{fontFamily: s.k === 'data' ? t.f.tc : t.f.num, fontWeight: 700, fontSize: s.k === 'data' ? 30 : numSize(t, 36), color: t.c.fg, marginTop: 12}}>{s.val}</div>
            </div>
          );
          x += s.w + 20;
          return el;
        });
      })()}
      {/* 亂序 → 排序 */}
      <div style={abs({left: 0, right: 0, top: 700, textAlign: 'center', opacity: ease(f, c2, 12), fontFamily: t.f.tc, fontWeight: 700, fontSize: 32, color: t.c.muted})}>
        到達順序亂了也沒關係 → 依編號拼回去
      </div>
      <svg width={1920} height={1080} style={abs({left: 0, top: 0, opacity: ease(f, c2 + 4, 12)})}>
        {order.map((id, i) => {
          const x0 = 690 + i * 180, x1 = 690 + (id - 1) * 180;
          return <PacketBox key={id} x={x0 + (x1 - x0) * sort} y={860 - Math.sin(sort * Math.PI) * 40 * (i % 2 ? 1 : -1)} n={id} t={t} w={110}
            color={sort > 0.98 ? t.c.ok : t.c.accent2} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/* =============== 4. IP 位址：四段、每段 8 bits =============== */
export const IpBits: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const ip: number[] = p.ip ?? [192, 168, 0, 1];
  const c1 = cue(cues, 1, 30), c2 = cue(cues, 2, 80), c3 = cue(cues, 3, 130);
  const show = ease(f, c1, 14);
  const bits = easeIO(f, c2 + 6, 20);
  const range = ease(f, c3, 16);
  const W = 390;
  const x0 = 960 - (W * 4 + 30 * 3) / 2;
  return (
    <AbsoluteFill>
      <Heading zh={p.heading ?? '門牌 = IP 位址'} en={p.en ?? 'IPv4 ADDRESS'} accent={accent} />
      <div style={abs({left: 140, top: 300, opacity: ease(f, 4, 12), fontFamily: t.f.tc, fontWeight: 700, fontSize: 34, color: t.c.muted})}>IPv4 長這樣：</div>
      {ip.map((o, i) => {
        const x = x0 + i * (W + 30);
        const bin = o.toString(2).padStart(8, '0');
        return (
          <React.Fragment key={i}>
            <div style={abs({left: x, top: 380, width: W, textAlign: 'center', opacity: show, transform: `translateY(${(1 - show) * 30}px)`,
              fontFamily: t.f.num, fontWeight: t.w.num, fontSize: numSize(t, 130), color: t.c.fg, textShadow: glowOf(t, accent, 0.9)})}>{o}</div>
            {i < 3 && <div style={abs({left: x + W + 3, top: 420, opacity: show, fontFamily: t.f.num, fontWeight: t.w.num, fontSize: numSize(t, 110), color: accent})}>.</div>}
            <div style={abs({left: x + 10, top: 560, width: W - 20, height: 4, background: accent, opacity: bits, transform: `scaleX(${bits})`})} />
            <div style={abs({left: x, top: 590, width: W, display: 'flex', justifyContent: 'center', gap: 6})}>
              {bin.split('').map((b, k) => {
                const a = ease(f, c2 + 10 + k * 2 + i * 3, 8);
                return <div key={k} style={{width: 40, height: 58, borderRadius: Math.min(t.radius, 6), border: `2px solid ${b === '1' ? t.c.accent2 : `${t.c.muted}66`}`,
                  background: b === '1' ? `${t.c.accent2}33` : 'transparent', opacity: a, transform: `translateY(${(1 - a) * -20}px)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.f.mono, fontWeight: 600, fontSize: 30,
                  color: b === '1' ? t.c.accent2 : t.c.muted}}>{b}</div>;
              })}
            </div>
            <div style={abs({left: x, top: 666, width: W, textAlign: 'center', opacity: bits, fontFamily: t.f.en, fontWeight: t.w.en,
              fontSize: t.f.en.includes('Press') ? 12 : 22, color: t.c.muted, letterSpacing: 3})}>8 BITS</div>
          </React.Fragment>
        );
      })}
      {/* 0–255 範圍條 */}
      <div style={abs({left: 300, right: 300, top: 790, opacity: range})}>
        <div style={{height: 20, borderRadius: 10, background: `linear-gradient(90deg, ${t.c.accent3}, ${t.c.accent2})`, transform: `scaleX(${range})`, transformOrigin: 'left'}} />
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 14, fontFamily: t.f.num, fontWeight: t.w.num, fontSize: numSize(t, 44), color: t.c.fg}}>
          <span>0<span style={{fontFamily: t.f.mono, fontSize: 24, color: t.c.muted}}>  00000000</span></span>
          <span style={{color: accent}}>2⁸ = 256 種</span>
          <span><span style={{fontFamily: t.f.mono, fontSize: 24, color: t.c.muted}}>11111111  </span>255</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* =============== 5. 私有 IP vs 公有 IP =============== */
export const IpPrivate: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const c1 = cue(cues, 1, 40), c2 = cue(cues, 2, 90);
  const lan = ease(f, 4, 14);
  const wall = ease(f, c1, 14);
  const pk = Math.max(0, Math.min(1, (f - c2 - 4) / 55));
  const rewritten = pk > 0.5;
  const devices = [[260, 470, '192.168.0.12'], [260, 700, '192.168.0.13'], [560, 585, '192.168.0.14']] as [number, number, string][];
  const route: [number, number][] = [[260, 470], [860, 585], [1500, 585]];
  const px = pk < 0.5 ? route[0][0] + (route[1][0] - route[0][0]) * (pk / 0.5) : route[1][0] + (route[2][0] - route[1][0]) * ((pk - 0.5) / 0.5);
  const py = pk < 0.5 ? route[0][1] + (route[1][1] - route[0][1]) * (pk / 0.5) : route[1][1];
  return (
    <AbsoluteFill>
      <Heading zh={p.heading ?? '私有 IP vs 公有 IP'} en={p.en ?? 'PRIVATE · PUBLIC'} accent={accent} />
      <svg width={1920} height={1080} style={abs({left: 0, top: 0})}>
        {/* 校內網路範圍 */}
        <rect x={120} y={340} width={640} height={520} rx={t.radius ? 30 : 0} fill={`${t.c.accent3}${wall > 0 ? '14' : '08'}`}
          stroke={t.c.accent3} strokeWidth={3 + wall * 3} strokeDasharray={wall > 0.5 ? undefined : '16 10'} opacity={lan}
          style={{filter: wall > 0 ? dropGlow(t, t.c.accent3, 14 * wall) : undefined}} />
        <text x={140} y={322} fontFamily={t.f.tc} fontWeight={700} fontSize={30} fill={t.c.accent3} opacity={lan}>家裡 / 學校內部網路（像大樓房號）</text>
        {devices.map(([x, y, ip], i) => (
          <g key={ip} opacity={ease(f, 6 + i * 5, 12)}>
            <Laptop x={x} y={y - 20} c={t.c.accent3} t={t} />
            <text x={x} y={y + 70} textAnchor="middle" fontFamily={t.f.num} fontWeight={t.w.num} fontSize={numSize(t, 28)} fill={t.c.fg}>{ip}</text>
          </g>
        ))}
        <line x1={760} y1={585} x2={1320} y2={585} stroke={`${accent}88`} strokeWidth={4} strokeDasharray="14 10" strokeDashoffset={-f * 1.5} />
        <Router x={860} y={585} c={accent} t={t} hot={rewritten ? 1 - Math.min(1, (pk - 0.5) * 4) : 0} label="路由器 NAT" />
        <Cloud x={1520} y={600} c={t.c.accent2} t={t} />
        <text x={1520} y={600} textAnchor="middle" fontFamily={t.f.tc} fontWeight={t.w.tc} fontSize={40} fill={t.c.fg}>網際網路</text>
        <text x={1520} y={720} textAnchor="middle" fontFamily={t.f.tc} fontWeight={700} fontSize={28} fill={t.c.accent2}>公有 IP：全世界唯一</text>
        {pk > 0 && pk < 1 && (
          <g>
            <PacketBox x={px} y={py - 70} n={1} t={t} w={70} color={rewritten ? t.c.accent2 : t.c.accent3} />
            <text x={px} y={py - 125} textAnchor="middle" fontFamily={t.f.num} fontWeight={t.w.num} fontSize={numSize(t, 26)}
              fill={rewritten ? t.c.accent2 : t.c.accent3}>{rewritten ? '203.0.113.25' : '192.168.0.12'}</text>
          </g>
        )}
      </svg>
      <div style={abs({left: 140, top: 862, display: 'flex', gap: 24})}>
        <div style={{opacity: ease(f, cue(cues, 0, 8) + 10, 10)}}><Chip text="192.168.x.x ＝ 私有" color={t.c.accent3} size={30} /></div>
        <div style={{opacity: ease(f, c2 + 30, 10)}}><Chip text="出門時換成公有 IP" color={t.c.accent2} size={30} /></div>
      </div>
    </AbsoluteFill>
  );
};

export const NET_SCENES = {packetSplit: PacketSplit, packetRoutes: PacketRoutes, packetAnatomy: PacketAnatomy, ipBits: IpBits, ipPrivate: IpPrivate};
