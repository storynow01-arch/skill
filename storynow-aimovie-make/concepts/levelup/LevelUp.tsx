/* 概念 A：闖關遊戲 LEVEL UP —— 整支影片就是一款遊戲（10 秒試看） */
import React from 'react';
import {AbsoluteFill, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadPixel} from '@remotion/google-fonts/PressStart2P';
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';

export const PX = loadPixel('normal', {weights: ['400']}).fontFamily;
export const TC = loadTC('normal', {weights: ['900'], ignoreTooManyRequestsWarning: true}).fontFamily;
export const C = {sky1: '#1A1C2C', sky2: '#3B5DC9', ground: '#5D275D', brick: '#B13E53', top: '#38B764', gold: '#FFCD75', white: '#F4F4F4',
  blue: '#41A6F6', green: '#A7F070', red: '#EF7D57', dark: '#333C57', ink: '#1A1C2C'};
const BEAT = 12; // 150 BPM @30fps
const step = (f: number, n = 2) => Math.floor(f / n) * n;

/* 像素主角（12×14），1=頭髮 2=皮膚 3=衣服 4=褲子 5=鞋 6=眼睛 */
const SPRITE = [
  '...11111....', '..1111111...', '..2222222...', '..2262262...', '..2222222...', '...22222....', '..3333333...',
  '.333333333..', '.2.33333.2..', '...33333....', '...44.44....', '...44.44....', '..55..55....', '............'];
const WALK = [...SPRITE.slice(0, 10), '...44.44....', '..44...44...', '.55.....55..', '............'];
const PAL: Record<string, string> = {'1': '#5A3A2E', '2': '#FFD2A8', '3': C.blue, '4': '#29366F', '5': '#1A1C2C', '6': '#1A1C2C'};
export const Sprite: React.FC<{x: number; y: number; s?: number; walk?: boolean}> = ({x, y, s = 8, walk}) => (
  <div style={{position: 'absolute', left: x, top: y}}>
    {(walk ? WALK : SPRITE).map((row, r) => row.split('').map((ch, c) => ch === '.' ? null : (
      <div key={`${r}-${c}`} style={{position: 'absolute', left: c * s, top: r * s, width: s, height: s, background: PAL[ch]}} />)))}
  </div>
);

export const PixText: React.FC<{children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties; tc?: boolean}> = (
  {children, size, color = C.white, style, tc}) => (
  <div style={{fontFamily: tc ? TC : PX, fontWeight: tc ? 900 : 400, fontSize: size, color, lineHeight: 1.3,
    textShadow: `${Math.max(3, size / 14)}px ${Math.max(3, size / 14)}px 0 ${C.ink}`, ...style}}>{children}</div>
);

export const Stars: React.FC<{f: number; scroll?: number}> = ({f, scroll = 0}) => (
  <>
    {Array.from({length: 70}, (_, i) => {
      const x = (((random(`sx${i}`) * 1920 - scroll * (0.2 + (i % 3) * 0.1)) % 1920) + 1920) % 1920;
      const tw = Math.floor(f / 6 + i) % 7 === 0;
      return <div key={i} style={{position: 'absolute', left: Math.round(x / 4) * 4, top: Math.round(random(`sy${i}`) * 600 / 4) * 4,
        width: i % 9 ? 4 : 8, height: i % 9 ? 4 : 8, background: tw ? C.gold : C.white, opacity: 0.8}} />;
    })}
  </>
);

/* ---------- 世界地圖時間表 ---------- */
const NODES = [{x: 700, name: 'C / Python', zh: '寫程式'}, {x: 1250, name: 'AI VISION', zh: 'AI 辨識'},
  {x: 1800, name: 'ESP32 IoT', zh: '物聯網'}, {x: 2350, name: 'ROBOT ARM', zh: '機械手臂'}];
const MAP0 = 96, WALK_F = 24, PAUSE = 12;
const playerX = (f: number) => {
  let t = f - MAP0, x = 260;
  for (const n of NODES) {
    if (t <= 0) return {x, walking: false, at: -1};
    if (t < WALK_F) return {x: x + (n.x - 40 - x) * (t / WALK_F), walking: true, at: -1};
    t -= WALK_F; x = n.x - 40;
    if (t < PAUSE) return {x, walking: false, at: NODES.indexOf(n)};
    t -= PAUSE;
  }
  return {x, walking: false, at: 3};
};
const arriveAt = (i: number) => MAP0 + (i + 1) * WALK_F + i * PAUSE;

