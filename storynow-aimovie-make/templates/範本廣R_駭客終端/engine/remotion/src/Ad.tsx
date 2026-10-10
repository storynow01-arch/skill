/* 廣R 駭客終端（Terminal，《駭客軍團》片頭感）：一台電腦的終端機與 tmux；整支是「有人在打指令查詢某個主題」，資訊都以指令輸出出現。
   techhouse 126 BPM（一拍 14.29 格），指令在拍點上按 Enter。
   招牌轉場：clear 把畫面逐行往上捲走／視窗最小化縮成一行再展開／tmux 窗格分割（進）與放大合併（出）／最後整個終端機縮成一個視窗（logo）。
   畫面最下方 180 像素是靜止的 tmux 狀態列，只在換章那格改高亮。
   章的順序、每章的字、每章多長、用哪種轉場全部讀 timeline.json（timeline.py 依 storyboard 排好）。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import T from './timeline.json';
import {Chap, EI, EIO, EO, b, k, lerp} from './kit';
import {C, Cmd, D, FULL, FS, Frame, IN, KAI, MONO, StatusArea, TB, abs} from './ui';
import {FAM} from './fonts';
import {ChBoot, ChLs, ChTmux, ChWhoami} from './chA';
import {ChCat, ChEnd, ChStatus, LOGO_IN, Logo} from './chB';

const CHS = T.chapters as unknown as Chap[];
const CH = CHS.map((c) => c.from);
const N = CHS.length;
const len = (i: number) => (i + 1 < N ? CH[i + 1] : T.frames) - CH[i];
const at = (f: number) => {
  let i = 0;
  while (i + 1 < N && f >= CH[i + 1]) i++;
  return {i, t: f - CH[i]};
};
const VIEW: Record<string, React.FC<{t: number; c: Chap}>> = {boot: ChBoot, whoami: ChWhoami, ls: ChLs, cat: ChCat, status: ChStatus, end: ChEnd};
const show = (i: number, t: number): React.ReactNode => {
  const c = CHS[i];
  if (c.type === 'tmux') return <ChTmux t={t} c={c} len={len(i)} old={i > 0 ? show(i - 1, len(i - 1) - 1) : null} />;
  const V = VIEW[c.type];
  return <V t={t} c={c} />;
};

/* clear：章尾打 clear、按 Enter 後整個畫面逐行由下往上捲走（clear 那一行若在內容下方放不下，先像真的終端機一樣整頁往上推一行） */
const CLEAR_MAX = 760;
const withClear = (i: number, t: number, body: React.ReactNode): React.ReactNode => {
  const c = CHS[i];
  const L = len(i);
  const t0 = b(c.nb - 2.2), en = b(c.nb - 1.0);
  if (t < t0) return body;
  const y = Math.max(c.bottom + 16, 600);
  const push = Math.max(0, y - CLEAR_MAX);
  let up = push;
  if (t > en) {
    const q = (t - en) / (L - en);
    up += Math.floor(q * q * 18) * 50;
  }
  return (
    <div style={{...abs, inset: 0, transform: `translateY(${-up}px)`}}>
      {body}
      <Cmd t={t} s="clear" t0={t0} enter={en} style={{...abs, left: 44, top: y, fontFamily: MONO, fontSize: FS, color: C.w}} />
    </div>
  );
};

/* 桌面：點陣底紋＋左右兩排靜止的檔案圖示（logo 章視窗縮小後才看得到） */
const Icon: React.FC<{x: number; y: number; name: string; dir: boolean}> = ({x, y, name, dir}) => (
  <div style={{...abs, left: x, top: y, width: 210, textAlign: 'center', fontFamily: MONO, fontSize: 28, color: C.w}}>
    <div style={{margin: '0 auto', width: 96, height: 80, borderRadius: 8, border: `3px solid ${dir ? C.a : C.c}`, background: dir ? 'rgba(255,184,77,0.14)' : 'rgba(92,225,230,0.1)', position: 'relative'}}>
      <div style={{...abs, left: 14, right: 14, top: 22, height: 4, background: dir ? C.a : C.c, opacity: 0.7}} />
      <div style={{...abs, left: 14, right: 30, top: 38, height: 4, background: dir ? C.a : C.c, opacity: 0.5}} />
    </div>
    <div style={{marginTop: 10, whiteSpace: 'nowrap', fontFamily: KAI}}>{name}</div>
  </div>
);
const Desktop: React.FC = () => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, #1d3529 0%, ${C.desk} 70%)`}}>
    <AbsoluteFill style={{backgroundImage: 'radial-gradient(rgba(61,255,138,0.16) 1.6px, transparent 1.8px)', backgroundSize: '32px 32px'}} />
    {D.iconsL.map((n, i) => <Icon key={n} x={65} y={120 + i * 230} name={n} dir={n.endsWith('/')} />)}
    {D.iconsR.map((n, i) => <Icon key={n} x={1645} y={120 + i * 230} name={n} dir={false} />)}
  </AbsoluteFill>
);

