/* 範本 I：漫畫風 Comic —— 每個場景＝一頁漫畫：白紙頁面上，粗黑框分格依旁白「啪」地出現；換場景＝翻頁（舊頁往左滑走、微旋轉）。
   招牌特徵（概念忠實度）：①粗黑框分格逐格出現 ②網點／集中線／速度線三種格子底 ③對話框＋旁白框＋黑邊黃字擬聲字
   ④漫畫小人（表情、手勢）⑤黑白＋唯一強調色黃 #ffd23f（只有測驗揭曉用紅圈）⑥白字黑邊字幕＋畫面下緣深色漸層底。
   品檢約束：集中線靜止（不隨時間換形）、翻頁 18 格平滑滑動（不做黑白反轉）、畫面內容一律 y<900、隨機一律 random(seed)。
   場景語彙同範本 A～D（title／scenario／definition／cards／vs／stat／quiz／recap／qaEnd），欄位見 templates/範本風格_場景語彙.md。 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {QaProbe} from '../QaProbe';
import {Bubble, Check, Defs, EN, INK, Kid, Num, Panel, RedCircle, Sfx, TC, Txt, Y, clamp, fitLines, pr} from '../lib/comic/kit';
import {ComicIcon} from '../lib/comic/icons';
import {TplSpec, captionAt, cue, textW, wrap} from './common';
import {RollNum, rollProgress} from '../lib/rollnum';
import {BrandLogo} from './brand';

/* 頁面：1840×866，放在畫面 (40,24)～(1880,890)；格子區＝頁內 (24,24)～(1816,842) */
const PAGE = {x: 40, y: 24, w: 1840, h: 866};
const M = 24, G = 20, IW = PAGE.w - M * 2, IH = PAGE.h - M * 2;
const FLIP = 18;   // 翻頁格數
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = {p: any; cues: number[]; dur: number};

const isAscii = (s: string) => /^[\u0000-ÿ]*$/.test(s);
const LETTER = (i: number) => String.fromCharCode(65 + i);

/** 物件文字分行：畫面上不放「，；」、不以「。」結尾（品檢「物件標點」）——逗號處優先斷行，放得下一行時改成全形空白 */
const lines = (raw: unknown, n: number, max: number): string[] => {
  const s = String(raw ?? '').trim().replace(/[。]+$/, '');
  const segs = s.split(/[，；]/).map((x) => x.trim()).filter(Boolean);
  if (!segs.length) return [];
  const joined = segs.join('　');
  if (textW(joined) <= n) return [joined];
  const out = segs.flatMap((x) => wrap(x, n));
  return out.length <= max ? out : wrap(joined, n).slice(0, max);
};
/** 一行放得下且字級 ≥ minOne 就用一行，否則對半分兩行（窄格子用） */
const smart = (raw: unknown, maxW: number, base: number, minOne = 56): string[] => {
  const one = lines(raw, 99, 1);
  if (!one.length || fitLines(one, maxW, base) >= minOne) return one;
  const two = lines(raw, Math.ceil(textW(one[0]) / 2), 2);
  return fitLines(two, maxW, base) > fitLines(one, maxW, base) ? two : one;
};