export const LevelUp: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const q = step(f);

  /* ===== 0–96：標題畫面 → PLAYER 1 ===== */
  if (f < MAP0) {
    const pressed = f >= 4 * BEAT;
    const toPlayer = f >= 5 * BEAT + 6;
    const wipe = Math.min(1, Math.max(0, (f - 5 * BEAT) / 8));
    return (
      <AbsoluteFill style={{background: `linear-gradient(${C.sky1}, ${C.sky2})`, overflow: 'hidden'}}>
        <Stars f={f} />
        {!toPlayer ? (
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
            <PixText size={26} color={C.gold} style={{letterSpacing: 6, marginBottom: 30}}>HAICHING IT QUEST</PixText>
            <div style={{display: 'flex'}}>
              {Array.from('你的未來，自己寫').map((ch, i) => {
                const s = spring({frame: q - 2 - i * 2, fps, config: {damping: 8, stiffness: 160}});
                return <PixText key={i} tc size={130} style={{transform: `translateY(${Math.round((1 - s) * -500 / 8) * 8}px)`,
                  color: i < 4 ? C.white : C.gold, textShadow: `10px 10px 0 ${C.ink}, 10px 10px 0 ${C.ink}`}}>{ch}</PixText>;
              })}
            </div>
            <PixText size={34} color={pressed ? C.gold : C.white} style={{marginTop: 60,
              opacity: pressed ? (Math.floor(f / 2) % 2 ? 1 : 0.2) : (Math.floor(f / 15) % 2 ? 1 : 0.2)}}>▶ PRESS START</PixText>
          </AbsoluteFill>
        ) : (
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
            <PixText size={40} color={C.blue}>PLAYER 1</PixText>
            <Sprite x={900} y={step(Math.min(380, 140 + (f - 5 * BEAT - 6) * 30), 8)} s={12} />
            <PixText size={30} tc style={{position: 'absolute', top: 600}}>Lv.1 新手 · 國中生</PixText>
            <PixText size={36} color={C.gold} style={{position: 'absolute', top: 700, opacity: f > 7 * BEAT ? 1 : 0}}>READY?</PixText>
          </AbsoluteFill>
        )}
        {/* 像素溶解轉場 */}
        {wipe > 0 && wipe < 1 && (
          <AbsoluteFill style={{display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)'}}>
            {Array.from({length: 24 * 14}, (_, i) => <div key={i} style={{background: C.ink, opacity: random(`w${i}`) < (wipe < 0.5 ? wipe * 2 : 2 - wipe * 2) ? 1 : 0}} />)}
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    );
  }

  /* ===== 96–244：橫向捲軸世界地圖 ===== */
  const P = playerX(f);
  const lastArrive = NODES.map((_, i) => arriveAt(i)).filter((a) => f >= a).pop() ?? -99;
  const shake = f - lastArrive < 6 ? (random(`sh${f}`) - 0.5) * 16 : 0;
  const cam = Math.max(0, Math.min(2600 - 1920, P.x - 700));
  const cleared = NODES.filter((_, i) => f >= arriveAt(i)).length;
  const xp = cleared / 4;

  if (f < 246) {
    return (
      <AbsoluteFill style={{background: `linear-gradient(${C.sky1}, ${C.sky2})`, overflow: 'hidden'}}>
        <Stars f={f} scroll={cam} />
        <div style={{position: 'absolute', left: 0, top: 0, width: 2600, height: 1080, transform: `translate(${-step(cam, 4) + shake}px, ${shake / 2}px)`}}>
          {/* 遠山（視差） */}
          {Array.from({length: 9}, (_, i) => (
            <div key={i} style={{position: 'absolute', left: i * 340 + cam * 0.5, bottom: 200, width: 0, height: 0,
              borderLeft: '190px solid transparent', borderRight: '190px solid transparent', borderBottom: `${180 + (i % 3) * 60}px solid #29366F`}} />))}
          {/* 地面磚 */}
          {Array.from({length: 42}, (_, i) => (
            <div key={i} style={{position: 'absolute', left: i * 64, top: 860, width: 64, height: 220, background: C.ground, borderTop: `16px solid ${C.top}`,
              boxShadow: `inset -6px -6px 0 #3E1F3E, inset 6px 6px 0 ${C.brick}`}} />))}
          {/* 關卡旗子 */}
          {NODES.map((n, i) => {
            const done = f >= arriveAt(i);
            const rise = done ? Math.min(1, (f - arriveAt(i)) / 8) : 0;
            return (
              <div key={n.name} style={{position: 'absolute', left: n.x, top: 520}}>
                <div style={{position: 'absolute', left: 0, top: 0, width: 10, height: 340, background: C.white}} />
                <div style={{position: 'absolute', left: 10, top: 260 - rise * 240, width: 90, height: 60, background: done ? C.green : C.red,
                  clipPath: 'polygon(0 0, 100% 50%, 0 100%)'}} />
                <div style={{position: 'absolute', left: -110, top: -110, width: 230, padding: '12px 0', textAlign: 'center', background: C.dark,
                  border: `6px solid ${done ? C.green : C.white}`}}>
                  <PixText size={16} color={done ? C.green : C.white}>STAGE {i + 1}</PixText>
                  <PixText size={30} tc>{n.zh}</PixText>
                </div>
                {done && f - arriveAt(i) < 18 && Array.from({length: 10}, (_, k) => {
                  const d = step(f - arriveAt(i)), a = (k / 10) * Math.PI * 2;
                  return <div key={k} style={{position: 'absolute', left: Math.cos(a) * d * 9, top: 200 + Math.sin(a) * d * 9, width: 14, height: 14, background: C.gold}} />;
                })}
              </div>
            );
          })}
          <Sprite x={step(P.x, 4)} y={860 - 14 * 10 + (P.walking && Math.floor(f / 4) % 2 ? -8 : 0)} s={10} walk={P.walking && Math.floor(f / 4) % 2 === 1} />
        </div>
        {/* HUD */}
        <div style={{position: 'absolute', left: 40, top: 36, right: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
            <PixText size={28} color={C.gold}>Lv.{1 + cleared}</PixText>
            <div style={{width: 360, height: 28, border: `5px solid ${C.white}`, background: C.dark}}>
              <div style={{width: `${xp * 100}%`, height: '100%', background: C.green}} />
            </div>
            <PixText size={18}>XP</PixText>
          </div>
          <PixText size={26}>SCORE {String(cleared * 2500).padStart(6, '0')}</PixText>
        </div>
        {/* 技能解鎖橫幅 */}
        {NODES.map((n, i) => {
          const d = f - arriveAt(i);
          if (d < 0 || d > 22) return null;
          const s = spring({frame: d, fps, config: {damping: 10, stiffness: 200}});
          return (
            <div key={n.name} style={{position: 'absolute', left: 560, top: 150, width: 800, padding: '22px 0', textAlign: 'center', background: C.ink,
              border: `8px solid ${C.gold}`, transform: `scale(${s})`}}>
              <PixText size={26} color={C.gold}>★ SKILL UNLOCKED ★</PixText>
              <PixText size={44} style={{marginTop: 10}}>{n.name}</PixText>
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }

  /* ===== 246–300：魔王關 → 名人堂 ===== */
  const d = f - 246;
  const rows = [['國際技能競賽國手', 10], ['全國技能競賽金牌', 12]] as [string, number][];
  return (
    <AbsoluteFill style={{background: C.ink, alignItems: 'center', justifyContent: 'center'}}>
      <Stars f={f} />
      {d < 10 && <AbsoluteFill style={{background: C.white, opacity: 1 - d / 10}} />}
      <div style={{width: 1200, padding: '40px 60px', background: C.dark, border: `10px solid ${C.gold}`, boxShadow: `16px 16px 0 #000`}}>
        <PixText size={44} color={C.gold} style={{textAlign: 'center'}}>HALL OF FAME</PixText>
        <PixText size={26} tc color={C.blue} style={{textAlign: 'center', marginTop: 10}}>BOSS：全國技能競賽　CLEAR!</PixText>
        {rows.map(([label, n], i) => {
          const v = Math.min(n, Math.max(0, Math.floor((d - 8 - i * 6) / 2)));
          return (
            <div key={label} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 34}}>
              <PixText size={40} tc>★ {label}</PixText>
              <PixText size={70} color={C.green}>{String(v).padStart(2, '0')}</PixText>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
