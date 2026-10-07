/* 範本 H：螢幕模擬 Screen Sim —— 給文本就演出「像螢幕錄影」的操作畫面（2026-10-07）。
   Windows 11 桌面＋Chrome＋Windows 終端機、iPhone 訊息 App；游標移動與點擊、逐字打字（有按鍵聲）、載入狀態、指令輸出、
   鏡頭平滑推近特寫、白色重點泡泡（[[字]] 螢光筆），全部對準旁白。
   場景型別：title（開場）、screen（電腦螢幕操作）、phone（手機）、recap（重點整理）。欄位見 templates/範本H_螢幕模擬/README.md。
   招牌特徵（概念忠實度）：①看起來像真的螢幕錄影（真的介面、真的字型、真的輸出格式）②每個操作都跟著旁白發生
   ③重點用鏡頭推近＋白色泡泡指出來 ④打字、點擊有聲音。
   介面本身標 data-qa="ignore"（真實介面的字本來就小，不量字級）；泡泡、標題、字幕照常品檢。 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import {QaProbe} from '../QaProbe';
import {
  Act, Browser, Bubble, camera, Cursor, cursorAt, fadeIn, H, Phone, PhoneBg, PhoneInit, Rect, seg, Tap, targetRect, TaskBarActive,
  Taskbar, Terminal, TermInit, W, Wallpaper,
} from '../lib/screen';
import {TplSpec, cue} from './common';
import {BrandLogo} from './brand';

const TC = loadTC('normal', {weights: ['500', '700', '900'], ignoreTooManyRequestsWarning: true}).fontFamily;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = {p: any; cues: number[]; dur: number};

/** 泡泡：每個 callout 顯示到下一個 callout／hide／換鏡頭（zoom）／場景結束 */
const bubbles = (acts: Act[], dur: number) => acts.map((a, i) => {
  if (a.do !== 'callout') return null;
  const next = acts.slice(i + 1).find((b) => b.do === 'callout' || b.do === 'hide' || b.do === 'zoom');
  return {act: a, endF: next ? next.f : dur};
}).filter(Boolean) as {act: Act; endF: number}[];

const Screen: React.FC<P> = ({p, dur}) => {
  const lf = useCurrentFrame();
  const acts: Act[] = p.actions ?? [];
  const term: TermInit = p.terminal ?? {};
  const focusT = acts.find((a) => a.do === 'focus' && a.app === 'terminal');
  const termOpenF = term.open ? -20 : focusT ? focusT.f : null;
  const showBrowser = p.browser !== null && p.browser !== false;
  const lastLoad = [...acts].reverse().find((a) => a.do === 'load' && a.f <= lf);
  const ctx = {acts, lf, term, page: lastLoad ? lastLoad.page : p.browser?.page ?? 'newtab'};
  const cam = camera(acts, ctx);
  const cur = cursorAt(acts, ctx, p.cursor ?? {x: 1000, y: 640});
  const termMarks = acts.filter((a) => a.do === 'highlight' && String(a.to ?? '').startsWith('term:'))
    .map((a) => ({rect: targetRect(a.to, {...ctx, lf: a.f}), at: a.f}));
  const boxMarks = acts.filter((a) => a.do === 'highlight' && !String(a.to ?? '').startsWith('term:') && a.f <= lf);
  const active: TaskBarActive = [...(showBrowser ? ['browser'] : []), ...(termOpenF !== null && lf >= termOpenF ? ['terminal'] : [])];
  const fin = fadeIn(lf, 0, XF);
  return (
    <AbsoluteFill style={{background: '#000', opacity: fin}}>{/* fin：換場時蓋在前一場上面淡入 */}
      <div data-qa="ignore" style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0',
        transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.z})`}}>
        <Wallpaper />
        {showBrowser && <Browser lf={lf} acts={acts} init={p.browser ?? {}} />}
        {termOpenF !== null && lf >= termOpenF && <Terminal lf={lf} acts={acts} init={term} openF={termOpenF} marks={termMarks} />}
        {boxMarks.map((a, i) => {
          const r = targetRect(a.to, {...ctx, lf: a.f});
          return <div key={i} style={{position: 'absolute', left: r.x - 6, top: r.y - 6, width: r.w + 12, height: r.h + 12, borderRadius: 10,
            border: '4px solid #FFC400', background: 'rgba(255,214,0,0.12)', opacity: seg(lf, a.f, a.f + 8)}} />;
        })}
        <Taskbar active={active} clock={p.clock} date={p.date} />
        {p.cursor !== false && <Cursor x={cur.x} y={cur.y} lf={lf} clickF={cur.clickF} />}
      </div>
      {bubbles(acts, dur).map(({act, endF}) => (
        <Bubble key={act.f} lf={lf} act={act} endF={endF} anchor={cam.map(targetRect(act.to, {...ctx, lf: act.f}))} font={TC} />
      ))}
    </AbsoluteFill>
  );
};

const PhoneScene: React.FC<P> = ({p, dur}) => {
  const lf = useCurrentFrame();
  const acts: Act[] = p.actions ?? [];
  const ctx = {acts, lf};
  const cam = camera(acts, ctx);
  const init: PhoneInit = p.phone ?? {};
  return (
    <AbsoluteFill style={{background: '#fff', opacity: fadeIn(lf, 0, XF)}}>
      <div data-qa="ignore" style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0',
        transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.z})`}}>
        <PhoneBg />
        <Phone lf={lf} acts={acts} init={init} />
        <Tap acts={acts} lf={lf} />
      </div>
      {bubbles(acts, dur).map(({act, endF}) => (
        <Bubble key={act.f} lf={lf} act={act} endF={endF} anchor={cam.map(targetRect(act.to ?? 'phone:screen', {...ctx, lf: act.f}))} font={TC} />
      ))}
    </AbsoluteFill>
  );
};