const LOGO_RECT = {x: 340, y: 84, w: LOGO_IN.w + 4, h: LOGO_IN.h + TB + 4};

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const {i, t} = at(f);
  const c = CHS[i];
  const L = len(i);
  let rect = {...FULL};
  let glow = 0;

  // 最後一章後半：整個終端機縮成一個視窗，上一段內容淡出、logo 內容出現
  if (c.type === 'end' && t >= b(c.S)) {
    const tl = t - b(c.S);
    const p = k(tl, 0, 15, EIO);
    rect = {x: lerp(FULL.x, LOGO_RECT.x, p), y: lerp(FULL.y, LOGO_RECT.y, p), w: lerp(FULL.w, LOGO_RECT.w, p), h: lerp(FULL.h, LOGO_RECT.h, p)};
    glow = Math.max(0, 1 - tl / 14);
    const oldO = 1 - k(tl, 2, 10, EO);
    return (
      <AbsoluteFill style={{background: C.desk, overflow: 'hidden'}}>
        <Audio src={staticFile('music.wav')} />
        <Desktop />
        <Frame {...rect} title={`${D.host} — ${D.labels.open}`} glow={glow} hexW={360} inner={LOGO_IN}>
          <Logo t={tl} c={c} />
          {oldO > 0 && (
            <div style={{...abs, left: (LOGO_IN.w - IN.w) / 2, top: (LOGO_IN.h - IN.h) / 2, width: IN.w, height: IN.h, opacity: oldO, background: C.bg}}>
              <ChEnd t={b(c.S) - 1} c={c} />
            </div>
          )}
        </Frame>
        <StatusArea active={N} />
      </AbsoluteFill>
    );
  }

  let body = show(i, t);
  if (c.out === 'clear') body = withClear(i, t, body);
  // 最小化：視窗高度收成一行標題列（章尾），下一章開頭再展開
  if (c.out === 'minimize' && t >= L - 12) {
    const p = k(t, L - 12, L, EI);
    const h = lerp(FULL.h, TB + 4, p);
    rect = {...rect, y: FULL.y + (FULL.h - h) / 2, h};
    glow = k(t, L - 6, L, EO);
  }
  if (c.trans === 'minimize' && t < 13) {
    const p = k(t, 0, 13, EO);
    const h = lerp(TB + 4, FULL.h, p);
    rect = {...rect, y: FULL.y + (FULL.h - h) / 2, h};
    glow = 1 - k(t, 0, 10, EO);
  }
  // 章首重擊：邊框亮一下（小面積）
  if (t < 8 && i > 0) glow = Math.max(glow, 0.6 * (1 - t / 8));
  // tmux 章末窗格放大時，邊框跟著亮
  if (c.type === 'tmux' && t > L - 11) glow = Math.max(glow, k(t, L - 11, L, EI) * 0.7);

  return (
    <AbsoluteFill style={{background: C.desk, overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <Desktop />
      <Frame {...rect} title={c.title} glow={glow}>{body}</Frame>
      <StatusArea active={i} />
    </AbsoluteFill>
  );
};

/** 全字測試圖：storyboard 用到的每個字，用每一種字型（單獨）與實際串接各排一次，看有沒有缺字或退回別的字型 */
export const FontTest: React.FC = () => {
  const txt = Array.from(new Set(Array.from((T.allText as string).replace(/\s/g, '')))).join('');
  const row = (fam: string, w: number, label: string) => (
    <div style={{marginTop: 10}}>
      <div style={{fontFamily: 'monospace', fontSize: 18, color: C.a}}>{label}</div>
      <div style={{fontFamily: fam, fontWeight: w, fontSize: 30, lineHeight: 1.2, color: C.w, wordBreak: 'break-all'}}>{txt}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{background: C.bg, padding: 24}}>
      {row(`'${FAM.kai}'`, 700, '霞鶩文楷 Mono TC 700（單獨；楷體以外的字形＝缺字退回系統字型）')}
      {row(`'${FAM.noto}'`, 700, 'Noto Sans TC 700（單獨，備援）')}
      {row(MONO, 700, 'MONO 串接：IBM Plex Mono → 霞鶩文楷 Mono TC → Noto Sans TC')}
      {row(KAI, 400, 'KAI 串接 400：霞鶩文楷 Mono TC → IBM Plex Mono → Noto Sans TC')}
    </AbsoluteFill>
  );
};
