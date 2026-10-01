/* 1-1 概念 1：物流中心模擬器（10 秒試看）—— 等角俯視物流中心 */
import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadEN} from '@remotion/google-fonts/Nunito';

const TC = loadTC('normal', {weights: ['700', '900'], ignoreTooManyRequestsWarning: true}).fontFamily;
const EN = loadEN('normal', {weights: ['800']}).fontFamily;
const BG = '#EAF4F1', ROAD = '#5C6B7A', GRASS = '#BFE3C8', A = '#5B8DEF', B = '#F2994A', BOX = '#E8B96A', INK = '#2D3A4A', RED = '#E5484D', GREEN = '#30A46C';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/* 等角投影：世界座標 (x, y, z) → 螢幕座標 */
const ISO = {ox: 800, oy: 170, s: 72};
const iso = (x: number, y: number, z = 0): [number, number] => [ISO.ox + (x - y) * ISO.s * 0.866, ISO.oy + (x + y) * ISO.s * 0.5 - z * ISO.s];
const pts = (a: [number, number][]) => a.map((p) => p.join(',')).join(' ');
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16); const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
};
/** 等角方塊：三個可見面 */
const IsoBox: React.FC<{x: number; y: number; z?: number; w: number; d: number; h: number; c: string; label?: string; lsize?: number}> = (
  {x, y, z = 0, w, d, h, c, label, lsize = 22}) => {
  const top = [iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)];
  const left = [iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h)];
  const right = [iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h)];
  const [cx, cy] = iso(x + w / 2, y + d / 2, z + h);
  return (
    <g>
      <polygon points={pts(left)} fill={shade(c, 0.78)} stroke={INK} strokeWidth={2} />
      <polygon points={pts(right)} fill={shade(c, 0.62)} stroke={INK} strokeWidth={2} />
      <polygon points={pts(top)} fill={c} stroke={INK} strokeWidth={2} />
      {label && <text x={cx} y={cy + lsize * 0.35} textAnchor="middle" fontFamily={TC} fontWeight={900} fontSize={lsize} fill={INK}>{label}</text>}
    </g>
  );
};
const Truck: React.FC<{x: number; y: number; c: string; cargo?: string}> = ({x, y, c, cargo}) => (
  <g><IsoBox x={x} y={y} w={1.6} d={0.9} h={0.9} c={c} label={cargo} lsize={16} /><IsoBox x={x + 1.6} y={y} w={0.6} d={0.9} h={0.7} c="#dfe6ee" /></g>
);