/** 黑底黃字的編號方塊（1、2、3 或 A、B、C） */
const Badge: React.FC<{at: number; x: number; y: number; size?: number; text: string}> = ({at, x, y, size = 70, text}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const k = interpolate(f, [at, at + 6], [0.4, 1], clamp);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: size, height: size, background: INK, transform: `scale(${k}) rotate(-4deg)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: EN, fontSize: size * 0.72, color: Y, lineHeight: 1}}>{text}</div>
  );
};

/* ───────── 9 種場景（座標＝頁內，格子內 children 以格子內左上為原點） ───────── */

/** title：左格小人登場＋對話框，右上集中線大標題，右下速度線副標 */
const Title: React.FC<P> = ({p, cues}) => {
  const a = 4, b = Math.max(10, cue(cues, 0, 10));
  const title = String(p.title ?? '');
  const tl = lines(title, 9, 2);
  const ts = fitLines(tl, 1020, 150, 56);
  const sub: string = p.subtitle ?? '';
  const en: string = p.en ?? '';
  const eyebrow = p.eyebrow ? String(p.eyebrow) : '';
  const bub = eyebrow ? lines(eyebrow, 6, 2) : ['嗨！'];
  const bs = fitLines(bub, 300, 56, 30);
  return (<>
    <Panel at={a} x={M} y={M} w={600} h={IH} bg="ht" seed="ti-a">
      <Kid at={a + 6} x={130} y={330} h={450} expr="grin" pose="wave" />
      <Bubble at={a + 14} x={40} y={50} w={440} h={210} size={bs} tail={[250, 320]} lines={bub} />
    </Panel>
    <Panel at={b} x={M + 600 + G} y={M} w={IW - 600 - G} h={560} bg="focus" seed="ti-b">
      <Txt at={b + 3} x={578} y={272} size={ts} kind="ink" anchor="cc" align="center" lines={tl} />
      <Sfx at={b + 8} x={930} y={20} size={78} rot={12} text="鏘！" />
    </Panel>
    <Panel at={b + 20} x={M + 600 + G} y={M + 560 + G} w={IW - 600 - G} h={IH - 560 - G} bg="speed" seed="ti-c">
      {sub || en ? (<>
        {sub && <Txt at={b + 24} x={578} y={en ? 26 : 62} size={fitLines([sub], 1000, 56, 30)} kind="box" anchor="tc" lines={[sub]} />}
        {en && <Txt at={b + 28} x={578} y={sub ? 128 : 70} size={fitLines([en], 1300, 64, 30)} kind="plain" font={EN} anchor="tc" lines={[en]} />}
      </>) : (<>
        <Kid at={b + 22} x={380} y={6} h={210} expr="happy" pose="cheer" seed={1} />
        <Kid at={b + 26} x={540} y={6} h={210} expr="grin" pose="up" girl seed={2} />
        <Kid at={b + 30} x={700} y={6} h={210} expr="wow" pose="wave" seed={3} />
      </>)}
    </Panel>
  </>);
};

/** scenario：左格小人＋情境圖示＋標題旁白框；右側 pills 逐格出現，最後一格是問題（集中線＋黃字＋「？！」） */
const Scenario: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const pills: string[] = p.pills ?? [];
  const n = Math.max(1, pills.length), grid = n === 4;
  const lastProblem = p.lastIsProblem !== false;
  const hl = lines(String(p.heading ?? ''), 7, 3);
  const RX = M + 600 + G, RW = IW - 600 - G;
  const pw = grid ? (RW - G) / 2 : RW, ph = grid ? (IH - G) / 2 : (IH - (n - 1) * G) / n;
  const probAt = pills.length ? cue(cues, p.cueMap?.[pills.length - 1], 20 + (pills.length - 1) * 30) : 1e9;
  return (<>
    <Panel at={4} x={M} y={M} w={600} h={IH} bg="ht" seed="sc-a">
      {hl[0] && <Txt at={6} x={24} y={24} size={fitLines(hl, 500, 64, 34)} kind="ybox" lines={hl} />}
      <ComicIcon icon={p.sketch ?? p.icon} at={12} x={310} y={300} size={220} wobble />
      <Kid at={8} x={50} y={470} h={320} expr={lastProblem && f >= probAt ? 'wow' : 'think'} pose="down" />
    </Panel>
    {pills.map((x, i) => {
      const at = cue(cues, p.cueMap?.[i], 20 + i * 30);
      const last = lastProblem && i === pills.length - 1;
      const px = RX + (grid ? (i % 2) * (pw + G) : 0), py = M + (grid ? Math.floor(i / 2) * (ph + G) : i * (ph + G));
      const iw = pw - 16, ih = ph - 16;
      const maxW = iw - (last ? 260 : 180);
      const ls = smart(x, maxW, 72);
      return (
        <Panel key={i} at={at} x={px} y={py} w={pw} h={ph} bg={last ? 'focus' : i % 2 ? 'white' : 'ht'} seed={`sc-p${i}`} fx={iw / 2 + 50}>
          {last
            ? <Sfx at={at + 4} x={14} y={ih / 2 - 46} size={76} rot={-10} text="？！" />
            : <Badge at={at + 2} x={20} y={ih / 2 - 35} text={String(i + 1)} />}
          <Txt at={at + 3} x={last ? iw / 2 + 70 : iw / 2 + 40} y={ih / 2} size={fitLines(ls, maxW, 72, 30)} kind={last ? 'pop' : 'box'}
            anchor="cc" align="center" lines={ls} />
        </Panel>
      );
    })}
  </>);
};

/** definition 的大字一行：highlight 那段在 hlAt 時畫上黃色底線 */
const BigLine: React.FC<{text: string; hl: string; hlAt: number; size: number}> = ({text, hl, hlAt, size}) => {
  const f = useCurrentFrame();
  const i = hl ? text.indexOf(hl) : -1;
  const k = pr(f, hlAt, 10);
  if (i < 0) return <div>{text}</div>;
  return (
    <div>
      {text.slice(0, i)}
      <span style={{backgroundImage: `linear-gradient(transparent 58%, ${Y} 58%, ${Y} 92%, transparent 92%)`, backgroundRepeat: 'no-repeat',
        backgroundSize: `${k * 100}% 100%`, padding: `0 ${size * 0.05}px`}}>{hl}</span>
      {text.slice(i + hl.length)}
    </div>
  );
};

/** definition：上方整格集中線＋大字（重點畫黃底線），下方小人格＋補充格 */
const Definition: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const big = String(p.bigText ?? p.title ?? ''), hl = String(p.highlight ?? '');
  const notes: string[] = p.sideNotes ?? [];
  const hasN = notes.length > 0;
  const ah = hasN ? 560 : IH, iw = IW - 16, ih = ah - 16;
  const bl = (() => {     // 換行時盡量不要把 highlight 切成兩半
    const ls = lines(big, 10, 2);
    if (hl && ls.length === 2 && !ls.some((ln) => ln.includes(hl)) && big.includes(hl)) {
      const j = big.indexOf(hl), cut = j + hl.length <= 12 ? j + hl.length : j;
      return [big.slice(0, cut), big.slice(cut)].filter(Boolean);
    }
    return ls;
  })();
  const size = fitLines(bl, 1480, 130, 56);
  const at0 = Math.max(6, cue(cues, p.cueMap?.[0], 6)), hlAt = cue(cues, p.cueMap?.[1], at0 + 30);
  const sc = interpolate(f, [at0, at0 + 5, at0 + 9], [0.3, 1.08, 1], clamp);
  const noteW = hasN ? (IW - 300 - G - (notes.length - 1) * G) / notes.length : 0;
  return (<>
    <Panel at={4} x={M} y={M} w={IW} h={ah} bg="focus" seed="df-a" fy={ih * 0.48}>
      {p.label && <Txt at={6} x={24} y={24} size={fitLines([String(p.label)], 700, 46, 28)} kind="ybox" lines={[String(p.label)]} />}
      {f >= at0 && (
        <div style={{position: 'absolute', left: iw / 2, top: ih * (hasN ? 0.52 : 0.44), transform: `translate(-50%, -50%) scale(${sc})`,
          fontFamily: TC, fontWeight: 900, fontSize: size, lineHeight: 1.2, color: INK, letterSpacing: 2, whiteSpace: 'nowrap', textAlign: 'center',
          WebkitTextStroke: `${Math.max(10, size * 0.1)}px #fff`, paintOrder: 'stroke fill'}}>
          {bl.map((ln, i) => <BigLine key={i} text={ln} hl={hl} hlAt={hlAt} size={size} />)}
        </div>
      )}
      {!hasN && <Kid at={at0 + 6} x={40} y={ih - 330} h={320} expr="happy" pose="point" />}
      {hl && <Sfx at={hlAt} x={iw - 250} y={ih - 130} size={70} rot={-10} text="重點！" />}
    </Panel>
    {hasN && (<>
      <Panel at={at0 + 6} x={M} y={M + ah + G} w={300} h={IH - ah - G} bg="white" seed="df-k">
        <Kid at={at0 + 8} x={70} y={6} h={210} expr="happy" pose="point" />
      </Panel>
      {notes.map((t, i) => {
        const at = cue(cues, p.noteCues?.[i], at0 + 40 + i * 15);
        const ls = lines(t, 8, 2);
        return (
          <Panel key={i} at={at} x={M + 300 + G + i * (noteW + G)} y={M + ah + G} w={noteW} h={IH - ah - G} bg={i % 2 ? 'white' : 'ht'} seed={`df-n${i}`}>
            <Txt at={at + 3} x={(noteW - 16) / 2} y={(IH - ah - G - 16) / 2} size={fitLines(ls, noteW - 110, 64, 26)} kind="box" anchor="cc" align="center" lines={ls} />
          </Panel>
        );
      })}
    </>)}
  </>);
};

