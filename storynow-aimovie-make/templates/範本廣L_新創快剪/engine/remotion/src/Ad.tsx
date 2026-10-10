/* 範本廣L「新創快剪」：把主題包裝成一間新創的產品發表（原作：熱門提示詞 H3「make a modern slick and punchy video for a modern startup that works on inference」）。
   輸入框下指令 → Hero → build-up → 鑽進游標點 → DROP（a ＋ b ＋ c）→ 產品線卡片 → 指標牆（暗場）→ 功能 → CTA。
   120 BPM、一拍 15 格；所有事件格數、畫面上的字與字級都在 timeline.json（timeline.py 依 storyboard 排好）。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {EIO, EO, k} from './kit';
import T from './timeline.json';
import {AFTER_DROP, AFTER_METRICS, C, D, GE, Grid, MK, Noise, TC, Tag, gridPos} from './theme';
import {SceneBuild, SceneDrop, SceneHero, SceneInput, diveR} from './scenesA';
import {SceneCTA, SceneFeatures, SceneMetrics, SceneRail} from './scenesB';

const W = 1920;
const SECTIONS = T.sections as [number, string][];

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const g = gridPos(f);
  const m0 = MK.m?.[0];

  // 藍色層（鑽進游標點 → DROP → 被下一段從右邊推走）
  const blueOn = f >= MK.dive && f < AFTER_DROP + 12;
  const blueClip = f < MK.drop ? `circle(${diveR(f)}px at 960px 540px)` : `inset(0 ${W * k(f, AFTER_DROP - 2, AFTER_DROP + 10, EO)}px 0 0)`;
  // 暗場（指標牆）：從右邊推進、再被淺色從右邊推走
  const darkOn = m0 !== undefined && f >= m0 - 7 && f < AFTER_METRICS + 7;
  const darkClip =
    m0 === undefined ? '' : f < AFTER_METRICS - 7 ? `inset(0 0 0 ${W * (1 - k(f, m0 - 7, m0 + 5, EIO))}px)` : `inset(0 ${W * k(f, AFTER_METRICS - 7, AFTER_METRICS + 5, EIO)}px 0 0)`;

  const onBlue = f >= MK.drop && f < AFTER_DROP;
  const onDark = m0 !== undefined && f >= m0 && f < AFTER_METRICS;
  const hudColor = onBlue || onDark ? 'rgba(255,255,255,0.8)' : C.gray;
  const sec = [...SECTIONS].reverse().find(([s]) => f >= s)![1];
  const fs0 = MK.f?.[0];

  return (
    <AbsoluteFill style={{background: C.paper, overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <Grid x={g.x} y={g.y} color={C.line} major="rgba(13,14,18,0.05)" />
      <Noise opacity={0.06} />
      {blueOn && (
        <AbsoluteFill style={{clipPath: blueClip, background: C.brand}}>
          <Grid x={g.x} y={g.y} color="rgba(255,255,255,0.09)" major="rgba(255,255,255,0.08)" />
        </AbsoluteFill>
      )}
      {darkOn && (
        <AbsoluteFill style={{clipPath: darkClip, background: C.dark}}>
          <Grid x={g.x} y={g.y} color="rgba(255,255,255,0.05)" major="rgba(255,255,255,0.05)" />
          <AbsoluteFill style={{background: 'radial-gradient(circle at 80% 30%, rgba(124,147,255,0.16) 0%, rgba(124,147,255,0) 50%)'}} />
        </AbsoluteFill>
      )}

      {f < MK.enter + 10 && <SceneInput f={f} />}
      {f >= MK.enter + 10 && f < MK.b[0] && <SceneHero f={f} />}
      {f >= MK.b[0] && f < MK.drop && <SceneBuild f={f} />}
      {f >= MK.drop && f < AFTER_DROP && <SceneDrop f={f} />}
      {MK.rail !== undefined && f >= MK.rail && f < (m0 ?? fs0 ?? MK.cta) && <SceneRail f={f} />}
      {m0 !== undefined && f >= m0 && f < AFTER_METRICS && <SceneMetrics f={f} />}
      {fs0 !== undefined && f >= fs0 && f < MK.cta && <SceneFeatures f={f} />}
      {f >= MK.cta && <SceneCTA f={f} />}

      {/* HUD（頂部，靜態品牌列＋段落編號） */}
      <div style={{position: 'absolute', left: 64, top: 44, display: 'flex', alignItems: 'center', gap: 14, opacity: f >= MK.cta ? 0 : 1}}>
        <div style={{width: 18, height: 18, borderRadius: 4, background: onBlue ? '#fff' : C.brand}} />
        <div style={{fontFamily: GE, fontWeight: 500, fontSize: 30, letterSpacing: '0.04em', color: onBlue || onDark ? '#fff' : C.ink, whiteSpace: 'nowrap'}}>{D.brand.mark}</div>
      </div>
      <div style={{position: 'absolute', right: 64, top: 48, opacity: f >= MK.cta ? 0 : 1}}>
        <Tag color={hudColor}>{sec}</Tag>
      </div>
    </AbsoluteFill>
  );
};

/** 全字測試圖：storyboard 用到的每個字排兩次（思源黑體、Geist 串接），確認沒有缺字方塊 */
export const FontTest: React.FC = () => {
  const txt = Array.from(new Set(Array.from((T.allText as string).replace(/\s/g, '')))).join('');
  return (
    <AbsoluteFill style={{background: C.paper, padding: 40, color: C.ink}}>
      <div style={{fontFamily: TC, fontWeight: 300, fontSize: 50, lineHeight: 1.25, wordBreak: 'break-all'}}>{txt}</div>
      <div style={{fontFamily: GE, fontWeight: 300, fontSize: 50, lineHeight: 1.25, marginTop: 24, color: C.brand, wordBreak: 'break-all'}}>{txt}</div>
    </AbsoluteFill>
  );
};
