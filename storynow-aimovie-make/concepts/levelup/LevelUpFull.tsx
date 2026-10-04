/* 概念 A 完整 60 秒：闖關遊戲 LEVEL UP */
import React from 'react';
import {AbsoluteFill, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, PixText, Sprite, Stars, TC} from './LevelUp';
import {S, sceneAt} from './shared';

const step = (f: number, n = 2) => Math.floor(f / n) * n;
const q8 = (v: number) => Math.round(v / 8) * 8;
const BG = `linear-gradient(${C.sky1}, ${C.sky2})`;

/* ---------- RPG 對話框字幕 ---------- */
const DialogBox: React.FC<{f: number}> = ({f}) => {
  const {sc} = sceneAt('A', f);
  const d = f - sc.voiceAt;
  if (d < 0 || d > sc.voiceDur + 20) return null;
  const chars = Array.from(sc.text);
  const shown = chars.slice(0, Math.ceil(chars.length * Math.min(1, d / Math.max(1, sc.voiceDur * 0.85)))).join('');
  return (
    <div style={{position: 'absolute', left: 220, right: 220, bottom: 40, height: 128, background: C.ink, border: `8px solid ${C.white}`,
      boxShadow: `10px 10px 0 #000`, display: 'flex', alignItems: 'center', padding: '0 40px', gap: 30}}>
      <div style={{position: 'absolute', left: 30, top: -40, background: C.blue, border: `6px solid ${C.white}`, padding: '4px 18px'}}>
        <PixText size={24} tc>學姐</PixText>
      </div>
      <PixText size={40} tc>{shown}{Math.floor(f / 8) % 2 && shown.length === chars.length ? ' ▼' : ''}</PixText>
    </div>
  );
};