/** cards：上方速度線標題格，下方 2～4 格並排（編號＋圖示＋標題＋說明），選用 footer 格 */
const Cards: React.FC<P> = ({p, cues}) => {
  const cards: {icon?: string; sketch?: string; title?: string; note?: string}[] = p.cards ?? [];
  const n = Math.max(1, cards.length);
  const hh = 150, fh = p.footer ? 110 : 0;
  const cy = M + hh + G, ch = IH - hh - G - (fh ? fh + G : 0);
  const cw = (IW - (n - 1) * G) / n, iw = cw - 16, ih = ch - 16;
  const s = Math.min(240, iw * 0.45, ih * 0.4);
  const heading = String(p.heading ?? '');
  const lastAt = cards.length ? cue(cues, p.cueMap?.[cards.length - 1], 20 + (cards.length - 1) * 30) : 20;
  const footAt = Math.max(lastAt + 12, cue(cues, cues.length - 1, lastAt + 12));
  return (<>
    <Panel at={4} x={M} y={M} w={IW} h={hh} bg="speed" seed="cd-h">
      {heading && <Txt at={6} x={(IW - 16) / 2} y={(hh - 16) / 2} size={fitLines([heading], 1500, 70, 34)} kind="ybox" anchor="cc" lines={[heading]} />}
    </Panel>
    {cards.map((c, i) => {
      const at = cue(cues, p.cueMap?.[i], 20 + i * 30);
      const title = String(c.title ?? '');
      const ts = fitLines([title], iw - 70, 66, 28);
      const nl = c.note ? lines(c.note, Math.max(4, Math.floor((iw - 50) / 50)), 2) : [];
      const ns = fitLines(nl.length ? nl : [' '], iw - 50, 50, 24);
      const block = s + 22 + (title ? ts * 1.42 + 10 : 0) + (nl.length ? 30 + nl.length * ns * 1.18 : 0);
      const y0 = Math.max(24, (ih - block) / 2), ty = y0 + s + 22;   // 圖示＋標題＋說明整組垂直置中
      return (
        <Panel key={i} at={at} x={M + i * (cw + G)} y={cy} w={cw} h={ch} bg={i % 2 ? 'white' : 'ht'} seed={`cd-c${i}`}>
          <Badge at={at + 2} x={16} y={16} size={60} text={String(i + 1)} />
          <ComicIcon icon={c.sketch ?? c.icon} at={at + 2} x={(iw - s) / 2} y={y0} size={s} />
          {title && <Txt at={at + 4} x={iw / 2} y={ty} size={ts} kind="ybox" anchor="tc" lines={[title]} />}
          {nl.length > 0 && <Txt at={at + 7} x={iw / 2} y={ty + ts * 1.42 + 10 + 30} size={ns} kind="plain" anchor="tc" align="center" lines={nl} />}
        </Panel>
      );
    })}
    {p.footer && (
      <Panel at={footAt} x={M} y={M + IH - fh} w={IW} h={fh} bg="yellow" seed="cd-f">
        <Txt at={footAt + 3} x={(IW - 16) / 2} y={(fh - 16) / 2} size={fitLines([String(p.footer)], 1600, 54, 28)} kind="plain" anchor="cc" lines={[String(p.footer)]} />
      </Panel>
    )}
  </>);
};

