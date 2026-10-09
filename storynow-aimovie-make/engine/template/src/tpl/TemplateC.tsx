/* 範本 C：動態字體快剪 Kinetic Type —— 文字就是畫面，重點在拍點上砸入，場景之間硬切。
   黑白＋單一螢光強調色；字幕＝小黑條（大螢幕／靜音 YouTube 都看得懂）。
   招牌特徵（概念忠實度）：①一拍一個字砸入、硬切 ②**字變成東西**：卡片標題碎開飛成它的線稿圖示、數字裡面塞滿內容、
   重點字碎裂 ③速度坡道隧道（情境逐條從隧道衝出）④分割畫面 ⑤最後所有字收成一句停在最後一拍。圖示一律用 NeonIcon（不用彩色 emoji）。 */
import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {QaProbe} from '../QaProbe';
import {NeonIcon} from '../lib/iconkit';
import {Shatter} from '../lib/kinetic';
import {Tunnel} from '../lib/tunnel';
import {TplSpec, captionAt, cue, fit, sceneIndex, wrap} from './common';
import {BrandLogo} from './brand';

const TC = loadTC('normal', {weights: ['700', '900'], ignoreTooManyRequestsWarning: true}).fontFamily;
/** Inter 沒有中文字形：中文（如 stat 單位「種」）接已載入的 NotoSansTC，不退回各電腦的系統字型 */
const EN = `${loadInter('normal', {weights: ['900']}).fontFamily}, ${TC}`;
const BK = '#000', WH = '#fff', AC = '#D4FF00', RED = '#FF3B4E', GOLD = '#FFC23D';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = {p: any; cues: number[]; dur: number; bf: number; title?: string};

