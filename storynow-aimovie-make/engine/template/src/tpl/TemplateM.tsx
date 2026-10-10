/* 範本 M：手繪線稿教學（皇小米）—— 2026-10-10 照「別再手動整理5T素材」前 55 秒的手法做成範本。
   每個場景＝米白紙上的一張線稿板：字模糊淡入、線條一筆筆畫出來、物件彈出、重點打勾／打叉、震動線；換場 8 格快速疊化＋咻。
   招牌特徵（概念忠實度）：①米白紙＋黑色粗線稿＋磚紅主點綴（金黃／藏青／鼠尾草綠只在重點出現）②標題粗明體逐字模糊淡入
   ③每場右下淡金色巨大章節數字＋弧線、左上「01 標題」④固定主角＝頻道主角皇小米（金色捲毛小狗、藏青書包、紅心；沒有燈泡天線），
   每場都在、會思考／冒星星／開心／揮手／指向／驚訝 ⑤線稿圖示逐筆畫出（lib/sketches.ts）⑥程式執行場景 code：打字、高亮執行到哪一行、
   輸出一行行出現、變數盒跳動、條件成立打勾不成立打叉 ⑦白底黑框字幕。
   品檢約束：畫面內容 y<900、字 ≥32px、小字用深色、裝飾標 data-qa="ignore"、畫面字不放「，；」。
   場景語彙同範本 A～L（title／scenario／definition／cards／vs／stat／quiz／recap／qaEnd）＋範本M 專用 code，欄位見 templates/範本風格_場景語彙.md。 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {QaProbe} from '../QaProbe';
import {ACCENTS, At, Blur, C, Card, Check, Cross, DARK, Draw, HandIcon, MONO, Num, Pop, SANS, SERIF, Shake, TINTS, Win, clamp, clean, jolt, p, pop} from '../lib/hand/kit';
import {Mascot} from '../lib/hand/mascot';
import {TplSpec, captionAt, cue, textW, wrap} from './common';
import {BrandLogo} from './brand';
import {RollNum, rollProgress} from '../lib/rollnum';

export const FLOOR = 862;   // 皇小米腳底；畫面內容一律 y<900
const XF = 8;          // 換場疊化格數（硬切會被最終品檢 F11 判成畫面突跳；8 格疊化仍然俐落）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type P = {p: any; cues: number[]; dur: number; f: number};

export const lines = (raw: unknown, n: number, max: number) => {
  const s = clean(raw);
  if (!s) return [];
  const w = wrap(s, n);
  return w.length <= max ? w : wrap(s, Math.ceil(textW(s) / max) + 1).slice(0, max);
};
export const longest = (ls: string[]) => Math.max(1, ...ls.map(textW));
export const fit = (ls: string[], maxW: number, base: number, min = 34) => Math.max(min, Math.min(base, maxW / longest(ls)));
/** 播一個範本音效（tpl_sfx.py M 產生 public/sfx_m/*.wav） */
export const Sfx: React.FC<{at: number; name: string; vol?: number}> = ({at, name, vol = 0.7}) =>
  at < 0 ? null : (
    <Sequence from={at} durationInFrames={45} layout="none"><Audio src={staticFile(`sfx_m/${name}.wav`)} volume={vol} /></Sequence>
  );

/* ═════════ 9 種共用場景 ═════════ */

/** title：皇小米揮手登場；大標題逐字模糊淡入（兩行時黑紅交替）、紅色手畫底線；上方紅框小標、下方藏青副標、英文小字 */
const Title: React.FC<P> = ({p: q, cues, f}) => {
  const at = Math.max(8, Math.min(16, cue(cues, 0, 12)));
  const tl = lines(q.title, 9, 2);
  const size = fit(tl, 1100, 150, 70);
  const CX = 1180, lh = size * 1.25, top = 450 - (tl.length * lh) / 2;
  const sub = lines(q.subtitle, 16, 1), eb = lines(q.eyebrow, 14, 1), en = q.en ? String(q.en) : '';
  const lastW = textW(tl[tl.length - 1] ?? '') * size;
  return (<>
    {eb[0] && <At x={CX} y={top - 50}><div style={{opacity: p(f, 4, 8), fontFamily: SANS, fontWeight: 700, fontSize: 40, color: C.redT, border: `4px solid ${C.red}`, borderRadius: 40, padding: '2px 30px', transform: `scale(${pop(f, 4)})`}}>{eb[0]}</div></At>}
    {tl.map((t, i) => <At key={i} x={CX} y={top + lh * (i + 0.5)}><Blur text={t} f={f} at={at + i * 8} size={size} color={i % 2 ? C.redT : C.ink} stagger={2} /></At>)}
    <svg data-qa="ignore" width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      <Draw d={`M${CX - lastW / 2} ${top + tl.length * lh + 6} Q${CX} ${top + tl.length * lh + 22} ${CX + lastW / 2} ${top + tl.length * lh + 2}`} f={f} at={at + 14 + tl.length * 8} dur={14} sw={9} color={C.red} />
    </svg>
    {sub[0] && <At x={CX} y={top + tl.length * lh + 80}><Blur text={sub[0]} f={f} at={at + 26} size={fit(sub, 1000, 58)} color={C.navy} font={SANS} weight={700} /></At>}
    {en && <At x={CX} y={top + tl.length * lh + 160}><div style={{opacity: p(f, at + 34, 10), fontFamily: MONO, fontWeight: 700, fontSize: 40, letterSpacing: '0.18em', color: C.grey}}>{en}</div></At>}
    <Mascot f={f} x={380} y={FLOOR} scale={1.22} mood="wave" moodAt={4} />
  </>);
};