/** vs：左右兩格對打（NG／OK 標章、圖示、小人、說明），中間大字 VS（或 ＋、≠），下方結論 */
const Vs: React.FC<P> = ({p, cues}) => {
  const sw = (IW - 72) / 2, iw = sw - 16;
  const at1 = cue(cues, p.cueMap?.[1], 40);
  const side = (sd: {frame?: string; icon?: string; sketch?: string; text?: string} | undefined, i: number) => {
    const d = sd ?? {};
    const at = cue(cues, p.cueMap?.[i], i ? 40 : 6);
    const danger = d.frame === 'danger', ok = d.frame === 'success';
    const ls = lines(String(d.text ?? ''), 9, 3);
    const right = i === 1;
    return (
      <Panel key={i} at={at} x={M + i * (sw + 72)} y={M} w={sw} h={IH} bg={danger ? 'ht' : ok ? 'focus' : 'white'} seed={`vs-${i}`} fy={220}>
        <ComicIcon icon={d.sketch ?? d.icon} at={at + 2} x={right ? 70 : iw - 70 - 230} y={110} size={230} />
        <Kid at={at + 4} x={right ? iw - 60 - 200 : 60} y={60} h={300} flip={right} seed={i}
          expr={danger ? 'wow' : ok ? 'happy' : 'smile'} pose={danger ? 'down' : ok ? 'cheer' : 'point'} />
        {(danger || ok) && <Txt at={at + 6} x={right ? 300 : iw - 300 - 120} y={24} size={56} kind={ok ? 'ybox' : 'box'} font={EN} rot={right ? 6 : -6} lines={[ok ? 'OK!' : 'NG!']} />}
        {ls[0] && <Txt at={at + 6} x={iw / 2} y={420} size={fitLines(ls, 700, 76, 30)} kind="box" anchor="tc" align="center" lines={ls} />}
      </Panel>
    );
  };
  const mid = !p.mid || String(p.mid).toLowerCase() === 'vs' ? 'VS' : String(p.mid);
  const fp = p.footerPill ? String(p.footerPill) : '';
  const footAt = Math.max(at1 + 14, cue(cues, cues.length - 1, at1 + 30) + 6);
  return (<>
    {side(p.left, 0)}
    {side(p.right, 1)}
    <Txt at={at1 - 2} x={PAGE.w / 2} y={330} size={isAscii(mid) ? 170 : 130} kind="pop" font={isAscii(mid) ? EN : TC} anchor="cc" rot={-8} lines={[mid]} />
    {fp && <Txt at={footAt} x={PAGE.w / 2} y={700} size={fitLines([fp], 1300, 58, 30)} kind="ybox" anchor="tc" lines={[fp]} />}
  </>);
};