/** 第 at 格砸入 */
const slam = (lf: number, at: number): React.CSSProperties => {
  const d = lf - at;
  const s = interpolate(d, [0, 4], [2.4, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const blur = interpolate(d, [0, 4], [14, 0], clamp);
  const sh = d >= 0 && d < 5 ? (random(`k${at}${d}`) - 0.5) * 20 : 0;
  return {transform: `translate(${sh}px, ${sh * 0.6}px) scale(${s})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity: d < 0 ? 0 : 1};
};
const Big: React.FC<{c: string; size: number; font?: string; style?: React.CSSProperties; children: React.ReactNode}> = ({c, size, font = TC, style, children}) => (
  <div style={{fontFamily: font, fontWeight: 900, fontSize: size, color: c, lineHeight: 1.05, whiteSpace: 'nowrap', ...style}}>{children}</div>
);
const Full: React.FC<{bg: string; children: React.ReactNode}> = ({bg, children}) => (
  <AbsoluteFill style={{background: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>{children}</AbsoluteFill>
);
const Tag: React.FC<{text: string; c?: string; bg?: string; style?: React.CSSProperties}> = ({text, c = BK, bg = AC, style}) => (
  <div style={{fontFamily: TC, fontWeight: 900, fontSize: 40, color: c, background: bg, padding: '4px 22px', display: 'inline-block', ...style}}>{text}</div>
);
/** 把一句話切成 2–4 字的節拍詞組 */
const chunks = (s: string) => {
  const out: string[] = []; let cur = '';
  for (const ch of Array.from(s)) { cur += ch; if (/[，、。：！？·\s]/.test(ch) || cur.length >= 3) { out.push(cur.trim()); cur = ''; } }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
};

const Title: React.FC<P> = ({p, dur, bf}) => {
  const lf = useCurrentFrame();
  const parts = chunks(p.title);
  const assembleAt = Math.min(Math.round(parts.length * bf), Math.round(dur * 0.55));
  if (lf < assembleAt) {
    const k = Math.min(parts.length - 1, Math.floor(lf / bf));
    const bgs = [BK, WH, AC], fgs = [WH, BK, BK];
    return <Full bg={bgs[k % 3]}><Big c={fgs[k % 3]} size={fit(parts[k], 1600, 480)} style={slam(lf, Math.round(k * bf))}>{parts[k]}</Big></Full>;
  }
  return (
    <Full bg={BK}>
      {p.eyebrow && <Tag text={String(p.eyebrow)} style={{position: 'absolute', top: 200, ...slam(lf, assembleAt)}} />}
      <Big c={WH} size={fit(p.title, 1700, 200)} style={slam(lf, assembleAt)}>{p.title}</Big>
      {p.en && <Big c={AC} size={40} font={EN} style={{position: 'absolute', bottom: 230, letterSpacing: 12, ...slam(lf, assembleAt + Math.round(bf))}}>{p.en}</Big>}
    </Full>
  );
};

const Scenario: React.FC<P> = ({p, cues}) => {
  const lf = useCurrentFrame();
  const pills: string[] = p.pills ?? [];
  const k = pills.reduce((acc, _, i) => (lf >= cue(cues, p.cueMap?.[i], 20 + i * 30) ? i : acc), -1);
  const last = k === pills.length - 1 && p.lastIsProblem !== false;
  if (k < 0) return (
    <Full bg={BK}>
      <NeonIcon name={p.sketch ?? p.icon} size={380} f={lf} at={0} style={{marginTop: -120}} />
      <Big c={WH} size={fit(p.heading ?? '', 1600, 80)} style={{position: 'absolute', bottom: 200, ...slam(lf, 6)}}>{p.heading}</Big>
    </Full>
  );
  const at = cue(cues, p.cueMap?.[k], 20 + k * 30);
  if (last) return (
    <Full bg={RED}>
      <Big c={WH} size={fit(pills[k] + '?!', 1600, 300)} style={slam(lf, at)}>{pills[k]}?!</Big>
      <div style={{position: 'absolute', top: 150, display: 'flex', gap: 16}}>
        {pills.slice(0, k).map((x) => <Tag key={x} text={'✓ ' + x} bg={WH} c={BK} />)}
      </div>
    </Full>
  );
  // 速度坡道：字從隧道深處衝到眼前（前 8 格加速），之後隧道慢下來
  const d = lf - at;
  const z = interpolate(d, [0, 8], [0.04, 1], {...clamp, easing: Easing.in(Easing.exp)});
  const speed = interpolate(d, [0, 8, 20], [0.9, 0.5, 0.08], clamp);
  return (
    <Full bg={BK}>
      <Tunnel f={lf * 1.0} speed={speed} color="#666" accent={AC} />
      <Big c={WH} size={fit(pills[k], 1600, 260)} style={{transform: `scale(${z})`, filter: d < 8 ? `blur(${(1 - z) * 12}px)` : undefined, textShadow: `0 0 30px ${BK}`}}>{pills[k]}</Big>
      <div style={{position: 'absolute', top: 150, display: 'flex', gap: 16}}>
        {pills.slice(0, k).map((x) => <Tag key={x} text={'✓ ' + x} bg={WH} c={BK} />)}
      </div>
    </Full>
  );
};

const Definition: React.FC<P> = ({p, cues}) => {
  const lf = useCurrentFrame();
  const big: string = p.bigText, hl: string = p.highlight ?? '';
  const k = hl ? big.indexOf(hl) : -1;
  const hlAt = cue(cues, p.cueMap?.[1], 40);
  const bar = interpolate(lf, [hlAt, hlAt + 8], [0, 1], clamp);
  const notes: string[] = p.sideNotes ?? [];
  const size = fit(big, 1700, 220);
  return (
    <Full bg={BK}>
      {p.label && <Tag text={p.label} style={{position: 'absolute', top: 170, left: 120, ...slam(lf, 0)}} />}
      <Big c={WH} size={size} style={slam(lf, cue(cues, p.cueMap?.[0], 6))}>
        {k < 0 ? big : <>{big.slice(0, k)}<span style={{color: bar > 0 ? AC : WH, position: 'relative'}}>{hl}
          <span style={{position: 'absolute', left: 0, bottom: -size * 0.12, height: size * 0.1, width: `${bar * 100}%`, background: AC}} /></span>{big.slice(k + hl.length)}</>}
      </Big>
      {hl && <AbsoluteFill data-qa="ignore"><Shatter lf={lf} at={hlAt} items={[...Array.from(hl), hl, ...notes]} color={WH} accent={AC} font={TC} n={36} life={30} /></AbsoluteFill>}
      <div style={{position: 'absolute', bottom: 190, display: 'flex', gap: 24}}>
        {notes.map((n, i) => <div key={n} style={slam(lf, cue(cues, p.noteCues?.[i], 50 + i * 15))}><Tag text={n} bg={WH} /></div>)}
      </div>
    </Full>
  );
};

const Cards: React.FC<P> = ({p, cues, bf}) => {
  const lf = useCurrentFrame();
  const cards: {icon?: string; sketch?: string; title: string; note?: string}[] = p.cards ?? [];
  const k = cards.reduce((acc, _, i) => (lf >= cue(cues, p.cueMap?.[i], 20 + i * 30) ? i : acc), -1);
  if (k < 0) return <Full bg={BK}><Big c={WH} size={fit(p.heading ?? '', 1700, 150)} style={slam(lf, 0)}>{p.heading}</Big></Full>;
  const at = cue(cues, p.cueMap?.[k], 20 + k * 30);
  const c = cards[k];
  const inv = k % 2 === 1;
  const b = Math.max(8, Math.round(bf));
  const d = lf - at;
  // 字變成東西：第 1 拍標題巨大砸入 → 第 2 拍每個字飛向圖示位置縮小消失、圖示同時描出 → 版面定格
  if (d < b * 2) {
    const chars = Array.from(c.title);
    const size = fit(c.title, 1600, 300);
    const m = interpolate(d, [b, b * 2], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
    return (
      <Full bg={inv ? WH : BK}>
        <div style={{display: 'flex', ...(d < b ? slam(lf, at) : {})}}>
          {chars.map((ch, i) => {
            const dx = (-560 - (i - chars.length / 2) * size) * m, dy = -40 * m;
            return <Big key={i} c={inv ? BK : WH} size={size} style={{transform: `translate(${dx}px, ${dy}px) scale(${1 - 0.85 * m}) rotate(${(i % 2 ? 1 : -1) * 90 * m}deg)`,
              opacity: 1 - m * 0.9}}>{ch}</Big>;
          })}
        </div>
        {d >= b && <NeonIcon name={c.sketch ?? c.icon} size={300} f={lf} at={at + b} beat={b} stroke={inv ? BK : WH} style={{position: 'absolute', left: 260, top: 360}} />}
      </Full>
    );
  }
  return (
    <Full bg={inv ? WH : BK}>
      <div style={{position: 'absolute', top: 140, display: 'flex', gap: 14}}>
        {cards.map((x, i) => <Tag key={i} text={`${i + 1} ${x.title}`} bg={i === k ? AC : inv ? '#ddd' : '#222'} c={i === k ? BK : inv ? '#999' : '#777'} />)}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 60}}>
        <NeonIcon name={c.sketch ?? c.icon} size={300} f={lf} at={at + b} beat={b} stroke={inv ? BK : WH} />
        <div>
          <Big c={inv ? BK : WH} size={fit(c.title, 1000, 200)}>{c.title}</Big>
          {c.note && <Big c={inv ? '#333' : AC} size={fit(c.note, 1000, 64)} style={{marginTop: 24, whiteSpace: 'normal', maxWidth: 1000}}>{c.note}</Big>}
        </div>
      </div>
      {p.footer && lf >= cue(cues, cues.length - 1, 120) && <Tag text={p.footer} bg={RED} c={WH} style={{position: 'absolute', bottom: 190, ...slam(lf, cue(cues, cues.length - 1, 120))}} />}
    </Full>
  );
};

const Vs: React.FC<P> = ({p, cues}) => {
  const lf = useCurrentFrame();
  const half = (s: {frame: string; icon: string; sketch?: string; text: string}, i: number) => {
    const at = cue(cues, p.cueMap?.[i], i ? 40 : 6);
    const y = interpolate(lf, [at, at + 6], [i ? 1080 : -1080, 0], {...clamp, easing: Easing.out(Easing.cubic)});
    const bad = s.frame === 'danger';
    return (
      <div style={{flex: 1, background: i ? WH : BK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `translateY(${y}px)`, padding: 40}}>
        <div style={{position: 'relative'}}>
          <NeonIcon name={s.sketch ?? s.icon} size={230} f={lf} at={at + 4} beat={10} stroke={i ? BK : WH} accent={i ? '#9BB800' : AC} />
          {s.frame !== 'primary' && <Big c={bad ? RED : '#18A957'} size={130} style={{position: 'absolute', right: -90, top: -40, ...slam(lf, at + 16)}}>{bad ? '✕' : '✓'}</Big>}
        </div>
        {wrap(s.text, 9).slice(0, 3).map((ln, k) => <Big key={k} c={i ? BK : WH} size={fit(ln, 820, 90)} style={{marginTop: 10}}>{ln}</Big>)}
      </div>
    );
  };
  return (
    <AbsoluteFill style={{flexDirection: 'row'}}>
      {half(p.left, 0)}{half(p.right, 1)}
      <div style={{position: 'absolute', left: 900, top: 480, width: 120, height: 120, borderRadius: 60, background: AC, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Big c={BK} size={56} font={EN}>{!p.mid || p.mid === 'vs' ? 'VS' : p.mid}</Big></div>
      {p.footerPill && lf >= cue(cues, cues.length - 1, 90) && <Tag text={p.footerPill} style={{position: 'absolute', left: 0, right: 0, margin: '0 auto', width: 'fit-content', bottom: 180,
        ...slam(lf, cue(cues, cues.length - 1, 90))}} />}
    </AbsoluteFill>
  );
};

const Quiz: React.FC<P> = ({p, cues, dur}) => {
  const lf = useCurrentFrame();
  const reveal = cue(cues, p.revealCue, dur * 0.6);
  const r = lf >= reveal;
  const opts: string[] = p.options ?? [];
  const think = Math.max(0, Math.min(1, (lf - cue(cues, 1, 20)) / Math.max(1, reveal - cue(cues, 1, 20))));
  return (
    <Full bg={BK}>
      <Tag text="QUIZ" style={{position: 'absolute', top: 150, ...slam(lf, 0)}} />
      <Big c={WH} size={fit(p.question, 1700, 110)} style={{position: 'absolute', top: 260, ...slam(lf, 4)}}>{p.question}</Big>
      <div style={{position: 'absolute', top: 500, display: 'flex', gap: 40}}>
        {opts.map((o, i) => {
          const ok = i === p.answerIndex;
          return <div key={o} style={{padding: '30px 50px', background: r ? (ok ? AC : '#222') : WH, opacity: r && !ok ? 0.4 : 1, ...slam(lf, 10 + i * 6)}}>
            <Big c={BK} size={fit(o, 1500 / opts.length - 100, 90)}>{r && ok ? '✓ ' : ''}{o}</Big></div>;
        })}
      </div>
      {!r && <div style={{position: 'absolute', bottom: 200, left: 300, right: 300, height: 14, background: '#333'}}><div style={{width: `${think * 100}%`, height: '100%', background: AC}} /></div>}
      {r && p.afterNote && <Big c={AC} size={fit(p.afterNote, 1600, 56)} style={{position: 'absolute', bottom: 190, ...slam(lf, reveal + 10)}}>{p.afterNote}</Big>}
    </Full>
  );
};

/** 數字裡面塞滿內容：把標籤文字排成斜向重複的圖樣填進數字。
    圖樣用頁面內的 SVG pattern（不用 data URI 圖片——圖片裡的 SVG 讀不到載入的網路字型，會退回各電腦的系統字型）；
    白字數字層 × 圖樣（multiply，疊在 Full 的黑底上）＝ 只在字形裡看得到圖樣，效果同 background-clip:text。
    三層各自套 slam（外層若有 transform 會自成合成群組，multiply 就疊不到 Full 的黑底，數字外會透出圖樣）。
    圖樣層與外框層標 data-qa="ignore"：裝飾／重複的字，版面品檢只量數字本身。
    中文單位（NotoSansTC 字形有重疊輪廓，text-stroke 會描出內部線）改用輪廓膨脹－侵蝕畫外框，數字照舊 text-stroke。 */
const FillRows: React.FC<{a: string; b: string}> = ({a, b}) => <>
  <rect width={760} height={220} fill="#111" />
  {[a, b || a, a].map((s, i) => <text key={i} x={i * 60} y={60 + i * 70} fontFamily={TC} fontWeight={900} fontSize={54} fill={i === 1 ? WH : AC}>{`${s}　${s}　${s}`}</text>)}
</>;

const Stat: React.FC<P> = ({p, cues}) => {
  const lf = useCurrentFrame();
  const at = cue(cues, 0, 6);
  const v = Math.round(p.value * interpolate(lf, [at, at + 24], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)}));
  const suf = String(p.suffix ?? '');
  const txt = `${v}${suf}`;
  const id = `stat${at}`, zh = /[^ -~]/.test(suf);   // 單位含非 ASCII 字（中文）
  const fs = fit(String(p.value) + suf, 1250, 520), ext = Math.max(30, Math.round(fs * 0.2));   // 圖樣層往四周多鋪 ext：字形超出行框的部分（右：負字距、下：行高 0.85）也有圖樣；四邊等寬，slam 縮放中心才對得上
  const num: React.CSSProperties = {fontFamily: EN, fontWeight: 900, fontSize: fs, lineHeight: 0.85, letterSpacing: -20, ...slam(lf, at)};
  const layer: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'};
  return (
    <Full bg={BK}>
      <div style={{position: 'relative'}}>
        <div style={{...num, color: WH}}>{txt}</div>
        <svg data-qa="ignore" style={{position: 'absolute', left: -ext, top: -ext, width: `calc(100% + ${2 * ext}px)`, height: `calc(100% + ${2 * ext}px)`, ...slam(lf, at), mixBlendMode: 'multiply'}}>
          <defs>
            <pattern id={`${id}p`} patternUnits="userSpaceOnUse" width={760} height={220} x={ext - lf * 6} y={ext + lf * 2}><FillRows a={p.label ?? ''} b={p.sub ?? ''} /></pattern>
            <filter id={`${id}r`}>
              <feMorphology in="SourceAlpha" operator="dilate" radius={3} result="d" />
              <feMorphology in="SourceAlpha" operator="erode" radius={3} result="e" />
              <feComposite in="d" in2="e" operator="out" result="ring" />
              <feFlood floodColor={AC} />
              <feComposite in2="ring" operator="in" />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id}p)`} />
        </svg>
        <div data-qa="ignore" style={{...num, ...layer, color: 'transparent', WebkitTextStroke: `6px ${AC}`}}>
          {zh ? <>{v}<span style={{color: AC, WebkitTextStroke: '0', filter: `url(#${id}r)`}}>{suf}</span></> : txt}
        </div>
      </div>
      <Big c={WH} size={fit(p.label ?? '', 1600, 90)} style={{position: 'absolute', bottom: 210, background: BK, padding: '0 30px', ...slam(lf, at + 12)}}>{p.label}</Big>
      {p.sub && <Big c={AC} size={fit(p.sub, 1600, 44)} style={{position: 'absolute', top: 130, ...slam(lf, at + 18)}}>{p.sub}</Big>}
    </Full>
  );
};

const Recap: React.FC<P> = ({p, cues}) => {
  const lf = useCurrentFrame();
  const take: string[] = p.takeaway ?? [];
  const nAt = cue(cues, p.nextCue, 1e9);
  if (lf >= nAt && p.nextTeaser) return (
    <Full bg={AC}><Big c={BK} size={60} font={EN} style={{position: 'absolute', top: 300, letterSpacing: 14, ...slam(lf, nAt)}}>NEXT ▶</Big>
      <Big c={BK} size={fit(p.nextTeaser, 1600, 200)} style={slam(lf, nAt + 4)}>{p.nextTeaser}</Big></Full>
  );
  // 收束：NEXT 之前 6 格，所有句子往中線壓扁收成一條線
  const col = p.nextTeaser ? interpolate(lf, [nAt - 6, nAt], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)}) : 0;
  return (
    <Full bg={BK}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34 * (1 - col), transform: `scaleY(${1 - col * 0.97})`}}>
        {take.map((t, i) => {
          const at = cue(cues, p.takeCues?.[i], 20 + i * 40);
          return <Big key={t} c={i % 2 ? AC : WH} size={fit(t, 1700, 110)} style={slam(lf, at)}>{t}</Big>;
        })}
      </div>
    </Full>
  );
};