/** scenario：皇小米歪頭想；右邊情境卡一張張彈出（編號圓），最後一張是問題（紅框＋大紅問號＋震動線、皇小米驚訝） */
const Scenario: React.FC<P> = ({p: q, cues, f}) => {
  const pills: string[] = (q.pills ?? []).slice(0, 4);
  const lastP = q.lastIsProblem !== false && pills.length > 0;
  const at = (i: number) => cue(cues, q.cueMap?.[i], 20 + i * 30);
  const probAt = lastP ? at(pills.length - 1) : 1e9;
  const n = Math.max(1, pills.length), step = Math.min(170, 560 / n), y0 = 470 - ((n - 1) * step) / 2;
  return (<>
    <div style={{position: 'absolute', left: 470, top: 250}}><HandIcon icon={q.sketch ?? q.icon ?? 'magnifier'} f={f} at={6} size={230} tint={C.goldTint} /></div>
    {pills.map((t, i) => {
      const last = lastP && i === pills.length - 1;
      const ls = lines(t, 11, 2), size = fit(ls, 620, last ? 58 : 50);
      return (
        <Pop key={i} f={f} at={at(i)} x={1330} y={y0 + i * step} rot={last ? 0 : i % 2 ? 1.5 : -1.5}>
          <Card border={last ? C.red : C.ink} bg={last ? '#FBE9E3' : C.white} style={{display: 'flex', alignItems: 'center', gap: 22, padding: '14px 34px', transform: `translateX(${last ? jolt(f, probAt, 8) : 0}px)`}}>
            {last ? <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 80, color: C.redT, lineHeight: 1}}>？</div> : <Num n={i + 1} i={i} />}
            <div style={{fontFamily: SANS, fontWeight: 700, fontSize: size, color: last ? C.redT : C.ink, lineHeight: 1.25, whiteSpace: 'nowrap'}}>{ls.map((l, k) => <div key={k}>{l}</div>)}</div>
          </Card>
        </Pop>
      );
    })}
    {lastP && <Shake f={f} at={probAt} x={1330} y={y0 + (pills.length - 1) * step} r={140} angles={[-170, -150, -30, -10]} />}
    <Mascot f={f} x={330} y={FLOOR} scale={1.05} mood={f >= probAt ? 'oops' : 'think'} moodAt={f >= probAt ? probAt : 6} />
  </>);
};

/** definition：大字逐字淡入；重點那段念到時變磚紅＋金黃螢光筆刷過；下方補充卡片打綠勾；皇小米念到重點時冒星星 */
const Definition: React.FC<P> = ({p: q, cues, f}) => {
  const big = clean(q.bigText ?? q.title), hl = clean(q.highlight);
  const bl = lines(big, 10, 2);
  const size = fit(bl, 1240, 130, 60);
  const at0 = Math.max(6, cue(cues, q.cueMap?.[0], 6)), hlAt = cue(cues, q.cueMap?.[1], at0 + 30);
  const notes: string[] = (q.sideNotes ?? []).slice(0, 3);
  const CX = 1120, lh = size * 1.3, top = (notes.length ? 400 : 470) - (bl.length * lh) / 2;
  const k = p(f, hlAt, 14);
  const lineEl = (t: string, i: number) => {
    const j = hl ? t.indexOf(hl) : -1;
    const o = p(f, at0 + i * 8, 14);
    const base = {fontFamily: SERIF, fontWeight: 900, fontSize: size, lineHeight: 1.2, whiteSpace: 'pre' as const};
    const fx = {opacity: o, filter: o < 1 ? `blur(${(1 - o) * 14}px)` : undefined, transform: `translateY(${(1 - o) * 12}px)`};
    if (j < 0) return <div style={{...base, ...fx, color: C.ink}}>{t}</div>;
    return (
      <div style={{...base, ...fx, color: C.ink}}>
        {t.slice(0, j)}
        <span style={{color: k > 0.5 ? C.redT : C.ink, backgroundImage: `linear-gradient(transparent 58%, ${C.hl} 58%)`, backgroundSize: `${k * 100}% 100%`, backgroundRepeat: 'no-repeat'}}>{hl}</span>
        {t.slice(j + hl.length)}
      </div>
    );
  };
  const nw = notes.length ? 1300 / notes.length : 0;
  return (<>
    {bl.map((t, i) => <At key={i} x={CX} y={top + lh * (i + 0.5)}>{lineEl(t, i)}</At>)}
    {notes.map((t, i) => {
      const a = cue(cues, q.noteCues?.[i], at0 + 40 + i * 20);
      const ls = lines(t, 8, 2), ns = fit(ls, nw - 150, 46);
      return (
        <Pop key={i} f={f} at={a} x={CX - 650 + nw * (i + 0.5)} y={730} rot={i % 2 ? 1.5 : -1.5}>
          <Card style={{display: 'flex', alignItems: 'center', gap: 14, padding: '12px 28px'}}>
            <Check t={p(f, a + 4, 8)} size={52} />
            <div style={{fontFamily: SANS, fontWeight: 700, fontSize: ns, lineHeight: 1.25, whiteSpace: 'nowrap'}}>{ls.map((l, j) => <div key={j}>{l}</div>)}</div>
          </Card>
        </Pop>
      );
    })}
    <Mascot f={f} x={250} y={FLOOR} scale={1.0} mood={f >= hlAt ? 'idea' : 'idle'} moodAt={f >= hlAt ? hlAt : 0} />
  </>);
};