/** stat：左格集中線＋巨大數字砸進來並滾輪式往上數（lib/rollnum：每位上下滑動、前快後慢；不逐格換字，大字逐格換字會被判畫面突跳），右上說明框，右下補充 */
const Stat: React.FC<P> = ({p, cues}) => {
  const at = Math.max(8, cue(cues, 0, 8));
  const raw = String(p.value ?? ''), suf = String(p.suffix ?? '');
  const f = useCurrentFrame();
  const shown = raw;
  const units = raw.length * 0.52 + (suf ? (isAscii(suf) ? suf.length * 0.3 : suf.length * 0.55) : 0);
  const size = Math.min(420, 900 / Math.max(1, units));
  const parts: [React.ReactNode, number, boolean?][] = [[<RollNum text={shown} p={rollProgress(f, at, 36)} digitW={0.5} />, size, isAscii(shown)]];
  if (suf) parts.push([suf, size * 0.5, isAscii(suf)]);
  const label = lines(String(p.label ?? ''), 7, 3);
  const sub = lines(String(p.sub ?? ''), 10, 3);
  return (<>
    <Panel at={4} x={M} y={M} w={1100} h={IH} bg="focus" seed="st-a" fy={360}>
      <Num at={at} x={542} y={360} parts={parts} rot={-3} />
      <Kid at={at + 10} x={40} y={500} h={290} expr="wow" pose="up" />
      <Sfx at={at + 30} x={820} y={40} size={90} rot={12} text="砰！" />
    </Panel>
    <Panel at={at + 10} x={M + 1100 + G} y={M} w={IW - 1100 - G} h={480} bg="white" seed="st-b">
      {label[0] && <Txt at={at + 12} x={(IW - 1100 - G - 16) / 2} y={232} size={fitLines(label, 560, 80, 30)} kind="box" anchor="cc" align="center" lines={label} />}
    </Panel>
    <Panel at={at + 20} x={M + 1100 + G} y={M + 480 + G} w={IW - 1100 - G} h={IH - 480 - G} bg="ht" seed="st-c">
      {sub[0]
        ? <Txt at={at + 22} x={(IW - 1100 - G - 16) / 2} y={(IH - 480 - G - 16) / 2} size={fitLines(sub, 560, 60, 26)} kind="box" anchor="cc" align="center" lines={sub} />
        : <ComicIcon icon="chart" at={at + 22} x={230} y={60} size={180} />}
    </Panel>
  </>);
};