const QaEnd: React.FC<P> = ({p, dur, bf, title}) => {
  const lf = useCurrentFrame(); const {fps} = useVideoConfig();
  const ans = Math.round((p.answerSec ?? 4) * fps);
  const r = lf >= ans;
  const opts: string[] = p.options ?? [];
  // 最後一拍：全部收成一句（影片標題），停住、切黑
  const endAt = Math.max(ans + Math.round(fps * 0.8), dur - Math.round(Math.max(bf * 3, fps * 1.2)));
  if (title && lf >= endAt) {
    const col = interpolate(lf, [endAt, endAt + 5], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    return (
      <Full bg={BK}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 538, height: 4, background: AC, transform: `scaleX(${1 - col})`}} />
        <Big c={WH} size={fit(title, 1600, 170)} style={{transform: `scaleY(${col})`}}>{title}</Big>
      </Full>
    );
  }
  return (
    <Full bg={BK}>
      <Big c={WH} size={fit(p.question, 1700, 80)} style={{position: 'absolute', top: 150, ...slam(lf, 0)}}>{p.question}</Big>
      <div style={{position: 'absolute', top: 330, left: 160, right: 160, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 30}}>
        {opts.map((o, i) => {
          const ok = i === p.answerIndex;
          return <div key={o} style={{background: r ? (ok ? AC : '#222') : WH, opacity: r && !ok ? 0.4 : 1, padding: '26px 30px', ...slam(lf, 4 + i * 3)}}>
            <Big c={BK} size={fit(o, 700, 56)}>{String.fromCharCode(65 + i)}. {o}</Big></div>;
        })}
      </div>
      <div style={{position: 'absolute', bottom: 190, left: 300, right: 300, height: 14, background: '#333'}}><div style={{width: `${Math.min(1, lf / ans) * 100}%`, height: '100%', background: r ? AC : RED}} /></div>
    </Full>
  );
};