/** cards：2～4 欄，每欄一個淡彩圓裡的線稿圖示逐筆畫出、編號標題、灰色說明；footer 藏青膠囊；皇小米在左邊 */
const Cards: React.FC<P> = ({p: q, cues, f}) => {
  const cards: {icon?: string; sketch?: string; title?: string; note?: string}[] = (q.cards ?? []).slice(0, 4);
  const n = Math.max(1, cards.length), X0 = 460, W = 1420, slot = W / n;
  const at = (i: number) => cue(cues, q.cueMap?.[i], 20 + i * 30);
  const lastAt = cards.length ? at(cards.length - 1) : 20;
  const footAt = Math.max(lastAt + 16, cue(cues, cues.length - 1, lastAt + 16));
  const footer = lines(q.footer, 18, 1);
  const isz = Math.min(230, slot * 0.6);
  return (<>
    {cards.map((c, i) => {
      const cx = X0 + slot * (i + 0.5), a = at(i);
      const tl = lines(c.title, 8, 1), ts = fit(tl, slot - 110, 50);
      const nl = lines(c.note, 9, 2), ns = fit(nl, slot - 40, 36);
      return (
        <React.Fragment key={i}>
          {f >= a && <div style={{position: 'absolute', left: cx - isz / 2, top: 360 - isz / 2, transform: `scale(${0.9 + 0.1 * pop(f, a)})`}}><HandIcon icon={c.sketch ?? c.icon} f={f} at={a} size={isz} tint={TINTS[i % 4]} color={C.ink} /></div>}
          {tl[0] && f >= a + 6 && (
            <At x={cx} y={560}><div style={{display: 'flex', alignItems: 'center', gap: 14, opacity: p(f, a + 6, 8)}}><Num n={i + 1} i={i} d={58} /><Blur text={tl[0]} f={f} at={a + 6} size={ts} /></div></At>
          )}
          {nl.length > 0 && <At x={cx} y={660}><div style={{opacity: p(f, a + 12, 8), fontFamily: SANS, fontWeight: 700, fontSize: ns, color: C.grey, textAlign: 'center', lineHeight: 1.3, whiteSpace: 'nowrap'}}>{nl.map((l, j) => <div key={j}>{l}</div>)}</div></At>}
        </React.Fragment>
      );
    })}
    {footer[0] && <At x={X0 + W / 2} y={790}><div style={{transform: `scale(${pop(f, footAt)})`, background: C.navy, color: C.white, fontFamily: SANS, fontWeight: 700, fontSize: fit(footer, 1100, 46), padding: '8px 36px', borderRadius: 40, border: `4px solid ${C.ink}`, whiteSpace: 'nowrap'}}>{footer[0]}</div></At>}
    <Mascot f={f} x={220} y={FLOOR} scale={0.95} mood={f >= footAt ? 'happy' : 'point'} moodAt={f >= footAt ? footAt : 6} />
  </>);
};

type Side = {frame?: string; icon?: string; sketch?: string; text?: string};
/** vs：左右兩張線稿卡；danger 變淡＋紅叉、success 綠框＋綠勾＋星星；中間紅色 VS；皇小米在中間下方左右看 */
const Vs: React.FC<P> = ({p: q, cues, f}) => {
  const at1 = cue(cues, q.cueMap?.[1], 40);
  const side = (sd: Side | undefined, i: number) => {
    const d = sd ?? {}, a = cue(cues, q.cueMap?.[i], i ? 40 : 6);
    const bad = d.frame === 'danger', good = d.frame === 'success';
    const cx = i ? 1430 : 490, ls = lines(d.text, 9, 2), ts = fit(ls, 520, 54);
    const g = bad ? p(f, a + 14, 12) : 0;
    if (f < a) return null;
    return (
      <div key={i} style={{position: 'absolute', left: cx - 300, top: 240, width: 600, height: 470, transform: `scale(${pop(f, a)})`}}>
        <Card border={good ? C.sage : C.ink} bg={good ? C.sageTint : C.white} style={{position: 'absolute', inset: 0}}>
          <div style={{position: 'absolute', left: 175, top: 30, opacity: 1 - 0.55 * g}}><HandIcon icon={d.sketch ?? d.icon} f={f} at={a + 2} size={250} /></div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', fontFamily: SANS, fontWeight: 700, fontSize: ts, lineHeight: 1.25, color: bad ? C.grey : good ? C.sageT : C.ink}}>{ls.map((l, j) => <div key={j}>{l}</div>)}</div>
        </Card>
        <div style={{position: 'absolute', right: -30, top: -30}}>{bad ? <Cross t={p(f, a + 14, 10)} size={110} /> : good ? <Check t={p(f, a + 14, 10)} size={110} /> : null}</div>
      </div>
    );
  };
  const mid = !q.mid || String(q.mid).toLowerCase() === 'vs' ? 'VS' : String(q.mid);
  const fp = lines(q.footerPill, 16, 1);
  const footAt = Math.max(at1 + 16, cue(cues, cues.length - 1, at1 + 30) + 6);
  return (<>
    {side(q.left, 0)}
    {side(q.right, 1)}
    <At x={960} y={420}><div style={{transform: `scale(${pop(f, at1 - 4)})`, fontFamily: SERIF, fontWeight: 900, fontSize: 110, color: C.redT}}>{mid}</div></At>
    {fp[0] && <At x={960} y={175}><div style={{transform: `scale(${pop(f, footAt)})`, background: C.red, color: C.white, fontFamily: SANS, fontWeight: 700, fontSize: fit(fp, 1000, 46), padding: '8px 36px', borderRadius: 40, border: `4px solid ${C.ink}`, whiteSpace: 'nowrap'}}>{fp[0]}</div></At>}
    <Mascot f={f} x={960} y={FLOOR} scale={0.62} mood={f >= footAt ? 'happy' : f >= at1 ? 'point' : 'think'} moodAt={f >= footAt ? footAt : 6} flip={f < at1} />
  </>);
};