/** quiz：上方網點格題目＋思考小人；下方每個選項是一個小人的對話框，揭曉時紅圈＋答對的小人歡呼 */
const Quiz: React.FC<P> = ({p, cues, dur}) => {
  const f = useCurrentFrame();
  const opts: string[] = p.options ?? [];
  const n = Math.max(1, opts.length);
  const reveal = cue(cues, p.revealCue, Math.round(dur * 0.6));
  const th = 270, oy = M + th + G, oh = IH - th - G, iw = IW - 16;
  const q = lines(String(p.question ?? ''), 22, 2);
  const slot = iw / n, bw = Math.min(slot - 60, 560), bh = 170;
  const done = f >= reveal;
  return (<>
    <Panel at={4} x={M} y={M} w={IW} h={th} bg="ht" seed="qz-a">
      <Txt at={6} x={24} y={20} size={56} kind="ybox" font={EN} rot={-4} lines={['QUIZ']} />
      {q[0] && <Txt at={10} x={iw / 2 + 60} y={(th - 16) / 2} size={fitLines(q, 1240, 64, 32)} kind="box" anchor="cc" align="center" lines={q} />}
      <Kid at={12} x={iw - 190} y={20} h={230} expr={done ? 'happy' : 'think'} pose={done ? 'cheer' : 'down'} />
    </Panel>
    <Panel at={16} x={M} y={oy} w={IW} h={oh} bg="white" seed="qz-b">
      {opts.map((o, i) => {
        const at = 20 + i * 12, cx = slot * (i + 0.5);
        const ls = lines(`${LETTER(i)} ${o}`, 8, 2);
        const right = i === p.answerIndex;
        return (
          <React.Fragment key={i}>
            <Bubble at={at} x={cx - bw / 2} y={24} w={bw} h={bh} size={fitLines(ls, bw * 0.7, 50, 26)} tail={[bw / 2 + 20, 214 - 24 + 20]} lines={ls} />
            <Kid at={at + 4} x={cx - 67} y={214} h={200} seed={i} girl={i % 2 === 1}
              expr={done ? (right ? 'grin' : 'wow') : 'think'} pose={done && right ? 'cheer' : 'down'} />
            {right && <RedCircle at={reveal} x={cx} y={24 + bh / 2} rx={bw / 2 + 22} ry={bh / 2 + 18} />}
            {right && <Sfx at={reveal + 4} x={cx + 80} y={250} size={60} rot={10} text="叮咚！" />}
          </React.Fragment>
        );
      })}
      {p.afterNote && <Txt at={reveal + 16} x={iw / 2} y={430} size={fitLines([String(p.afterNote)], 1500, 44, 26)} kind="ybox" anchor="tc" lines={[String(p.afterNote)]} />}
    </Panel>
  </>);
};