const HUD: React.FC<{lv: number; xp: number; score: number}> = ({lv, xp, score}) => (
  <div style={{position: 'absolute', left: 40, top: 36, right: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
      <PixText size={28} color={C.gold}>Lv.{lv}</PixText>
      <div style={{width: 360, height: 28, border: `5px solid ${C.white}`, background: C.dark}}>
        <div style={{width: `${xp * 100}%`, height: '100%', background: C.green}} />
      </div>
      <PixText size={18}>XP</PixText>
    </div>
    <PixText size={26}>SCORE {String(score).padStart(6, '0')}</PixText>
  </div>
);

const Banner: React.FC<{d: number; title: string; sub: string}> = ({d, title, sub}) => {
  const {fps} = useVideoConfig();
  if (d < 0 || d > 40) return null;
  const s = spring({frame: d, fps, config: {damping: 10, stiffness: 200}});
  return (
    <div style={{position: 'absolute', left: 560, top: 140, width: 800, padding: '20px 0', textAlign: 'center', background: C.ink,
      border: `8px solid ${C.gold}`, transform: `scale(${s})`}}>
      <PixText size={24} color={C.gold}>★ {title} ★</PixText>
      <PixText size={42} style={{marginTop: 10}}>{sub}</PixText>
    </div>
  );
};

const Burst: React.FC<{x: number; y: number; d: number; n?: number; color?: string}> = ({x, y, d, n = 12, color = C.gold}) => d < 0 || d > 22 ? null : (
  <>{Array.from({length: n}, (_, k) => {
    const a = (k / n) * Math.PI * 2, r = step(d) * 10;
    return <div key={k} style={{position: 'absolute', left: q8(x + Math.cos(a) * r), top: q8(y + Math.sin(a) * r), width: 16, height: 16, background: color}} />;
  })}</>
);

/* ---------- 世界地圖（S3–S6 一條連續的捲軸） ---------- */
const STAGES = [{id: 'S3', x: 700, name: 'C / PYTHON', zh: '寫程式'}, {id: 'S4', x: 1500, name: 'AI VISION', zh: 'AI 辨識'},
  {id: 'S5', x: 2300, name: 'ESP32 IoT', zh: '物聯網'}, {id: 'S6', x: 3100, name: 'ROBOT ARM', zh: '機械手臂'}];
const WORLD_W = 3800, GROUND = 860;

const WorldMap: React.FC<{f: number}> = ({f}) => {
  const k = STAGES.findIndex((st) => {const s = S('A', st.id); return f >= s.from && f < s.from + s.dur;});
  const st = STAGES[k], sc = S('A', st.id);
  const lf = f - sc.from, walkF = Math.round(sc.dur * 0.3), eventAt = walkF + 4;
  const prevX = k === 0 ? 260 : STAGES[k - 1].x + 60;
  const px = lf < walkF ? prevX + (st.x - 60 - prevX) * (lf / walkF) : st.x - 60;
  const walking = lf < walkF;
  const jump = k === 0 && lf >= walkF && lf < walkF + 14 ? Math.sin(((lf - walkF) / 14) * Math.PI) * 120 : 0;
  const cam = Math.max(0, Math.min(WORLD_W - 1920, px - 700));
  const d = lf - eventAt;
  const shake = d >= 0 && d < 6 ? (random(`sh${f}`) - 0.5) * 16 : 0;
  const cleared = k + (d >= 0 ? 1 : 0);

  return (
    <AbsoluteFill style={{background: BG, overflow: 'hidden'}}>
      <Stars f={f} scroll={cam} />
      <div style={{position: 'absolute', left: 0, top: 0, width: WORLD_W, height: 1080, transform: `translate(${-step(cam, 4) + shake}px, ${shake / 2}px)`}}>
        {Array.from({length: 12}, (_, i) => (
          <div key={i} style={{position: 'absolute', left: i * 340 + cam * 0.5, bottom: 200, width: 0, height: 0,
            borderLeft: '190px solid transparent', borderRight: '190px solid transparent', borderBottom: `${180 + (i % 3) * 60}px solid #29366F`}} />))}
        {Array.from({length: 62}, (_, i) => (
          <div key={i} style={{position: 'absolute', left: i * 64, top: GROUND, width: 64, height: 220, background: C.ground, borderTop: `16px solid ${C.top}`,
            boxShadow: `inset -6px -6px 0 #3E1F3E, inset 6px 6px 0 ${C.brick}`}} />))}
        {STAGES.map((s2, i) => {
          const done = i < cleared;
          return (
            <div key={s2.id} style={{position: 'absolute', left: s2.x + 140, top: 520}}>
              <div style={{position: 'absolute', left: 0, top: 0, width: 10, height: 340, background: C.white}} />
              <div style={{position: 'absolute', left: 10, top: done ? 20 : 260, width: 90, height: 60, background: done ? C.green : C.red, clipPath: 'polygon(0 0,100% 50%,0 100%)'}} />
              <div style={{position: 'absolute', left: -110, top: -110, width: 230, padding: '10px 0', textAlign: 'center', background: C.dark, border: `6px solid ${done ? C.green : C.white}`}}>
                <PixText size={16} color={done ? C.green : C.white}>STAGE {i + 1}</PixText>
                <PixText size={30} tc>{s2.zh}</PixText>
              </div>
            </div>
          );
        })}

        {/* STAGE 1：? 磚塊噴出程式碼 */}
        {k === 0 && (
          <>
            <div style={{position: 'absolute', left: 620, top: 560 - (d >= 0 && d < 6 ? 16 : 0), width: 96, height: 96, background: d >= 0 ? '#8B6B4A' : C.gold,
              border: `8px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <PixText size={44} color={C.ink}>{d >= 0 ? '' : '?'}</PixText>
            </div>
            {['int main()', 'print("hi")', '{ }', 'for i in range', '#include'].map((s2, i) => {
              const dd = d - i * 4;
              if (dd < 0) return null;
              return <PixText key={s2} size={22} color={i % 2 ? C.green : C.gold} style={{position: 'absolute', left: 560 + (i - 2) * 110, top: q8(540 - dd * 9 + dd * dd * 0.12),
                opacity: Math.max(0, 1 - dd / 60)}}>{s2}</PixText>;
            })}
          </>
        )}
        {/* STAGE 2：辨識框 */}
        {k === 1 && (() => {
          const slimeX = 1580, caught = d > 40;
          return (
            <>
              {!caught && <div style={{position: 'absolute', left: slimeX + Math.sin(f / 5) * 20, top: GROUND - 70, width: 110, height: 70, background: C.green,
                borderRadius: '50% 50% 8px 8px', border: `6px solid ${C.ink}`}}>
                <div style={{position: 'absolute', left: 26, top: 18, width: 12, height: 16, background: C.ink}} />
                <div style={{position: 'absolute', left: 64, top: 18, width: 12, height: 16, background: C.ink}} />
              </div>}
              {caught && <div style={{position: 'absolute', left: slimeX + 30, top: GROUND - 80 - Math.min(60, (d - 40) * 6), width: 48, height: 48, background: C.gold,
                border: `6px solid ${C.ink}`}} />}
              {d >= 0 && !caught && (
                <div style={{position: 'absolute', left: slimeX - 30 + Math.sin(f / 5) * 20, top: GROUND - 120, width: 170, height: 130, border: `6px solid ${C.green}`}}>
                  <div style={{position: 'absolute', left: -6, top: -44, background: C.green, padding: '4px 10px'}}><PixText size={18} color={C.ink}>enemy 97%</PixText></div>
                </div>
              )}
              {d >= 10 && !caught && (
                <div style={{position: 'absolute', left: 1900, top: 560, width: 120, height: 120, border: `6px solid ${C.blue}`}}>
                  <div style={{position: 'absolute', left: 18, top: 18, width: 72, height: 72, background: C.gold, border: `6px solid ${C.ink}`}} />
                  <div style={{position: 'absolute', left: -6, top: -44, background: C.blue, padding: '4px 10px'}}><PixText size={18} color={C.ink}>coin 91%</PixText></div>
                </div>
              )}
            </>
          );
        })()}
        {/* STAGE 3：電流點亮路燈、風扇 */}
        {k === 2 && (
          <>
            <div style={{position: 'absolute', left: 2300, top: GROUND - 12, width: 760, height: 8, background: '#555'}} />
            {d >= 0 && <div style={{position: 'absolute', left: q8(2300 + Math.min(760, d * 20)), top: GROUND - 20, width: 24, height: 24, background: C.gold, boxShadow: `0 0 20px ${C.gold}`}} />}
            {[0, 1, 2, 3].map((i) => {
              const on = d * 20 > 120 + i * 190;
              return (
                <div key={i} style={{position: 'absolute', left: 2420 + i * 190, top: GROUND - 220}}>
                  <div style={{position: 'absolute', left: 20, top: 40, width: 12, height: 180, background: C.white}} />
                  <div style={{width: 52, height: 44, background: on ? C.gold : '#444', border: `6px solid ${C.ink}`, boxShadow: on ? `0 0 40px ${C.gold}` : 'none'}} />
                </div>
              );
            })}
            <div style={{position: 'absolute', left: 3000, top: GROUND - 200, width: 120, height: 120, transform: `rotate(${d > 30 ? (d - 30) * 30 : 0}deg)`}}>
              <div style={{position: 'absolute', left: 52, top: 0, width: 16, height: 120, background: C.blue}} />
              <div style={{position: 'absolute', left: 0, top: 52, width: 120, height: 16, background: C.blue}} />
            </div>
          </>
        )}
        {/* STAGE 4：巨大像素機械手臂夾方塊 */}
        {k === 3 && (() => {
          const t = Math.max(0, Math.min(1, d / 50));
          const hold = d > 12 && d < 46;
          const ang1 = -60 + (t < 0.3 ? 0 : t < 0.7 ? (t - 0.3) / 0.4 * 70 : 70);
          const bx = hold || d >= 46 ? 3150 + Math.max(0, Math.min(1, (d - 12) / 34)) * 140 : 3150;
          const by = hold ? GROUND - 180 - Math.sin(Math.max(0, Math.min(1, (d - 12) / 34)) * Math.PI) * 120 : d >= 46 ? 520 - 64 : GROUND - 64;
          return (
            <>
              <div style={{position: 'absolute', left: 3360, top: 600, width: 200, height: 24, background: C.white}} />
              <div style={{position: 'absolute', left: 3240, top: GROUND - 60, width: 120, height: 60, background: C.dark, border: `6px solid ${C.ink}`}} />
              <div style={{position: 'absolute', left: 3296, top: GROUND - 60, width: 0, height: 0, transform: `rotate(${ang1}deg)`, transformOrigin: '0 0'}}>
                <div style={{position: 'absolute', left: -20, top: -260, width: 40, height: 260, background: C.blue, border: `6px solid ${C.ink}`}} />
              </div>
              <div style={{position: 'absolute', left: q8(bx), top: q8(by), width: 64, height: 64, background: C.red, border: `6px solid ${C.ink}`}} />
              {d >= 0 && d < 60 && <div style={{position: 'absolute', left: 3030, top: 470, background: C.white, padding: '8px 16px', border: `5px solid ${C.ink}`}}>
                <PixText size={20} color={C.ink}>arm.move(x, y)</PixText></div>}
            </>
          );
        })()}
        <Sprite x={step(px, 4)} y={GROUND - 140 - jump + (walking && Math.floor(f / 4) % 2 ? -8 : 0)} s={10} walk={walking && Math.floor(f / 4) % 2 === 1} />
        <Burst x={st.x + 140} y={600} d={d} />
      </div>
      <HUD lv={1 + cleared} xp={cleared / 4} score={cleared * 2500} />
      <Banner d={d} title="SKILL UNLOCKED" sub={st.name} />
    </AbsoluteFill>
  );
};

export const LevelUpFull: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {sc, lf} = sceneAt('A', f);
  const q = step(lf);
  let body: React.ReactNode = null;

  if (sc.id === 'S1') {
    const enter = Math.round(sc.dur * 0.62);
    const line = 'print("Hello, 未來的學弟妹")';
    const shown = Array.from(line).slice(0, Math.max(0, Math.floor((lf - 34) / 2.2))).join('');
    body = (
      <AbsoluteFill style={{background: '#000', padding: 140}}>
        {['HAICHING-IT SYSTEM v2026', 'LOADING GAME .......... OK', 'INSERT COIN'].map((s2, i) => lf > i * 8 ? (
          <PixText key={s2} size={26} color={i === 2 ? C.gold : C.green} style={{marginBottom: 20}}>{s2}</PixText>) : null)}
        <div style={{marginTop: 60, display: 'flex', alignItems: 'center'}}>
          <PixText size={30} color={C.green}>&gt;&nbsp;</PixText>
          <PixText size={50} tc color={C.white}>{shown}</PixText>
          <div style={{width: 26, height: 50, background: C.white, opacity: Math.floor(lf / 8) % 2 ? 1 : 0, marginLeft: 6}} />
        </div>
        {lf >= enter && <PixText size={30} color={C.gold} style={{marginTop: 40}}>[ENTER] ▶ COIN INSERTED</PixText>}
        {lf >= enter && lf < enter + 8 && <AbsoluteFill style={{background: C.white, opacity: 1 - (lf - enter) / 8}} />}
      </AbsoluteFill>
    );
  } else if (sc.id === 'S2') {
    body = (
      <AbsoluteFill style={{background: BG, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
        <Stars f={f} />
        <PixText size={26} color={C.gold} style={{letterSpacing: 6, marginBottom: 30}}>HAICHING IT QUEST</PixText>
        <div style={{display: 'flex'}}>
          {Array.from('你的未來，自己寫').map((ch, i) => {
            const s = spring({frame: q - 2 - i * 3, fps, config: {damping: 8, stiffness: 160}});
            return <PixText key={i} tc size={140} style={{transform: `translateY(${q8((1 - s) * -560)}px)`, color: i < 4 ? C.white : C.gold,
              textShadow: `10px 10px 0 ${C.ink}`}}>{ch}</PixText>;
          })}
        </div>
        <PixText size={30} tc style={{marginTop: 30}}>範例高中　資訊科</PixText>
        <PixText size={34} style={{marginTop: 50, opacity: Math.floor(lf / 15) % 2 ? 1 : 0.2}}>▶ PRESS START</PixText>
      </AbsoluteFill>
    );
  } else if (['S3', 'S4', 'S5', 'S6'].includes(sc.id)) {
    body = <WorldMap f={f} />;
  } else if (sc.id === 'S7') {
    const hits = [20, 34, 48];
    const hp = 1 - hits.filter((h) => lf >= h).length / 3;
    const dead = lf >= 62;
    const shake = hits.some((h) => lf >= h && lf < h + 5) ? (random(`b${f}`) - 0.5) * 30 : 0;
    body = (
      <AbsoluteFill style={{background: '#2A0A1E', overflow: 'hidden'}}>
        <Stars f={f} />
        {!dead ? (
          <>
            <PixText size={30} tc color={C.red} style={{position: 'absolute', top: 120, width: '100%', textAlign: 'center'}}>BOSS：全國技能競賽</PixText>
            <div style={{position: 'absolute', left: 660, top: 190, width: 600, height: 30, border: `6px solid ${C.white}`, background: C.dark}}>
              <div style={{width: `${hp * 100}%`, height: '100%', background: C.red}} />
            </div>
            <div style={{position: 'absolute', left: 1180 + shake, top: 330, width: 380, height: 380, background: '#7A2E5E', border: `12px solid ${C.ink}`,
              boxShadow: `inset -30px -30px 0 #5A1E44`, filter: hits.some((h) => lf >= h && lf < h + 3) ? 'brightness(3)' : undefined}}>
              <div style={{position: 'absolute', left: 70, top: 90, width: 60, height: 60, background: C.gold}} />
              <div style={{position: 'absolute', left: 230, top: 90, width: 60, height: 60, background: C.gold}} />
              <div style={{position: 'absolute', left: 90, top: 230, width: 200, height: 40, background: C.ink}} />
            </div>
            <Sprite x={360} y={500} s={14} />
            {hits.map((h) => lf >= h - 12 && lf < h ? <div key={h} style={{position: 'absolute', left: q8(540 + (lf - h + 12) * 55), top: 590, width: 40, height: 16, background: C.gold}} /> : null)}
          </>
        ) : (
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
            {lf < 72 && <AbsoluteFill style={{background: C.white, opacity: 1 - (lf - 62) / 10}} />}
            <div style={{width: 1300, padding: '36px 50px', background: C.dark, border: `10px solid ${C.gold}`, boxShadow: '16px 16px 0 #000'}}>
              <PixText size={44} color={C.gold} style={{textAlign: 'center'}}>HALL OF FAME</PixText>
              <div style={{display: 'flex', justifyContent: 'center', gap: 26, marginTop: 36}}>
                {Array.from({length: 10}, (_, i) => {
                  const on = lf >= 76 + i * 5;
                  return <div key={i} style={{width: 86, height: 86, background: on ? C.gold : '#444', border: `6px solid ${C.ink}`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', transform: `scale(${on && lf < 80 + i * 5 ? 1.25 : 1})`}}><PixText size={30} color={C.ink}>★</PixText></div>;
                })}
              </div>
              <PixText size={46} tc style={{textAlign: 'center', marginTop: 30}}>國際技能競賽國手 × {Math.min(10, Math.max(0, Math.floor((lf - 76) / 5) + 1))}</PixText>
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    );
  } else if (sc.id === 'S8') {
    const n = Math.min(12, Math.max(0, Math.floor((lf - 8) / 5) + 1));
    body = (
      <AbsoluteFill style={{background: BG, overflow: 'hidden'}}>
        <Stars f={f} />
        <PixText size={34} color={C.gold} style={{position: 'absolute', top: 110, width: '100%', textAlign: 'center'}}>LOOT DROP!</PixText>
        {Array.from({length: 12}, (_, i) => {
          const at = 8 + i * 5;
          if (lf < at) return null;
          const s = spring({frame: step(lf - at), fps, config: {damping: 7, stiffness: 160}});
          const x = 330 + (i % 6) * 220, y = 300 + Math.floor(i / 6) * 230;
          return (
            <div key={i} style={{position: 'absolute', left: x, top: q8(y - (1 - s) * 400), width: 120, height: 120, borderRadius: 60, background: C.gold,
              border: `10px solid ${C.ink}`, boxShadow: 'inset -14px -14px 0 #C9871F', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <PixText size={40} tc color={C.ink}>金</PixText>
            </div>
          );
        })}
        <PixText size={60} tc style={{position: 'absolute', bottom: 210, width: '100%', textAlign: 'center'}}>全國技能競賽金牌 × {n}</PixText>
      </AbsoluteFill>
    );
  } else if (sc.id === 'S9') {
    body = (
      <AbsoluteFill style={{background: BG, alignItems: 'center', overflow: 'hidden'}}>
        <Stars f={f} />
        <div style={{display: 'flex', gap: 40, marginTop: 90}}>
          {[0, 1, 2].map((i) => {
            const s = spring({frame: step(lf) - 8 - i * 12, fps, config: {damping: 8}});
            return <PixText key={i} size={130} color={C.gold} style={{transform: `scale(${s})`}}>★</PixText>;
          })}
        </div>
        <PixText size={56} color={C.green} style={{marginTop: 0, opacity: lf > 44 ? 1 : 0}}>PERFECT!</PixText>
        <div style={{display: 'flex', gap: 90, marginTop: 150}}>
          {[['金', C.gold], ['銀', '#C9D4E0'], ['銅', '#D98B4E']].map(([l, col], i) => {
            const open = lf > 20 + i * 12;
            return (
              <div key={l} style={{position: 'relative', width: 220, height: 170}}>
                {open && <div style={{position: 'absolute', left: 40, top: -150, width: 140, height: 140, background: col, borderRadius: 70, boxShadow: `0 0 60px ${col}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'}}><PixText size={54} tc color={C.ink}>{l}</PixText></div>}
                <div style={{position: 'absolute', left: 0, top: 60, width: 220, height: 110, background: '#8B5A2B', border: `8px solid ${C.ink}`}} />
                <div style={{position: 'absolute', left: 0, top: open ? 0 : 30, width: 220, height: 40, background: '#A86C34', border: `8px solid ${C.ink}`,
                  transform: open ? 'rotate(-18deg)' : undefined}} />
              </div>
            );
          })}
        </div>
        <PixText size={40} tc style={{marginTop: 50}}>第 56 屆分區賽　雙職類 金銀銅全包</PixText>
      </AbsoluteFill>
    );
  } else if (sc.id === 'S10') {
    const n = Math.min(26, Math.max(0, Math.floor((lf - 70) / 2)));
    body = (
      <AbsoluteFill style={{background: `linear-gradient(#0B0E2A, #3B1D5E)`, overflow: 'hidden'}}>
        <Stars f={f} />
        <PixText size={40} color={C.gold} style={{position: 'absolute', top: 100, width: '100%', textAlign: 'center'}}>NEXT WORLD ▶</PixText>
        {['臺科大', '雲科大', '高科大'].map((u, i) => {
          const open = Math.max(0, Math.min(1, (lf - 10 - i * 14) / 12));
          return (
            <div key={u} style={{position: 'absolute', left: 300 + i * 500, top: 260, width: 320, height: 440}}>
              <div style={{position: 'absolute', inset: 0, border: `16px solid ${C.white}`, borderBottom: 'none', borderRadius: '160px 160px 0 0', background: C.ink}} />
              <div style={{position: 'absolute', left: 16, right: 16, top: 16, bottom: 0, borderRadius: '150px 150px 0 0', overflow: 'hidden', opacity: open}}>
                {Array.from({length: 8}, (_, k) => <div key={k} style={{position: 'absolute', left: '50%', top: '50%', width: 40 + k * 50, height: 40 + k * 50,
                  marginLeft: -(20 + k * 25), marginTop: -(20 + k * 25), border: `10px solid ${[C.blue, C.green, C.gold][(k + Math.floor(f / 4)) % 3]}`, borderRadius: '50%'}} />)}
              </div>
              <div style={{position: 'absolute', left: -20, right: -20, top: 470, textAlign: 'center', background: C.dark, border: `6px solid ${C.white}`, padding: '8px 0'}}>
                <PixText size={40} tc>{u}</PixText>
              </div>
            </div>
          );
        })}
        <Sprite x={q8(Math.min(900, -100 + lf * 9))} y={540} s={10} walk={Math.floor(f / 4) % 2 === 1} />
        <PixText size={52} tc color={C.green} style={{position: 'absolute', bottom: 200, right: 120, opacity: lf > 64 ? 1 : 0}}>國立大專 {n} 人次</PixText>
      </AbsoluteFill>
    );
  } else {
    const yes = lf > 26;
    body = (
      <AbsoluteFill style={{background: '#000', alignItems: 'center', justifyContent: 'center'}}>
        {lf < 60 ? (
          <>
            <PixText size={80} color={C.white}>CONTINUE?</PixText>
            <div style={{display: 'flex', gap: 120, marginTop: 60}}>
              <PixText size={50} color={yes ? C.gold : C.white}>{yes && Math.floor(lf / 6) % 2 ? '▶' : ' '} YES</PixText>
              <PixText size={50} color="#666">NO</PixText>
            </div>
          </>
        ) : (
          <>
            <div style={{display: 'flex'}}>
              {Array.from('你的未來，自己寫').map((ch, i) => {
                const s = spring({frame: step(lf - 60) - i * 2, fps, config: {damping: 8, stiffness: 180}});
                return <PixText key={i} tc size={130} style={{transform: `translateY(${q8((1 - s) * -400)}px)`, color: i < 4 ? C.white : C.gold,
                  textShadow: `10px 10px 0 ${C.blue}`}}>{ch}</PixText>;
              })}
            </div>
            <PixText size={44} tc style={{marginTop: 40, opacity: lf > 84 ? 1 : 0}}>範例高中　資訊科</PixText>
            <PixText size={22} color={C.gold} style={{marginTop: 30, opacity: lf > 96 ? 1 : 0}}>NEW GAME ▶ 2026</PixText>
          </>
        )}
      </AbsoluteFill>
    );
  }

  const fade = Math.max(0, 1 - f / 6, (f - (S('A', 'S11').from + S('A', 'S11').dur - 20)) / 20);
  return (
    <AbsoluteFill>
      {body}
      <DialogBox f={f} />
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.13) 0 2px, transparent 2px 4px)', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