/** stat：巨大紅色數字往上數（落地震動線）、上方藏青說明、下方補充；皇小米驚訝→開心 */
const Stat: React.FC<P> = ({p: q, cues, f}) => {
  const at = Math.max(8, cue(cues, 0, 8));
  const raw = String(q.value ?? ''), suf = clean(q.suffix);
  const num = parseFloat(raw.replace(/,/g, ''));
  const units = raw.length * 0.6 + textW(suf) * 0.45;
  const size = Math.min(320, 1000 / Math.max(1, units));
  const label = lines(q.label, 12, 1), sub = lines(q.sub, 16, 1);
  const subAt = Math.max(at + 40, cue(cues, 1, at + 40));
  return (<>
    {label[0] && <At x={820} y={250}><div style={{opacity: p(f, at - 6, 8), background: C.navyTint, border: `4px solid ${C.navy}`, color: C.navy, fontFamily: SANS, fontWeight: 700, fontSize: fit(label, 900, 52), padding: '6px 34px', borderRadius: 40, whiteSpace: 'nowrap'}}>{label[0]}</div></At>}
    <At x={820} y={490}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: size * 0.08, transform: `scale(${1 + 0.18 * (1 - p(f, at, 10))}) translateY(${jolt(f, at + 30, 6)}px)`, opacity: p(f, at, 6), whiteSpace: 'nowrap'}}>
        <span style={{fontFamily: SERIF, fontWeight: 900, fontSize: size, color: C.redT, lineHeight: 1, display: 'inline-block'}}>
          {/* 滾輪式往上數（每一位連續滾動）：整數一跳一跳換字會被 F11 判成畫面突跳，2026-10-10 */}
          {Number.isFinite(num) ? <RollNum text={raw} p={rollProgress(f, at + 4, 34)} digitW={0.62} /> : raw}
        </span>
        {suf && <span style={{fontFamily: SANS, fontWeight: 700, fontSize: Math.max(48, size * 0.36), color: C.ink}}>{suf}</span>}
      </div>
    </At>
    <Shake f={f} at={at + 30} x={820} y={490} r={size * 0.9} angles={[-160, -140, -40, -20]} />
    {sub[0] && <At x={820} y={720}><Blur text={sub[0]} f={f} at={subAt} size={fit(sub, 1000, 46)} font={SANS} weight={700} color={C.grey} /></At>}
    <Mascot f={f} x={1560} y={FLOOR} scale={1.05} mood={f >= at + 40 ? 'happy' : 'oops'} moodAt={f >= at + 40 ? at + 40 : at} />
  </>);
};