/** 開場：Windows 桌面上一張白卡片（像投影片視窗） */
const Title: React.FC<P> = ({p}) => {
  const lf = useCurrentFrame();
  const a = seg(lf, 0, 14);
  return (
    <AbsoluteFill style={{opacity: fadeIn(lf, 0, XF)}}>
      <Wallpaper />
      <div style={{position: 'absolute', left: 260, top: 230 + (1 - a) * 40, width: 1400, height: 520, background: 'rgba(255,255,255,0.97)', borderRadius: 18,
        boxShadow: '0 30px 90px rgba(0,0,0,0.35)', opacity: a, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26}}>
        {p.eyebrow && <div style={{fontFamily: TC, fontWeight: 700, fontSize: 30, color: '#0B57D0', background: '#E8F0FE', padding: '6px 22px', borderRadius: 20,
          opacity: fadeIn(lf, 10, 10)}}>{p.eyebrow}</div>}
        <div style={{fontFamily: TC, fontWeight: 900, fontSize: 96, color: '#1b1b1b', opacity: fadeIn(lf, 6, 10)}}>{p.title}</div>
        {p.en && <div style={{fontFamily: TC, fontWeight: 500, fontSize: 34, letterSpacing: 8, color: '#5f6368', opacity: fadeIn(lf, 16, 10)}}>{p.en}</div>}
      </div>
      <Taskbar active={[]} />
    </AbsoluteFill>
  );
};

/** 重點整理：白卡片，項目跟著旁白逐條打勾 */
const Recap: React.FC<P> = ({p, cues}) => {
  const lf = useCurrentFrame();
  const pts: string[] = p.points ?? [];
  return (
    <AbsoluteFill style={{opacity: fadeIn(lf, 0, XF)}}>
      <Wallpaper />
      <div style={{position: 'absolute', left: 300, top: 150, width: 1320, minHeight: 600, background: 'rgba(255,255,255,0.97)', borderRadius: 18,
        boxShadow: '0 30px 90px rgba(0,0,0,0.35)', padding: '56px 80px', boxSizing: 'border-box', opacity: seg(lf, 0, 10)}}>
        <div style={{fontFamily: TC, fontWeight: 900, fontSize: 60, color: '#1b1b1b', marginBottom: 34}}>{p.heading ?? '重點整理'}</div>
        {pts.map((t, i) => {
          const at = cue(cues, p.cueMap?.[i] ?? i, 12 + i * 30);
          const on = fadeIn(lf, at, 8);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, fontFamily: TC, fontWeight: 700, fontSize: 44, color: '#1b1b1b',
              lineHeight: '84px', opacity: 0.25 + on * 0.75}}>
              <span style={{width: 50, height: 50, borderRadius: 10, border: '4px solid #0B57D0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: on > 0.5 ? '#0B57D0' : '#fff', color: '#fff', fontSize: 34}}>{on > 0.5 ? '✓' : ''}</span>{t}
            </div>
          );
        })}
      </div>
      <Taskbar active={[]} />
    </AbsoluteFill>
  );
};

const SCENES: Record<string, React.FC<P>> = {title: Title, screen: Screen, phone: PhoneScene, recap: Recap};
const XF = 12;   // 換場交疊淡入（0.4 秒）：前一場多畫 XF 格墊在下面，不會「切黑再淡入」造成突跳（最終品檢 F11）

/** 這一格的字幕：下一句 10 格內就出現時直接接上（避免句間空 1～2 格的閃爍，最終品檢 F1） */
const captionNow = (spec: TplSpec, f: number) => {
  const cs = spec.captions;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i], nx = cs[i + 1];
    const end = nx && nx.from - c.to <= 10 ? nx.from : c.to + 4;
    if (f >= c.from && f < end) return c;
  }
  return undefined;
};

export const TemplateH: React.FC<TplSpec> = (spec) => {
  const f = useCurrentFrame();
  const cap = captionNow(spec, f);
  const fade = Math.max(0, (f - (spec.totalFrames - 16)) / 16);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {spec.scenes.map((s) => {
        const Comp = SCENES[s.type];
        return Comp ? <Sequence key={s.id} from={s.from} durationInFrames={s.dur + XF}><Comp p={s.props} cues={s.cues} dur={s.dur} /></Sequence> : null;
      })}
      {cap && <div data-qa="caption" style={{position: 'absolute', left: 0, right: 0, bottom: 92, display: 'flex', justifyContent: 'center'}}>
        <div style={{fontFamily: TC, fontWeight: 700, fontSize: 42, color: '#fff', background: 'rgba(0,0,0,0.72)', padding: '8px 26px', borderRadius: 10, letterSpacing: 1, maxWidth: 1600}}>{cap.text}</div></div>}
      <BrandLogo logo={spec.brand?.logo} />
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
      {spec.qa && <QaProbe w={spec.width} h={spec.height} />}
      {spec.music && <Audio src={staticFile(spec.music)} volume={spec.musicVolume ?? 0.25} />}
      {spec.voice && <Audio src={staticFile(spec.voice)} />}
      <Audio src={staticFile('tpl_sfx.wav')} />
    </AbsoluteFill>
  );
};
export type {Rect};
