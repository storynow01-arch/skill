/* 概念 B 完整 60 秒：創客手稿 —— 一鏡到底，一張超大筆記本，11 個區塊 */
import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {BLUE, DrawPath, DrawText, HAND, INK, KAI, PAPER, Pencil, RED, YEL} from './Notebook';
import {S, T, sceneAt} from './shared';

const io = Easing.inOut(Easing.cubic);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const GREEN = '#2E9E5B';

/* 每個場景的攝影機目標：[中心x, 中心y, 縮放, 旋轉] */
const CAM: Record<string, [number, number, number, number]> = {
  S1: [1000, 620, 1.55, -2], S2: [1150, 1000, 1.1, -1], S3: [2850, 760, 1.12, 1], S4: [4350, 760, 1.12, 2], S5: [4350, 1760, 1.12, 1],
  S6: [2900, 1760, 1.12, -1], S7: [1250, 1840, 1.05, -2], S8: [1250, 2720, 1.15, 1], S9: [2900, 2720, 1.15, -1], S10: [4350, 2720, 1.12, 1],
  S11: [2650, 1290, 0.82, 0]};

const camAt = (f: number) => {
  const list = T.B.scenes;
  const {sc, idx} = sceneAt('B', f);
  const lf = f - sc.from;
  const to = CAM[sc.id];
  const from = idx === 0 ? [800, 560, 1.8, -3] : CAM[list[idx - 1].id];
  if (sc.id === 'S11') { // 先拉遠看整本，再推近最後一行
    const mid = [2650, 1650, 0.36, 0];
    const p1 = io(Math.min(1, lf / (sc.dur * 0.35)));
    const p2 = io(Math.max(0, Math.min(1, (lf - sc.dur * 0.45) / (sc.dur * 0.3))));
    const a = from.map((v, i) => v + (mid[i] - v) * p1);
    return a.map((v, i) => v + (to[i] - v) * p2);
  }
  const p = io(Math.min(1, lf / (sc.dur * 0.28)));
  const drift = Math.sin(f / 50) * 6;
  return from.map((v, i) => v + (to[i] - v) * p + (i < 2 ? drift : 0));
};

/* 每個場景的繪製起點（場景開始後 18%） */
const st = (id: string) => { const s = S('B', id); return s.from + Math.round(s.dur * 0.18); };
const du = (id: string, r = 0.45) => Math.round(S('B', id).dur * r);

/* 筆的位置：依目前場景在對應區塊內移動 */
const PEN: Record<string, [number, number, number, number]> = {
  S1: [520, 640, 1500, 640], S2: [560, 1060, 1720, 1060], S3: [2300, 520, 3300, 1000], S4: [3850, 560, 4800, 1000], S5: [3850, 1560, 4800, 1960],
  S6: [2450, 1580, 3300, 2000], S7: [600, 1600, 1900, 2000], S8: [600, 2560, 1900, 2900], S9: [2450, 2560, 3350, 2950], S10: [3850, 2560, 4800, 2950],
  S11: [2000, 1290, 3300, 1290]};

const Caption: React.FC<{f: number}> = ({f}) => {
  const {sc} = sceneAt('B', f);
  const d = f - sc.voiceAt;
  if (d < 0 || d > sc.voiceDur + 15) return null;
  const a = Math.min(1, d / 5, (sc.voiceDur + 15 - d) / 5);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 56, display: 'flex', justifyContent: 'center', opacity: a}}>
      <div style={{fontFamily: KAI, fontWeight: 700, fontSize: 44, color: INK, background: '#FFF4C7ee', padding: '10px 40px', transform: 'rotate(-0.8deg)',
        boxShadow: '0 6px 14px rgba(0,0,0,0.25)', borderLeft: '10px dashed #F2C94C', borderRight: '10px dashed #F2C94C'}}>{sc.text}</div>
    </div>
  );
};