/** quiz：上方題目卡（Q 圓），選項按鈕排一列；揭曉時正確的變綠＋打勾、其他變淡；皇小米想→開心 */
const Quiz: React.FC<P> = ({p: q, cues, dur, f}) => {
  const opts: string[] = (q.options ?? []).slice(0, 4);
  const reveal = cue(cues, q.revealCue, Math.round(dur * 0.6));
  const ans = Number(q.answerIndex ?? 0);
  const ql = lines(q.question, 16, 2), qs = fit(ql, 1180, 54);
  const slot = 1320 / Math.max(1, opts.length), bw = Math.min(400, slot - 40);
  const optAt = Math.max(18, cue(cues, 1, 20));
  const after = lines(q.afterNote, 18, 1);
  const k = p(f, reveal, 10);
  return (<>
    <Pop f={f} at={6} x={1150} y={250}>
      <Card style={{display: 'flex', alignItems: 'center', gap: 20, padding: '16px 36px'}}><Num n="Q" i={3} d={70} /><div style={{fontFamily: SANS, fontWeight: 700, fontSize: qs, lineHeight: 1.25, whiteSpace: 'nowrap'}}>{ql.map((l, j) => <div key={j}>{l}</div>)}</div></Card>
    </Pop>
    {opts.map((o, i) => {
      const ok = i === ans, ls = lines(o, 6, 2), ts = fit(ls, bw - 130, 46);
      return (
        <Pop key={i} f={f} at={optAt + i * 8} x={520 + slot * (i + 0.5)} y={540}>
          <div style={{opacity: ok ? 1 : 1 - 0.55 * k, transform: `translateY(${ok ? -14 * pop(f, reveal) : 0}px)`}}>
            <Card bg={ok && k > 0.5 ? C.sageTint : C.white} border={ok && k > 0.5 ? C.sage : C.ink} style={{width: bw, display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', boxSizing: 'border-box'}}>
              <Num n={String.fromCharCode(65 + i)} i={i} d={60} />
              <div style={{fontFamily: SANS, fontWeight: 700, fontSize: ts, lineHeight: 1.25, flex: 1, textAlign: 'center', whiteSpace: 'nowrap'}}>{ls.map((l, j) => <div key={j}>{l}</div>)}</div>
            </Card>
          </div>
        </Pop>
      );
    })}
    {opts.length > 0 && f >= reveal && <div style={{position: 'absolute', left: 520 + slot * (ans + 0.5) + bw / 2 - 50, top: 420}}><Check t={p(f, reveal + 4, 10)} size={100} /></div>}
    {after[0] && <At x={1180} y={740}><div style={{transform: `scale(${pop(f, reveal + 16)})`, background: C.sageTint, color: C.sageT, fontFamily: SANS, fontWeight: 700, fontSize: fit(after, 1100, 44), padding: '8px 34px', borderRadius: 40, border: `5px solid ${C.sage}`, whiteSpace: 'nowrap'}}>{after[0]}</div></At>}
    <Mascot f={f} x={250} y={FLOOR} scale={1.0} mood={f >= reveal ? 'happy' : 'think'} moodAt={f >= reveal ? reveal : 6} />
    <Sfx at={reveal} name="ding" />
  </>);
};

/** recap：線稿清單板逐項畫勾；右邊 NEXT 預告；皇小米揮手 */
const Recap: React.FC<P> = ({p: q, cues, f}) => {
  const take: string[] = (q.takeaway ?? []).slice(0, 3);
  const nextAt = cue(cues, q.nextCue, 120);
  const teaser = lines(q.nextTeaser, 7, 2);
  const BX = 470, BW = 960, rowH = 140, BY = 450 - ((take.length || 1) * rowH) / 2 - 40;
  const tAt = (i: number) => Math.max(12, cue(cues, q.takeCues?.[i], 20 + i * 40));
  const ts = Math.min(52, ...take.map((t) => (BW - 200) / longest(lines(t, 15, 1))));
  return (<>
    <div style={{position: 'absolute', left: BX, top: BY, width: BW, height: (take.length || 1) * rowH + 80, opacity: p(f, 2, 8)}}>
      <Card style={{position: 'absolute', inset: 0}}>
        {take.map((t, i) => (
          <div key={i} style={{position: 'absolute', left: 40, right: 40, top: 40 + i * rowH, height: rowH - 20, display: 'flex', alignItems: 'center', gap: 30, borderBottom: i < take.length - 1 ? `3px dashed ${C.mute}` : 'none'}}>
            <div style={{width: 74, height: 74, border: `5px solid ${C.ink}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}><Check t={p(f, tAt(i) + 4, 10)} size={60} /></div>
            <Blur text={lines(t, 15, 1)[0] ?? ''} f={f} at={tAt(i)} size={ts} font={SANS} weight={700} />
          </div>
        ))}
      </Card>
    </div>
    {teaser.length > 0 && f >= nextAt && (
      <div style={{position: 'absolute', left: 1500, top: 300, width: 360, transform: `scale(${pop(f, nextAt)})`}}>
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 64, color: C.redT, letterSpacing: '0.1em'}}>NEXT</div>
        <Card bg={C.navy} style={{marginTop: 12, padding: '14px 26px', color: C.white, fontFamily: SANS, fontWeight: 700, fontSize: fit(teaser, 300, 46), lineHeight: 1.3}}>{teaser.map((l, j) => <div key={j}>{l}</div>)}</Card>
      </div>
    )}
    <Mascot f={f} x={250} y={FLOOR} scale={1.0} mood={teaser.length && f >= nextAt ? 'wave' : 'happy'} moodAt={teaser.length && f >= nextAt ? nextAt : 6} />
    {take.map((_, i) => <Sfx key={i} at={tAt(i) + 4} name="tick" />)}
  </>);
};

/** qaEnd：題目卡＋2×2 選項；answerSec 揭曉 */
const QaEnd: React.FC<P> = ({p: q, f}) => {
  const opts: string[] = (q.options ?? []).slice(0, 4);
  const ans = Math.round((q.answerSec ?? 4) * 30), right = Number(q.answerIndex ?? 0);
  const ql = lines(q.question, 18, 2), qs = fit(ql, 1240, 54);
  const k = p(f, ans, 10);
  return (<>
    <Pop f={f} at={4} x={1120} y={220}><Card style={{display: 'flex', alignItems: 'center', gap: 20, padding: '16px 36px'}}><Num n="Q" i={3} d={70} /><div style={{fontFamily: SANS, fontWeight: 700, fontSize: qs, lineHeight: 1.25, whiteSpace: 'nowrap'}}>{ql.map((l, j) => <div key={j}>{l}</div>)}</div></Card></Pop>
    {opts.map((o, i) => {
      const ok = i === right, ls = lines(o, 9, 1), ts = fit(ls, 470, 46);
      return (
        <Pop key={i} f={f} at={10 + i * 6} x={780 + (i % 2) * 640} y={440 + Math.floor(i / 2) * 190}>
          <div style={{opacity: ok ? 1 : 1 - 0.55 * k}}>
            <Card bg={ok && k > 0.5 ? C.sageTint : C.white} border={ok && k > 0.5 ? C.sage : C.ink} style={{width: 580, display: 'flex', alignItems: 'center', gap: 18, padding: '18px 24px', boxSizing: 'border-box'}}>
              <Num n={String.fromCharCode(65 + i)} i={i} d={60} /><div style={{fontFamily: SANS, fontWeight: 700, fontSize: ts, whiteSpace: 'nowrap'}}>{ls[0]}</div>
              {ok && <div style={{marginLeft: 'auto'}}><Check t={p(f, ans + 4, 10)} size={70} /></div>}
            </Card>
          </div>
        </Pop>
      );
    })}
    <Mascot f={f} x={220} y={FLOOR} scale={0.95} mood={f >= ans ? 'happy' : 'think'} moodAt={f >= ans ? ans : 6} />
    <Sfx at={ans} name="ding" />
  </>);
};

/* ═════════ 範本M 專用：code 程式執行 ═════════
   props：file（檔名）、code[]（每行程式）、steps[]：{line 高亮第幾行（0 起算）, out? 這步印出的字, vars? {變數: 值}, ok? true 打勾／false 打叉, cue? 第幾句旁白開始}、
   typeCue（第幾句開始打字，預設 0）、outTitle（輸出視窗標題，預設「輸出」）。
   沒寫 cue 的步驟平均分配在前後兩個有 cue 的步驟之間；同一句 cue 的多個步驟平均分配在那一句裡。 */
const KW = /^(for|in|while|print|range|if|elif|else|def|return|True|False|and|or|not|import|from|int|input|len|break|continue)\b/;
const tokens = (s: string) => {
  const out: {t: string; c: string; b?: boolean}[] = [];
  let r = s;
  while (r.length) {
    let m: RegExpMatchArray | null;
    if ((m = r.match(KW))) out.push({t: m[0], c: C.redT, b: true});
    else if ((m = r.match(/^("[^"]*"?|'[^']*'?)/))) out.push({t: m[0], c: C.navy});
    else if ((m = r.match(/^#.*/))) out.push({t: m[0], c: C.grey});
    else if ((m = r.match(/^\d+(\.\d+)?/))) out.push({t: m[0], c: C.goldT, b: true});
    else if ((m = r.match(/^[A-Za-z_]\w*/))) out.push({t: m[0], c: C.ink});
    else { m = [r[0]] as unknown as RegExpMatchArray; out.push({t: r[0], c: C.ink}); }
    r = r.slice(m[0].length);
  }
  return out;
};
type Step = {line?: number; out?: string; vars?: Record<string, string | number>; ok?: boolean; cue?: number};
const stepTimes = (steps: Step[], cues: number[], start: number, end: number) => {
  const t: (number | null)[] = steps.map(() => null);
  let i = 0;
  while (i < steps.length) {
    const c = steps[i].cue;
    if (c === undefined || c === null || cues[c] === undefined) { i++; continue; }
    let j = i;
    while (j + 1 < steps.length && steps[j + 1].cue === c) j++;
    const a = Math.max(start, cues[c]), b = Math.max(a + 10, cues[c + 1] ?? end);
    for (let k = i; k <= j; k++) t[k] = Math.round(a + ((b - a) * (k - i)) / (j - i + 1));
    i = j + 1;
  }
  for (let k = 0; k < t.length; k++) {
    if (t[k] !== null) continue;
    let a = k - 1; while (a >= 0 && t[a] === null) a--;
    let b = k + 1; while (b < t.length && t[b] === null) b++;
    const ta = a >= 0 ? (t[a] as number) : start, tb = b < t.length ? (t[b] as number) : end;
    const ia = a, ib = b < t.length ? b : t.length;
    t[k] = Math.round(ta + ((tb - ta) * (k - ia)) / (ib - ia));
  }
  return t as number[];
};
const Code: React.FC<P> = ({p: q, cues, dur, f}) => {
  const code: string[] = (q.code ?? []).map((s: unknown) => String(s));
  const steps: Step[] = q.steps ?? [];
  const tStart = cue(cues, q.typeCue ?? 0, 6);
  const chars = code.join('').length;
  const speed = Math.max(1.5, chars / 40);           // 40 格內打完
  const typed = (f - tStart) * speed;
  const typedEnd = Math.round(tStart + chars / speed);
  const times = stepTimes(steps, cues, typedEnd + 8, dur - 24);
  const k = times.filter((t) => f >= t).length - 1;
  const cur = k >= 0 ? steps[k] : undefined;
  const outs = steps.map((s, i) => ({t: s.out, at: times[i]})).filter((o) => o.t !== undefined && o.t !== null && f >= o.at);
  const vars: Record<string, string | number> = {};
  steps.slice(0, k + 1).forEach((s) => Object.assign(vars, s.vars ?? {}));
  const varAt: Record<string, number> = {};
  steps.forEach((s, i) => { if (i <= k) Object.keys(s.vars ?? {}).forEach((v) => (varAt[v] = times[i])); });
  // 版面：編輯器字級依行數與最長一行決定
  const EW = 1060, EH = 730;
  const maxLen = Math.max(8, ...code.map((s) => s.length));
  const rowH = Math.min(78, (EH - 110) / Math.max(1, code.length));
  const size = Math.max(32, Math.min(rowH / 1.55, (EW - 190) / (maxLen * 0.62)));
  let left = typed;
  const outShown = outs.slice(-6);
  const okMark = cur && cur.ok !== undefined ? cur.ok : undefined;
  // 高亮條 4 格內滑到這一步的行（瞬間跳行會被最終品檢 F11 判成畫面突跳，2026-10-10）
  const prevLine = k > 0 ? steps[k - 1].line ?? 0 : cur?.line ?? 0;
  const hlLine = cur ? interpolate(f, [times[k], times[k] + 4], [prevLine, cur.line ?? 0], {...clamp, easing: (x) => 1 - (1 - x) ** 2}) : 0;
  const okAt = k >= 0 ? times[k] : 0;
  const varKeys = Object.keys(vars).slice(0, 3);
  // 輸出視窗高度從頭到尾固定（有變數就一開始預留變數盒的位置；中途縮短會被 F11 判成畫面突跳）
  const hasVars = steps.some((s) => s.vars && Object.keys(s.vars).length > 0);
  const varFirst = (v: string) => times[steps.findIndex((s) => s.vars && v in s.vars)] ?? 0;
  return (<>
    <Win x={70} y={110} w={EW} h={EH} title={String(q.file ?? 'main.py')}>
      <div style={{position: 'relative', padding: '22px 0', fontFamily: MONO, fontSize: size, fontWeight: 500}}>
        {cur && cur.line !== undefined && cur.line >= 0 && (
          <div style={{position: 'absolute', left: 0, right: 0, top: 22 + hlLine * rowH, height: rowH, opacity: p(f, times[0], 4), background: okMark === false ? 'rgba(196,85,58,0.18)' : C.hl, borderLeft: `9px solid ${okMark === false ? C.red : C.gold}`}} />
        )}
        {code.map((ln, i) => {
          const show = Math.max(0, Math.min(ln.length, left));
          const caret = f < typedEnd && left >= 0 && left <= ln.length;
          left -= ln.length;
          let used = 0;
          return (
            <div key={i} style={{position: 'relative', height: rowH, lineHeight: `${rowH}px`, display: 'flex', whiteSpace: 'pre'}}>
              <span data-qa="ignore" style={{width: size * 2.2, textAlign: 'right', paddingRight: size * 0.7, color: C.mute, flexShrink: 0}}>{i + 1}</span>
              <span>
                {tokens(ln).map((tk, j) => {
                  const vis = Math.max(0, Math.min(tk.t.length, show - used));
                  used += tk.t.length;
                  return vis > 0 ? <span key={j} style={{color: tk.c, fontWeight: tk.b ? 700 : 500}}>{tk.t.slice(0, vis)}</span> : null;
                })}
                {caret && Math.floor(f / 8) % 2 === 0 && <span style={{display: 'inline-block', width: 4, height: size * 1.1, background: C.ink, verticalAlign: 'middle'}} />}
              </span>
              {cur && cur.line === i && okMark !== undefined && (
                <span style={{position: 'absolute', right: 26, top: (rowH - 64) / 2}}>{okMark ? <Check t={p(f, okAt, 8)} size={64} /> : <Cross t={p(f, okAt, 8)} size={64} />}</span>
              )}
            </div>
          );
        })}
      </div>
    </Win>
    <Win x={1190} y={110} w={660} h={hasVars ? 430 : 560} title={clean(q.outTitle) || '輸出'}>
      <div style={{padding: '18px 30px', fontFamily: MONO, fontSize: 42, lineHeight: '62px'}}>
        {outShown.map((o, i) => (
          <div key={i} style={{display: 'flex', gap: 18, opacity: p(f, o.at, 5), whiteSpace: 'nowrap'}}><span data-qa="ignore" style={{color: C.mute}}>&gt;</span><span style={{color: C.navy, fontWeight: 700}}>{String(o.t)}</span></div>
        ))}
      </div>
    </Win>
    {varKeys.length > 0 && (
      <div style={{position: 'absolute', left: 1190, top: 590, display: 'flex', gap: 22}}>
        {varKeys.map((v) => (
          <Card key={v} style={{minWidth: 150, padding: '6px 22px 10px', textAlign: 'center', opacity: p(f, varFirst(v), 6), transform: `scale(${0.9 + 0.1 * p(f, varFirst(v), 6)})`}}>
            <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 34, color: C.grey}}>{v}</div>
            <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 86, lineHeight: 1.05, color: C.redT, transform: `scale(${1 + 0.25 * (1 - p(f, varAt[v] ?? 0, 8))})`, whiteSpace: 'nowrap'}}>{String(vars[v])}</div>
          </Card>
        ))}
      </div>
    )}
    <Mascot f={f} x={1730} y={FLOOR} scale={0.6} mood={okMark === true ? 'happy' : okMark === false ? 'oops' : k >= 0 ? 'point' : 'think'} moodAt={k >= 0 ? okAt : 6} flip={okMark === undefined && k >= 0} />
    {Array.from({length: Math.ceil(chars / 3)}, (_, i) => <Sfx key={`t${i}`} at={Math.round(tStart + (i * 3) / speed)} name="type" vol={0.4} />)}
    {times.map((t, i) => <Sfx key={`s${i}`} at={t} name={steps[i].ok === true ? 'ding' : steps[i].ok === false ? 'buzz' : 'tick'} vol={steps[i].ok === undefined ? 0.6 : 0.5} />)}
  </>);
};

/** 範本M 的 10 種場景（範本N 行前通知沿用，再加自己的場景） */
export const HAND_SCENES: Record<string, React.FC<P>> = {title: Title, scenario: Scenario, definition: Definition, cards: Cards, vs: Vs, stat: Stat, quiz: Quiz, recap: Recap, qaEnd: QaEnd, code: Code};

/** 左上章節標籤文字 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handLabel = (type: string, q: any): string => {
  const pick = (v: unknown, fb: string) => (v ? lines(v, 12, 1)[0] ?? fb : fb);
  switch (type) {
    case 'scenario': return pick(q.heading, '想一想');
    case 'definition': return pick(q.label ?? q.heading, '關鍵觀念');
    case 'cards': return pick(q.heading, '重點整理');
    case 'vs': return pick(q.heading, '比一比');
    case 'stat': return pick(q.heading, '關鍵數字');
    case 'quiz': return '小測驗';
    case 'recap': return '重點回顧';
    case 'qaEnd': return '最後測驗';
    case 'code': return pick(q.heading, '跑跑看');
    default: return '';
  }
};

/** 一頁：紙底（程式／卡片類加淡格線）、右下淡金色巨大章節數字＋弧線、左上「01 標題」；鏡頭慢慢推近 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Kit = {scenes: Record<string, React.FC<P>>; label: (type: string, q: any) => string; grid: string[]};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Page: React.FC<{s: any; n?: number; first?: boolean; kit: Kit}> = ({s, n, first, kit}) => {
  const f = useCurrentFrame();
  const fadeIn = first ? 1 : p(f, 0, XF);
  const Comp = kit.scenes[s.type] ?? Definition;
  const label = kit.label(s.type, s.props ?? {});
  const grid = kit.grid.includes(s.type);
  const z = 1 + 0.025 * interpolate(f, [0, s.dur], [0, 1], clamp);
  return (
    <AbsoluteFill data-qa={fadeIn < 1 ? 'ignore' : undefined} style={{background: grid ? '#FBFAF7' : C.paper, overflow: 'hidden', opacity: fadeIn}}>
      {grid && <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(0,0,0,0.045) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(0,0,0,0.045) 1.5px, transparent 1.5px)', backgroundSize: '64px 64px'}} />}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(120,100,70,0.10) 100%)'}} />
      {n !== undefined && (
        <div data-qa="ignore" style={{position: 'absolute', inset: 0, opacity: 0.55 * p(f, 0, 10)}}>
          <svg width={1920} height={1080} style={{position: 'absolute'}}>
            <circle cx={1720} cy={700} r={380} fill="none" stroke={C.faint} strokeWidth={30} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - 0.6 * p(f, 0, 22)} transform="rotate(160 1720 700)" />
          </svg>
          <div style={{position: 'absolute', left: 1500, top: 300, fontFamily: SERIF, fontWeight: 900, fontSize: 760, lineHeight: 1, color: C.faint}}>{n}</div>
        </div>
      )}
      <div style={{position: 'absolute', inset: 0, transform: `scale(${z})`, transformOrigin: '960px 560px'}}>
        <Comp p={s.props ?? {}} cues={s.cues ?? []} dur={s.dur} f={f} />
      </div>
      {label && n !== undefined && (
        <div style={{position: 'absolute', left: 60, top: 34, display: 'flex', alignItems: 'baseline', gap: 16}}>
          <Blur text={String(n).padStart(2, '0')} f={f} at={2} size={56} color={C.redT} />
          <Blur text={label} f={f} at={6} size={40} font={SANS} weight={700} />
        </div>
      )}
    </AbsoluteFill>
  );
};

/** 手繪線稿範本產生器（2026-10-10）：範本M＝HAND_SCENES；範本N 行前通知＝HAND_SCENES＋自己的場景。
   頁面外框（紙底、章節大數字、字幕、換場疊化、咻、品檢探針、配樂旁白）兩個範本完全共用。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeHandTemplate = (scenes: Record<string, React.FC<P>>, label: (type: string, q: any) => string, grid: string[]): React.FC<TplSpec> => {
  const kit: Kit = {scenes, label, grid};
  const Tpl: React.FC<TplSpec> = (spec) => {
  const f = useCurrentFrame();
  const cap = captionAt(spec, f, 8);
  const capPrev = cap ? spec.captions[spec.captions.indexOf(cap) - 1] : undefined;
  const capO = !cap ? 0 : capPrev && cap.from - capPrev.to <= 10 ? 1 : interpolate(f, [cap.from - 2, cap.from + 3], [0, 1], clamp);
  const capS = cap ? Math.max(34, Math.min(46, 1600 / Math.max(1, textW(cap.text)))) : 46;
  const fade = Math.max(0, spec.brand ? 0 : 1 - f / 8, (f - (spec.totalFrames - 12)) / 12);
  let k = 0;
  const nums = spec.scenes.map((s) => (s.type === 'title' ? undefined : ++k));
  return (
    <AbsoluteFill style={{backgroundColor: C.paper, overflow: 'hidden'}}>
      {spec.scenes.map((s, i) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur + (i < spec.scenes.length - 1 ? XF : 0)}>
          <Page s={s} n={nums[i]} first={i === 0} kit={kit} />
        </Sequence>
      ))}
      {spec.scenes.slice(1).map((s) => <Sfx key={`w${s.id}`} at={s.from} name="whoosh" vol={0.45} />)}
      {/* 字幕帶：紙色漸層底（y 900 以下）＋白底黑框字幕 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 900, bottom: 0, background: 'linear-gradient(to bottom, rgba(245,241,232,0) 0px, rgba(245,241,232,0.95) 40px, rgba(245,241,232,1) 100%)'}} />
      {cap && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 958, display: 'flex', justifyContent: 'center', opacity: capO}}>
          <div data-qa="caption" style={{fontFamily: SANS, fontWeight: 700, fontSize: capS, color: C.ink, whiteSpace: 'nowrap', lineHeight: 1.3, background: C.white, border: `4px solid ${C.ink}`,
            padding: `${Math.round(capS * 0.18)}px ${Math.round(capS * 0.7)}px`, borderRadius: Math.round(capS * 0.35), boxShadow: `5px 5px 0 ${C.ink}`}}>{cap.text}</div>
        </div>
      )}
      <BrandLogo logo={spec.brand?.logo} width={spec.brand?.logoWidth} />
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
      {spec.qa && <QaProbe w={spec.width} h={spec.height} />}
      {spec.music && <Audio src={staticFile(spec.music)} volume={spec.musicVolume ?? 0.4} />}
      {spec.voice && <Audio src={staticFile(spec.voice)} />}
      <Audio src={staticFile('tpl_sfx.wav')} />
    </AbsoluteFill>
  );
  };
  return Tpl;
};

export const TemplateM = makeHandTemplate(HAND_SCENES, handLabel, ['code', 'cards', 'quiz', 'qaEnd']);
void ACCENTS; void DARK;