/** recap：左格回顧清單逐項打勾；右上回顧要點（或歡呼小人）；右下下一節預告 */
const Recap: React.FC<P> = ({p, cues}) => {
  const take: string[] = (p.takeaway ?? []).slice(0, 3), rec: string[] = (p.recap ?? []).slice(0, 5);
  const RX = M + 1180 + G, RW = IW - 1180 - G, rw = RW - 16;
  const nextAt = cue(cues, p.nextCue, 120);
  const gap = take.length >= 3 ? 190 : 230;
  const teaser = p.nextTeaser ? lines(String(p.nextTeaser), 9, 2) : [];
  return (<>
    <Panel at={4} x={M} y={M} w={1180} h={IH} bg="white" seed="rc-a">
      <Txt at={6} x={24} y={24} size={56} kind="ybox" rot={-2} lines={['重點回顧']} />
      {take.map((t, i) => {
        const at = Math.max(12, cue(cues, p.takeCues?.[i], 20 + i * 40)), y = 190 + i * gap;
        const ls = lines(t, 14, 2);
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: 40, top: y, width: 90, height: 90, border: `7px solid ${INK}`, background: '#fff', boxSizing: 'border-box'}} />
            <Check at={at} x={46} y={y - 14} size={92} />
            <Txt at={at + 2} x={170} y={y + 45} size={fitLines(ls, 900, 60, 30)} kind="box" anchor="tl" lines={ls} />
          </React.Fragment>
        );
      })}
    </Panel>
    <Panel at={14} x={RX} y={M} w={RW} h={480} bg={rec.length ? 'ht' : 'focus'} seed="rc-b">
      {rec.length ? (<>
        <Txt at={16} x={24} y={24} size={fitLines(rec.map((r) => '· ' + r), rw - 90, 52, 24)} kind="box" lines={rec.map((r) => '· ' + r)} />
        <Kid at={18} x={rw - 160} y={250} h={210} expr="happy" pose="cheer" />
      </>) : (<>
        <Kid at={16} x={rw / 2 - 100} y={90} h={300} expr="grin" pose="cheer" />
        <Sfx at={22} x={rw - 190} y={30} size={80} rot={12} text="讚！" />
      </>)}
    </Panel>
    <Panel at={teaser.length ? nextAt : 30} x={RX} y={M + 480 + G} w={RW} h={IH - 480 - G} bg="speed" seed="rc-c">
      {teaser.length ? (<>
        <Txt at={nextAt + 2} x={24} y={20} size={48} kind="ybox" font={EN} lines={['NEXT']} />
        <Txt at={nextAt + 6} x={rw / 2} y={175} size={fitLines(teaser, rw - 70, 52, 26)} kind="box" anchor="cc" align="center" lines={teaser} />
      </>) : <ComicIcon icon="trophy" at={32} x={rw / 2 - 100} y={40} size={200} />}
    </Panel>
  </>);
};

/** qaEnd：最後一頁——上方集中線題目，下方四格選項，揭曉時答案格變黃＋紅圈 */
const QaEnd: React.FC<P> = ({p}) => {
  const f = useCurrentFrame();
  const opts: string[] = (p.options ?? []).slice(0, 4);
  const ans = Math.round((p.answerSec ?? 4) * 30);
  const th = 250, iw = IW - 16;
  const q = lines(String(p.question ?? ''), 20, 2);
  const ow = (IW - G) / 2, oh = (IH - th - G * 2) / 2, oiw = ow - 16, oih = oh - 16;
  return (<>
    <Panel at={4} x={M} y={M} w={IW} h={th} bg="focus" seed="qe-a">
      <Kid at={8} x={40} y={30} h={190} expr={f >= ans ? 'grin' : 'think'} pose={f >= ans ? 'cheer' : 'down'} />
      {q[0] && <Txt at={6} x={iw / 2} y={(th - 16) / 2} size={fitLines(q, 1150, 72, 34)} kind="ink" anchor="cc" align="center" lines={q} />}
      <Txt at={10} x={iw - 300} y={20} size={44} kind="ybox" font={EN} rot={4} lines={['FINAL QUIZ']} />
      <Sfx at={ans + 4} x={iw - 270} y={140} size={64} rot={-8} text="正解！" />
    </Panel>
    {opts.map((o, i) => {
      const at = 16 + i * 8, right = i === p.answerIndex;
      const ls = lines(o, 12, 2);
      return (
        <Panel key={i} at={at} x={M + (i % 2) * (ow + G)} y={M + th + G + Math.floor(i / 2) * (oh + G)} w={ow} h={oh} bg="white" seed={`qe-${i}`}
          tint={right ? pr(f, ans, 10) : 0}>
          <Badge at={at + 2} x={24} y={oih / 2 - 45} size={90} text={LETTER(i)} />
          <Txt at={at + 3} x={oiw / 2 + 50} y={oih / 2} size={fitLines(ls, oiw - 200, 56, 28)} kind="plain" anchor="cc" align="center" lines={ls} />
          {right && <RedCircle at={ans} x={oiw / 2 + 50} y={oih / 2} rx={330} ry={oih / 2 - 22} />}
        </Panel>
      );
    })}
  </>);
};