export const NotebookFull: React.FC = () => {
  const f = useCurrentFrame();
  const {sc} = sceneAt('B', f);
  const [cx, cy, z, rot] = camAt(f);
  const pp = PEN[sc.id];
  const ps = st(sc.id), pe = ps + du(sc.id, 0.55);
  const pen = f >= ps && f <= pe ? (() => {const t = (f - ps) / (pe - ps); return [pp[0] + (pp[2] - pp[0]) * t, pp[1] + (pp[3] - pp[1]) * t + Math.sin(f * 1.7) * 10 + Math.sin(f * 0.43) * 30];})() : null;
  const D = (id: string) => ({start: st(id), f});
  const slide = (id: string, k = 0) => interpolate(f, [st(id) + k, st(id) + k + 14], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.4))});
  const ledOn = f > st('S5') + du('S5', 0.5);
  const armT = interpolate(f, [st('S6') + du('S6', 0.35), st('S6') + du('S6', 0.85)], [0, 1], {...clamp, easing: io});
  const fade = Math.max(0, 1 - f / 8, (f - (T.B.totalFrames - 22)) / 22);

  return (
    <AbsoluteFill style={{background: '#8A6A4A', overflow: 'hidden'}}>
      <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(90deg, #8A6A4A 0 38px, #7E5F41 38px 40px, #94735A 40px 90px)'}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: 5400, height: 3400, transformOrigin: '0 0',
        transform: `translate(960px, 540px) rotate(${rot}deg) scale(${z}) translate(${-cx}px, ${-cy}px)`}}>
        <div style={{position: 'absolute', left: 200, top: 120, width: 5000, height: 3100, background: PAPER, borderRadius: 24, boxShadow: '0 40px 80px rgba(0,0,0,0.35)',
          backgroundImage: 'linear-gradient(#cfdcf0 1.5px, transparent 1.5px), linear-gradient(90deg, #cfdcf0 1.5px, transparent 1.5px)', backgroundSize: '50px 50px'}} />
        {Array.from({length: 32}, (_, i) => <div key={i} style={{position: 'absolute', left: 168, top: 170 + i * 94, width: 60, height: 30, borderRadius: 15, border: '7px solid #9AA3AE'}} />)}

        <svg width={5400} height={3400} style={{position: 'absolute', left: 0, top: 0}}>
          {/* S1 第一行 */}
          <DrawText x={500} y={680} text={'print("Hello, 未來的學弟妹")'} size={96} font={HAND} color={BLUE} {...D('S1')} dur={du('S1', 0.55)} />
          <DrawPath d="M 500 720 Q 1000 760 1560 710" start={st('S1') + du('S1', 0.55)} dur={12} f={f} color={RED} w={7} len={1200} />
          {/* S2 標題 */}
          <DrawText x={560} y={1090} text="你的未來，自己寫" size={150} font={KAI} color={INK} {...D('S2')} dur={du('S2', 0.5)} />
          <DrawPath d="M 560 1130 Q 1150 1170 1740 1120" start={st('S2') + du('S2', 0.5)} dur={12} f={f} color={RED} w={9} len={1300} />
          <DrawText x={600} y={1210} text="海青工商 資訊科" size={60} font={KAI} color={BLUE} start={st('S2') + du('S2', 0.55)} dur={14} f={f} />

          {/* S3 兩個程式視窗 → 執行結果 */}
          <DrawPath d="M 2300 460 h 520 v 300 h -520 Z M 2300 500 h 520" {...D('S3')} dur={14} w={5} len={1800} />
          <DrawText x={2330} y={490} text="main.c" size={30} font={HAND} color={INK} {...D('S3')} dur={10} />
          {['int main() {', '  printf("Hi");', '}'].map((l, i) => <DrawText key={l} x={2330} y={560 + i * 60} text={l} size={44} font={HAND} color={BLUE} start={st('S3') + 10 + i * 6} dur={14} f={f} />)}
          <DrawPath d="M 2300 840 h 520 v 260 h -520 Z M 2300 880 h 520" start={st('S3') + 16} dur={14} f={f} w={5} len={1800} />
          <DrawText x={2330} y={870} text="ai.py" size={30} font={HAND} color={INK} start={st('S3') + 16} dur={10} f={f} />
          {['model = AI()', 'model.learn(data)'].map((l, i) => <DrawText key={l} x={2330} y={950 + i * 60} text={l} size={44} font={HAND} color={GREEN} start={st('S3') + 26 + i * 6} dur={14} f={f} />)}
          <DrawPath d="M 2860 760 C 2960 760, 2980 700, 3060 700" start={st('S3') + 40} dur={10} f={f} color={RED} w={6} len={300} />
          <DrawPath d="M 3080 620 h 260 v 150 h -260 Z" start={st('S3') + 46} dur={10} f={f} color={RED} w={5} len={900} />
          <DrawText x={3110} y={715} text="Hi!" size={60} font={HAND} color={RED} start={st('S3') + 50} dur={10} f={f} />

          {/* S4 攝影機＋塗鴉，辨識框 */}
          <DrawPath d="M 3860 640 h 180 v 120 h -180 Z M 4040 670 l 80 -40 v 140 l -80 -40" {...D('S4')} dur={14} w={6} len={1200} />
          <DrawPath d="M 4380 560 a 40 40 0 1 0 0.1 0 M 4380 640 v 160 M 4310 690 h 140 M 4380 800 l -60 110 M 4380 800 l 60 110" start={st('S4') + 8} dur={16} f={f} w={6} len={1200} />
          <DrawPath d="M 4600 860 h 150 v 90 h -150 Z M 4620 950 a 18 18 0 1 0 0.1 0 M 4730 950 a 18 18 0 1 0 0.1 0" start={st('S4') + 14} dur={14} f={f} w={6} len={900} />
          <DrawPath d="M 4270 520 h 230 v 420 h -230 Z" start={st('S4') + du('S4', 0.4)} dur={10} f={f} color={GREEN} w={7} len={1400} />
          <DrawText x={4270} y={505} text="person 97%" size={40} font={HAND} color={GREEN} start={st('S4') + du('S4', 0.4) + 4} dur={10} f={f} />
          <DrawPath d="M 4580 830 h 190 v 150 h -190 Z" start={st('S4') + du('S4', 0.55)} dur={10} f={f} color={BLUE} w={7} len={800} />
          <DrawText x={4580} y={815} text="car 91%" size={40} font={HAND} color={BLUE} start={st('S4') + du('S4', 0.55) + 4} dur={10} f={f} />

          {/* S5 ESP32 */}
          <DrawPath d="M 3880 1600 h 320 v 230 h -320 Z" {...D('S5')} dur={14} w={6} len={1200} />
          <DrawText x={3925} y={1740} text="ESP32" size={76} font={HAND} color={INK} start={st('S5') + 6} dur={14} f={f} />
          {[[4500, 1560], [4620, 1720], [4500, 1900]].map(([x, y], i) => (
            <g key={i}>
              <DrawPath d={`M 4200 ${1650 + i * 70} C 4320 ${1650 + i * 70}, ${x - 120} ${y}, ${x - 36} ${y}`} start={st('S5') + 14 + i * 5} dur={12} f={f} w={4} len={600} />
              <circle cx={x} cy={y} r={32} fill={ledOn && Math.floor((f + i * 6) / 9) % 2 === 0 ? YEL : 'none'} stroke={INK} strokeWidth={5}
                opacity={f > st('S5') + 20 + i * 5 ? 1 : 0} style={{filter: ledOn ? `drop-shadow(0 0 16px ${YEL})` : undefined}} />
            </g>
          ))}
          <g transform={`translate(4760 1880) rotate(${ledOn ? (f - st('S5')) * 14 : 0})`} opacity={f > st('S5') + 30 ? 1 : 0}>
            <path d="M -60 0 L 60 0 M 0 -60 L 0 60" stroke={INK} strokeWidth={10} strokeLinecap="round" />
            <circle r={14} fill={PAPER} stroke={INK} strokeWidth={5} />
          </g>
          <DrawText x={4000} y={2060} text="會動！會亮！" size={60} font={KAI} color={RED} start={st('S5') + du('S5', 0.6)} dur={14} f={f} />

          {/* S6 機械手臂夾方塊 */}
          <DrawPath d="M 2560 1980 h 300" {...D('S6')} dur={8} w={6} len={400} />
          <g transform="translate(2710 1960)" opacity={f > st('S6') ? 1 : 0}>
            <g transform={`rotate(${-20 - armT * 60})`}>
              <DrawPath d="M 0 0 L 0 -230" start={st('S6') + 4} dur={8} f={f} w={10} len={300} />
              <g transform={`translate(0 -230) rotate(${110 - armT * 30})`}>
                <DrawPath d="M 0 0 L 200 0 M 200 0 l 26 -26 M 200 0 l 26 26" start={st('S6') + 10} dur={10} f={f} w={9} len={400} />
                <circle r={16} fill={PAPER} stroke={INK} strokeWidth={5} />
                {armT > 0.15 && <rect x={214} y={-24} width={48} height={48} fill={RED} stroke={INK} strokeWidth={5} />}
              </g>
              <circle r={18} fill={PAPER} stroke={INK} strokeWidth={5} />
            </g>
          </g>
          {armT <= 0.15 && <rect x={2950} y={1930} width={48} height={48} fill={RED} stroke={INK} strokeWidth={5} opacity={f > st('S6') + 14 ? 1 : 0} />}
          <DrawText x={3060} y={1640} text="arm.move(x, y)" size={48} font={HAND} color={BLUE} start={st('S6') + 16} dur={16} f={f} />

          {/* S7 世界地圖草圖＋手寫 10 */}
          <DrawPath d="M 620 1620 C 700 1520, 900 1540, 960 1640 C 1020 1720, 900 1820, 780 1800 C 660 1780, 560 1720, 620 1620 Z
                       M 1100 1560 C 1240 1480, 1440 1520, 1500 1620 C 1560 1720, 1400 1800, 1260 1760 C 1140 1720, 1020 1640, 1100 1560 Z
                       M 1600 1680 C 1680 1620, 1820 1660, 1820 1760 C 1820 1840, 1700 1860, 1640 1800 Z" {...D('S7')} dur={22} w={5} len={4200} />
          <DrawText x={760} y={2160} text="10" size={250} font={HAND} color={RED} start={st('S7') + du('S7', 0.45)} dur={18} f={f} />
          <DrawPath d="M 940 1990 C 1140 1990, 1180 2190, 960 2210 C 720 2230, 660 2050, 820 1990 C 880 1970, 960 1975, 1020 2005"
            start={st('S7') + du('S7', 0.45) + 16} dur={12} f={f} color={RED} w={10} len={1300} />
          <DrawText x={1100} y={2150} text="位國際國手" size={84} font={KAI} color={INK} start={st('S7') + du('S7', 0.5) + 16} dur={16} f={f} />

          {/* S8 12 個小獎牌打勾 */}
          {Array.from({length: 12}, (_, i) => {
            const x = 1060 + (i % 6) * 130, y = 2620 + Math.floor(i / 6) * 150, at = st('S8') + 10 + i * 4;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={44} fill={f > at + 6 ? YEL : 'none'} stroke={INK} strokeWidth={5} opacity={f > at ? 1 : 0} />
                <DrawPath d={`M ${x - 18} ${y} l 12 14 l 26 -30`} start={at + 6} dur={6} f={f} color={GREEN} w={7} len={80} />
              </g>
            );
          })}

          {/* S9 頒獎台 */}
          <DrawPath d="M 2500 2900 h 300 v -150 h 300 v -230 h 300 v 380 Z M 2800 2750 v 150 M 3400 2900 v -110 h 260 v 110" {...D('S9')} dur={20} w={6} len={3200} />
          <DrawText x={2620} y={2860} text="2" size={90} font={HAND} color={INK} start={st('S9') + 16} dur={8} f={f} />
          <DrawText x={2920} y={2740} text="1" size={90} font={HAND} color={INK} start={st('S9') + 16} dur={8} f={f} />
          <DrawText x={3500} y={2880} text="3" size={80} font={HAND} color={INK} start={st('S9') + 16} dur={8} f={f} />
          <DrawText x={2480} y={3060} text="第 56 屆分區賽　雙職類全包！" size={60} font={KAI} color={RED} start={st('S9') + du('S9', 0.6)} dur={14} f={f} />

          {/* S10 地圖釘＋26 */}
          <DrawPath d="M 3900 2560 C 4100 2500, 4400 2600, 4700 2540 M 3900 2940 C 4200 2880, 4500 2980, 4800 2920" {...D('S10')} dur={14} w={4} len={2000} />
          <DrawText x={3960} y={3080} text="26 人次 國立大專" size={80} font={KAI} color={RED} start={st('S10') + du('S10', 0.55)} dur={16} f={f} />

          {/* S11 最後一行（寫在中央空白帶） */}
          <DrawText x={2000} y={1340} text="你的未來，自己寫" size={170} font={KAI} color={INK} start={S('B', 'S11').from + Math.round(S('B', 'S11').dur * 0.5)} dur={30} f={f} />
          <DrawPath d="M 2000 1380 Q 2650 1420 3320 1370" start={S('B', 'S11').from + Math.round(S('B', 'S11').dur * 0.5) + 30} dur={10} f={f} color={BLUE} w={10} len={1500} />
          {pen && <Pencil x={pen[0]} y={pen[1]} on />}
        </svg>

        {/* S7 拍立得（10 張） */}
        {Array.from({length: 10}, (_, i) => {
          const a = slide('S7', 6 + i * 3);
          return <div key={i} style={{position: 'absolute', left: 560 + (i % 5) * 270, top: 1420 + Math.floor(i / 5) * 0 - 20 + (i % 2) * 30 - (1 - a) * 400,
            width: 120, height: 140, background: '#fff', padding: '10px 10px 30px', boxShadow: '0 6px 12px rgba(0,0,0,0.25)', opacity: a > 0 ? 1 : 0,
            transform: `rotate(${(random(`pr${i}`) - 0.5) * 22}deg) scale(${0.6 + 0.4 * a})`}}>
            <div style={{width: '100%', height: '100%', background: `linear-gradient(160deg, ${['#2b4c7e', '#3a7d5c', '#7e2b4c'][i % 3]}, #f2b233)`}} />
          </div>;
        })}
        {/* S8 便利貼 */}
        <div style={{position: 'absolute', left: 520, top: 2560 + (1 - slide('S8')) * 300, width: 400, height: 260, background: YEL, padding: 30, transform: `rotate(-4deg)`,
          boxShadow: '0 10px 18px rgba(0,0,0,0.2)', opacity: slide('S8') > 0 ? 1 : 0, fontFamily: KAI, fontWeight: 700, fontSize: 64, color: INK, lineHeight: 1.25}}>12 面<br />全國金牌</div>
        {/* S9 金銀銅貼紙 */}
        {[['金', '#F5C542', 2900, 2420], ['銀', '#C9D4E0', 2600, 2640], ['銅', '#D98B4E', 3480, 2700]].map(([l, col, x, y], i) => {
          const a = slide('S9', 22 + i * 12);
          return <div key={l as string} style={{position: 'absolute', left: (x as number) + 30, top: y as number, width: 150, height: 150, borderRadius: 75, background: col as string,
            border: '8px solid #fff', boxShadow: '0 8px 16px rgba(0,0,0,0.3)', transform: `scale(${a}) rotate(${-10 + i * 10}deg)`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontFamily: KAI, fontWeight: 700, fontSize: 70, color: INK}}>{l}</div>;
        })}
        {/* S10 三張校名便利貼＋圖釘 */}
        {['臺科大', '雲科大', '高科大'].map((u, i) => {
          const a = slide('S10', 10 + i * 10);
          return (
            <div key={u} style={{position: 'absolute', left: 3880 + i * 320, top: 2600 - (1 - a) * 200, width: 280, height: 200, background: ['#BDE0FE', '#FFC8DD', '#CDEAC0'][i],
              transform: `rotate(${(i - 1) * 5}deg)`, boxShadow: '0 8px 14px rgba(0,0,0,0.2)', opacity: a > 0 ? 1 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: KAI, fontWeight: 700, fontSize: 64, color: INK}}>
              <div style={{position: 'absolute', top: -18, left: 122, width: 36, height: 36, borderRadius: 18, background: RED, boxShadow: '0 4px 6px rgba(0,0,0,0.3)'}} />{u}
            </div>
          );
        })}
      </div>
      <Caption f={f} />
      <AbsoluteFill style={{background: '#000', opacity: fade}} />
    </AbsoluteFill>
  );
};