const SCENES: Record<string, React.FC<P>> = {title: Title, scenario: Scenario, definition: Definition, cards: Cards, vs: Vs, quiz: Quiz, stat: Stat, recap: Recap, qaEnd: QaEnd};

export const TemplateC: React.FC<TplSpec & {bpm?: number}> = (spec) => {
  const f = useCurrentFrame();
  const bf = (60 / (spec.bpm ?? 145)) * spec.fps;
  const title: string | undefined = spec.scenes.find((s) => s.type === 'title')?.props?.title;
  const idx = sceneIndex(spec, f);
  const cur = spec.scenes[idx];
  const flash = idx > 0 && f - cur.from < 3;
  const cap = captionAt(spec, f, 8);   // 跟 A、B、D 一樣延長 8 格（6 格時字幕會比換場早 1 格消失，最終品檢 F1）
  const fade = Math.max(0, spec.brand ? 0 : 1 - f / 4, (f - (spec.totalFrames - 16)) / 16);
  return (
    <AbsoluteFill style={{background: BK}}>
      {spec.scenes.map((s) => {
        const Comp = SCENES[s.type];
        return Comp ? <Sequence key={s.id} from={s.from} durationInFrames={s.dur}><Comp p={s.props} cues={s.cues} dur={s.dur} bf={bf} title={title} /></Sequence> : null;
      })}
      {flash && <AbsoluteFill style={{background: AC, opacity: 1 - (f - cur.from) / 3}} />}
      {cap && <div data-qa="caption" style={{position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'center'}}>
        <div style={{fontFamily: TC, fontWeight: 700, fontSize: 36, color: WH, background: 'rgba(0,0,0,0.8)', padding: '8px 28px', borderLeft: `6px solid ${AC}`, maxWidth: 1600}}>{cap.text}</div></div>}
      <BrandLogo logo={spec.brand?.logo} width={spec.brand?.logoWidth} />
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
      {spec.qa && <QaProbe w={spec.width} h={spec.height} />}
      {spec.music && <Audio src={staticFile(spec.music)} volume={spec.musicVolume ?? 0.55} />}
      {spec.voice && <Audio src={staticFile(spec.voice)} />}
      <Audio src={staticFile('tpl_sfx.wav')} />
    </AbsoluteFill>
  );
};