const SCENES: Record<string, React.FC<P>> = {title: Title, scenario: Scenario, definition: Definition, cards: Cards, vs: Vs, stat: Stat, quiz: Quiz, recap: Recap, qaEnd: QaEnd};

/** 一頁紙：在場景最後 FLIP 格之後往左滑走（data-qa="ignore"：離場中的舊頁不算版面） */
const Page: React.FC<{n: number; dur: number; last: boolean; logo: boolean; children: React.ReactNode}> = ({n, dur, last, logo, children}) => {
  const f = useCurrentFrame();
  const out = !last && f >= dur ? pr(f, dur, FLIP) : 0;
  return (
    <div data-qa={out > 0 ? 'ignore' : undefined} style={{position: 'absolute', left: PAGE.x, top: PAGE.y, width: PAGE.w, height: PAGE.h,
      transform: `${logo ? 'translateY(4px) scale(0.88) ' : ''}translateX(${-out * 2150}px) rotate(${-out * 6}deg)`,
      transformOrigin: logo ? '50% 100%' : '0% 100%'}}>
      <div style={{position: 'absolute', inset: 0, background: '#fdfcf7', overflow: 'hidden',
        boxShadow: `${10 + out * 20}px 10px ${out * 30}px rgba(0,0,0,0.55)`}}>
        {children}
        <div style={{position: 'absolute', right: 30, bottom: 1, fontFamily: EN, fontSize: 20, color: '#555', letterSpacing: 2}}>{`PAGE ${n}`}</div>
      </div>
    </div>
  );
};

export const TemplateI: React.FC<TplSpec> = (spec) => {
  const f = useCurrentFrame();
  const logo = !!spec.brand?.logo;
  const cap = captionAt(spec, f, 8);
  // 緊接上一句（間隔 ≤10 格）時直接換字、不淡入：淡入的前 2 格字幕太淡，會被最終品檢判成字幕閃爍
  const capPrev = cap ? spec.captions[spec.captions.indexOf(cap) - 1] : undefined;
  const capO = !cap ? 0 : capPrev && cap.from - capPrev.to <= 10 ? 1 : interpolate(f, [cap.from - 2, cap.from + 3], [0, 1], clamp);
  const capS = cap ? fitLines([cap.text], 1760, 54, 34) : 54;
  const fade = Math.max(0, spec.brand ? 0 : 1 - f / 8, (f - (spec.totalFrames - 12)) / 12);
  const order = spec.scenes.map((s, i) => ({s, i})).reverse();   // 早的頁面疊在上面（翻走時露出下一頁）
  return (
    <AbsoluteFill style={{backgroundColor: '#1d1d1d', overflow: 'hidden'}}>
      <Defs />
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <rect width={1920} height={1080} fill="url(#cmHt)" opacity={0.5} />
      </svg>
      {order.map(({s, i}) => {
        const Comp = SCENES[s.type] ?? Definition;
        const last = i === spec.scenes.length - 1;
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.dur + (last ? 0 : FLIP)}>
            <Page n={i + 1} dur={s.dur} last={last} logo={logo}><Comp p={s.props ?? {}} cues={s.cues ?? []} dur={s.dur} /></Page>
          </Sequence>
        );
      })}
      {/* 字幕底：固定在畫面下緣的深色漸層（y 900→1080） */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 900, height: 180, background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.88) 40%, rgba(0,0,0,0.92))'}} />
      {cap && (
        <div data-qa="caption" style={{position: 'absolute', left: 60, right: 60, top: 952, textAlign: 'center', opacity: capO, fontFamily: TC, fontWeight: 900,
          fontSize: capS, color: '#fff', letterSpacing: 2, whiteSpace: 'nowrap', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill'}}>{cap.text}</div>
      )}
      <BrandLogo logo={spec.brand?.logo} />
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
      {spec.qa && <QaProbe w={spec.width} h={spec.height} />}
      {spec.music && <Audio src={staticFile(spec.music)} volume={spec.musicVolume ?? 0.4} />}
      {spec.voice && <Audio src={staticFile(spec.voice)} />}
      <Audio src={staticFile('tpl_sfx.wav')} />
    </AbsoluteFill>
  );
};