export const Logistics: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  // 0–80：卡車 A→B 被退件
  const t1 = interpolate(f, [8, 62], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const bounce = f > 62 && f < 80 ? Math.sin(((f - 62) / 18) * Math.PI) * 0.6 : 0;
  // 80–150：出貨手冊＋蓋章
  const manual = spring({frame: f - 84, fps, config: {damping: 13}});
  const stamp = spring({frame: f - 112, fps, config: {damping: 9, stiffness: 220}});
  const stampHit = f >= 112 && f < 118;
  // 150–300：大貨櫃 → 切箱 → 分路送達
  const crateIn = interpolate(f, [150, 175], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const cut = f >= 190;
  const travel = (k: number) => interpolate(f, [205 + k * 8, 270 + k * 4], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const shake = stampHit ? Math.sin(f * 9) * 6 : 0;

  return (
    <AbsoluteFill style={{background: BG}}>
      <svg width={1920} height={1080} style={{transform: `translateY(${shake}px)`}}>
        {/* 地面 */}
        <polygon points={pts([iso(-2, -2), iso(16, -2), iso(16, 12), iso(-2, 12)])} fill={GRASS} />
        {/* 兩條路：上路、下路 */}
        <polygon points={pts([iso(3, 2.2), iso(11, 2.2), iso(11, 3.6), iso(3, 3.6)])} fill={ROAD} />
        <polygon points={pts([iso(3, 6.2), iso(11, 6.2), iso(11, 7.6), iso(3, 7.6)])} fill={ROAD} opacity={f > 180 ? 1 : 0.35} />
        {Array.from({length: 8}, (_, i) => <line key={i} x1={iso(3.4 + i, 2.9)[0]} y1={iso(3.4 + i, 2.9)[1]} x2={iso(3.9 + i, 2.9)[0]} y2={iso(3.9 + i, 2.9)[1]} stroke="#fff" strokeWidth={4} />)}
        {/* 倉庫 A、B */}
        <IsoBox x={0} y={1} w={3} d={7} h={2.2} c={A} label="倉庫 A" lsize={30} />
        <IsoBox x={11} y={1} w={3} d={7} h={2.2} c={B} label="倉庫 B" lsize={30} />
        {/* 卡車被退件 */}
        {f < 150 && <Truck x={3.2 + t1 * 6.2 - bounce} y={2.4} c={BOX} cargo="檔案" />}
        {f > 62 && f < 150 && (
          <g>
            <circle cx={iso(10.6, 2.9, 2.4)[0]} cy={iso(10.6, 2.9, 2.4)[1]} r={36} fill={RED} />
            <text x={iso(10.6, 2.9, 2.4)[0]} y={iso(10.6, 2.9, 2.4)[1] + 14} textAnchor="middle" fontFamily={TC} fontWeight={900} fontSize={40} fill="#fff">✕</text>
            <text x={iso(10.6, 2.9, 3.6)[0]} y={iso(10.6, 2.9, 3.6)[1]} textAnchor="middle" fontFamily={TC} fontWeight={900} fontSize={50} fill={RED}>退件！格式不對</text>
          </g>
        )}
        {/* 大貨櫃 → 切箱 */}
        {f >= 150 && !cut && <IsoBox x={4 - (1 - crateIn) * 3} y={4.2} w={4} d={1.8} h={2.4} c={BOX} label="大檔案" lsize={34} />}
        {cut && Array.from({length: 6}, (_, k) => {
          const road = k % 2 === 0 ? 2.5 : 6.5;
          const p = travel(k);
          const sx = 4 + (k % 3) * 1.3, sy = 4.4 + Math.floor(k / 3) * 0.9;
          const x = interpolate(p, [0, 0.3, 1], [sx, 3.6 + (k % 3) * 0.2, 10.2 - Math.floor(k / 2) * 0.05]);
          const y = interpolate(p, [0, 0.3, 1], [sy, road, road]);
          return <IsoBox key={k} x={x} y={y} w={0.9} d={0.9} h={0.8} c={BOX} label={`#${k + 1}`} lsize={18} />;
        })}
      </svg>
      {/* 出貨手冊 */}
      {f >= 84 && f < 175 && (
        <div style={{position: 'absolute', left: 1180, top: 560, width: 600, padding: '26px 34px', background: '#fff', borderRadius: 18,
          boxShadow: '0 20px 40px rgba(0,0,0,0.18)', transform: `scale(${manual}) rotate(-2deg)`, fontFamily: TC, color: INK}}>
          <div style={{fontWeight: 900, fontSize: 40}}>📘 出貨手冊</div>
          {['① 標籤怎麼寫', '② 章蓋在哪', '③ 從哪個門進'].map((t) => <div key={t} style={{fontWeight: 700, fontSize: 30, marginTop: 8}}>{t}</div>)}
          <div style={{position: 'absolute', right: 30, bottom: 26, width: 210, height: 210, borderRadius: 105, border: `10px solid ${RED}`, color: RED,
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontWeight: 900, fontSize: 40, lineHeight: 1.1,
            transform: `scale(${2.4 - 1.4 * stamp}) rotate(-14deg)`, opacity: f >= 112 ? 1 : 0}}>雙方<br />都同意</div>
        </div>
      )}
      {/* 標題標籤 */}
      <div style={{position: 'absolute', left: 60, top: 50, fontFamily: EN, fontWeight: 800, fontSize: 26, letterSpacing: 6, color: INK, opacity: 0.6}}>PACKET LOGISTICS · 1-1</div>
      {f >= 120 && f < 175 && <div style={{position: 'absolute', left: 80, bottom: 70, fontFamily: TC, fontWeight: 900, fontSize: 70, color: GREEN, background: '#fffd', padding: '6px 30px', borderRadius: 16}}>這本手冊 ＝ 通訊協定</div>}
      {cut && <div style={{position: 'absolute', left: 80, bottom: 70, fontFamily: TC, fontWeight: 900, fontSize: 70, color: INK, background: '#fffd', padding: '6px 30px', borderRadius: 16}}>
        每一小箱 ＝ <span style={{color: B}}>封包</span></div>}
      {f >= 270 && <div style={{position: 'absolute', right: 80, top: 50, fontFamily: TC, fontWeight: 900, fontSize: 44, color: GREEN, background: '#fff', padding: '10px 26px', borderRadius: 14}}>✓ 全部送達</div>}
    </AbsoluteFill>
  );
};
