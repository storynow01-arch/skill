/* 範本 L：黏土玩具風 ClayToy —— 每個場景＝暖米白桌面攝影棚裡的一組黏土實景；物件依旁白一個個掉進來、落地壓扁回彈；
   換場景＝翻頁捲角（右上角往左下翻，約 0.7 秒、連續）。
   招牌特徵（概念忠實度）：①桌面攝影棚＋黏土玩具實景比喻 ②厚實立體字（大標、數字）③左上章節膠囊（第幾段＋標題）
   ④固定主角＝使用者畫的捲毛小狗（每個場景都在場、跟物件互動：眨眼、彈跳、驚訝、開心、揮手、燈泡亮起）
   ⑤翻頁捲角轉場 ⑥深藍小膠囊字幕＋畫面下緣固定淡色漸層底。
   品檢約束：翻頁連續（不跳格）、顏色變化都是 6 格以上漸變、沒有大面積閃動、沒有用取餘數跳回原位的循環平移、
   畫面內容一律 y<900、隨機一律 random(seed)（kit 的 Splash）、不用 feTurbulence／大模糊。
   場景語彙同範本 A～D、I（title／scenario／definition／cards／vs／stat／quiz／recap／qaEnd），欄位見 templates/範本風格_場景語彙.md。 */
import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {QaProbe} from '../QaProbe';
import {
  BGC, Ball, CREAM, Card, Chapter, Clay3D, ClayDefs, Drop, FAT, GR, MU, NV, OR, PageTurn, Pop, SKY, STAGE_BG, Shadow, Splash, TC, Table,
  clamp, depthShadow, mix, pop, pr,
} from '../lib/clay/kit';
import {Pup} from '../lib/clay/pup';
import {ClayIcon, EMOJI_TO_CLAY, claySize} from '../lib/clay/icons';
import {Cross, Star, Tick} from '../lib/clay/objects';
import {TplSpec, captionAt, cue, textW, wrap} from './common';
import {RollNum, rollProgress} from '../lib/rollnum';
import {BrandLogo} from './brand';

const TURN = 21;          // 翻頁格數（約 0.7 秒）
const FLOOR = 846;        // 地面落地線：畫面內容一律 y<900
const PUP = 1.15;         // 小狗基本比例
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = {p: any; cues: number[]; dur: number; f: number; icons: string[]};

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
const longest = (ls: string[]) => Math.max(1, ...ls.map(textW));
/** 黏土卡片字級：卡片總寬（字寬＋左右內距 1.6 字＋前置小球 extra 字）不超過 maxW */
const cardSize = (ls: string[], maxW: number, base: number, min = 24, extra = 0) => Math.max(min, Math.min(base, maxW / (longest(ls) + 1.6 + extra)));
/** 立體字字級 */
const fat = (ls: string[], maxW: number, base: number, min = 40) => Math.max(min, Math.min(base, maxW / (longest(ls) * 1.04)));
const isAscii = (s: string) => /^[\u0000-ÿ]*$/.test(s);
const LETTER = (i: number) => String.fromCharCode(65 + i);
const COLORS = [OR, SKY, MU, GR];

/** 一張黏土卡片（多行），以 (x,y) 為底部中央彈出；lead＝卡片左邊的小黏土球（編號、勾、Q） */
const Lab: React.FC<{f: number; at: number; x: number; y: number; ls: string[]; size: number; bg?: string; fg?: string; rot?: number; out?: number;
  lead?: React.ReactNode}> = ({f, at, x, y, ls, size, bg, fg, rot, out, lead}) => (
  <Pop f={f} at={at} x={x} y={y} rot={rot} out={out}>
    <Card bg={bg} fg={fg} size={size} style={lead ? {display: 'flex', alignItems: 'center', gap: size * 0.3, paddingLeft: size * 0.5} : undefined}>
      {lead}
      <div>{ls.map((l, i) => <div key={i}>{l}</div>)}</div>
    </Card>
  </Pop>
);

/** 立體字一行掉下來（以 (x,y) 為底部中央） */
const Fat: React.FC<{f: number; at: number; x: number; y: number; t: string; size: number; color: string; h?: number}> = ({f, at, x, y, t, size, color, h = 380}) => (
  <Drop f={f} at={at} x={x} y={y} sw={0} h={h}><Clay3D text={t} size={size} color={color} /></Drop>
);

/** 黏土物件掉到 (x,y)（底部中央）；gray＝變灰程度（0→1 漸變） */
const Obj: React.FC<{f: number; at: number; x: number; y: number; icon?: string; size: number; rot?: number; h?: number; gray?: number}> = (
  {f, at, x, y, icon, size, rot = 0, h = 420, gray = 0}) => {
  const [w] = claySize(icon, size);
  return (
    <Drop f={f} at={at} x={x} y={y} sw={w * 0.9} h={h}>
      <div style={{transform: `rotate(${rot}deg)`, transformOrigin: '50% 100%', filter: gray > 0 ? `grayscale(${gray}) brightness(${1 - 0.12 * gray})` : undefined}}>
        <ClayIcon icon={icon} size={size} f={Math.max(0, f - at)} />
      </div>
    </Drop>
  );
};

/* ═════════ 9 種場景（座標＝整張 1920×1080 畫面） ═════════ */

/** title：大立體標題一行行掉下來（落地噴出黏土小球）＋小狗大大登場、燈泡亮起；副標橘色膠囊、英文小立體字；右下掉進幾個小物件 */
const Title: React.FC<P> = ({p, cues, f}) => {
  const tAt = Math.max(10, Math.min(18, cue(cues, 0, 12)));
  const tl = lines(String(p.title ?? ''), 8, 2);
  const size = fat(tl, 1180, 150, 70);
  const lh = size * 1.24, CX = 1130, bottom = 470;
  const sub = p.subtitle ? lines(String(p.subtitle), 14, 1) : [];
  const en = p.en ? String(p.en) : '';
  const eb = p.eyebrow ? lines(String(p.eyebrow), 14, 1) : [];
  const deco: string[] = [p.icon ?? 'book', 'pencil', 'star'];
  return (<>
    {eb.length > 0 && <Lab f={f} at={4} x={CX} y={bottom - tl.length * lh - 34} ls={eb} size={cardSize(eb, 700, 40)} bg={NV} fg="#fff" />}
    {tl.map((t, i) => (
      <Fat key={i} f={f} at={tAt + i * 6} x={CX} y={bottom - (tl.length - 1 - i) * lh} t={t} size={size} color={i % 2 ? OR : NV} h={420} />
    ))}
    <Splash f={f} at={tAt + 10 + (tl.length - 1) * 6} x={CX} y={bottom - 40} w={size * longest(tl) * 0.9} n={16} seed="ti" />
    {sub.length > 0 && <Lab f={f} at={tAt + 20} x={CX} y={bottom + 120} ls={sub} size={cardSize(sub, 860, 50)} bg={OR} fg="#fff" />}
    {en && (
      <Pop f={f} at={tAt + 28} x={CX} y={bottom + 214}>
        <Clay3D text={en} size={Math.min(56, 900 / Math.max(1, textW(en)))} color={MU} font={FAT} />
      </Pop>
    )}
    {deco.map((ic, k) => (
      <Obj key={k} f={f} at={tAt + 34 + k * 7} x={1500 + k * 150} y={FLOOR} icon={ic} size={k === 0 ? 150 : 120} rot={(k - 1) * 8} />
    ))}
    <Pup x={330} y={FLOOR} s={1.55} f={f} enter={4} mood={f >= tAt && f < tAt + 16 ? 'wow' : 'grin'} hops={[tAt + 14, tAt + 44]}
      look={0.6} bulb={pr(f, tAt + 18, 10)} book heartUp={pr(f, tAt + 50, 10)} seed={1} />
  </>);
};

/** scenario：左邊一疊亂七八糟的物件、小狗看著；右邊問題標籤一個個掉下（最後一個是問題：橘底＋大問號、小狗驚訝） */
const Scenario: React.FC<P> = ({p, cues, f}) => {
  const pills: string[] = (p.pills ?? []).slice(0, 4);
  const n = Math.max(1, pills.length);
  const lastProblem = p.lastIsProblem !== false;
  const at = (i: number) => cue(cues, p.cueMap?.[i], 20 + i * 30);
  const probAt = pills.length && lastProblem ? at(pills.length - 1) : 1e9;
  const step = n > 1 ? Math.min(170, 470 / (n - 1)) : 0;
  const y0 = n > 1 ? 330 : 500;
  const pile: [string, number, number, number][] = [['papers', 520, 190, -12], [p.sketch ?? p.icon ?? 'warning', 730, 250, 0], ['pencil', 930, 150, 14]];
  return (<>
    {pile.map(([ic, x, s, r], k) => <Obj key={k} f={f} at={8 + k * 6} x={x} y={FLOOR} icon={ic} size={s} rot={r} />)}
    {pills.map((t, i) => {
      const last = lastProblem && i === pills.length - 1;
      const ls = lines(t, 10, 2);
      const size = cardSize(ls, 680, last ? 60 : 52, 26, last ? 0 : 1.4);
      const w = longest(ls) * size + 1.6 * size;
      return (
        <React.Fragment key={i}>
          <Lab f={f} at={at(i)} x={1380} y={y0 + i * step} ls={ls} size={size} rot={last ? 0 : i % 2 ? 2.5 : -2.5}
            bg={last ? OR : CREAM} fg={last ? '#fff' : NV} lead={last ? undefined : <Ball d={size * 1.05} c={COLORS[i % 4]}>{i + 1}</Ball>} />
          {last && (
            <Pop f={f} at={at(i) + 6} x={Math.min(1820, 1380 + w / 2 + 70)} y={y0 + i * step + 14}>
              <div style={{transform: `rotate(${10 + 5 * Math.sin((f - at(i)) / 8)}deg)`}}><Clay3D text="？" size={120} color={OR} font={TC} /></div>
            </Pop>
          )}
        </React.Fragment>
      );
    })}
    {lastProblem && pills.length > 0 && (
      <Pop f={f} at={probAt + 2} x={380} y={430}>
        <div style={{transform: `rotate(${-8 + 6 * Math.sin(f / 7)}deg)`}}><Clay3D text="？" size={110} color={SKY} font={TC} /></div>
      </Pop>
    )}
    <Pup x={250} y={FLOOR} s={PUP} f={f} enter={4} mood={f >= probAt ? 'wow' : 'happy'} look={0.7}
      hops={pills.map((_, i) => at(i) + 3)} seed={2} />
  </>);
};

/** definition 的一行立體字：highlight 那段在 hlAt 時漸變成橘色、底下長出一條黏土條 */
const DefLine: React.FC<{f: number; text: string; hl: string; hlAt: number; size: number}> = ({f, text, hl, hlAt, size}) => {
  const i = hl ? text.indexOf(hl) : -1;
  if (i < 0) return <Clay3D text={text} size={size} color={NV} />;
  const k = pr(f, hlAt, 12);
  const segs = [text.slice(0, i), hl, text.slice(i + hl.length)];
  return (
    <div style={{display: 'flex', alignItems: 'flex-end'}}>
      {segs.map((t, j) => t && (j === 1 ? (
        <div key={j} style={{position: 'relative'}}>
          <div style={{position: 'absolute', left: -size * 0.04, bottom: -size * 0.1, height: size * 0.2, width: `${k * 104}%`, borderRadius: size * 0.1,
            background: `linear-gradient(to bottom, ${mix(MU, '#ffffff', 0.4)}, ${MU} 50%, ${mix(MU, '#000000', 0.2)})`,
            boxShadow: `0 ${size * 0.04}px 0 ${mix(MU, '#000000', 0.3)}, 0 ${size * 0.08}px ${size * 0.1}px rgba(70,50,30,0.25)`}} />
          <Clay3D text={t} size={size} color={mix(NV, OR, k)} />
        </div>
      ) : <Clay3D key={j} text={t} size={size} color={NV} />))}
    </div>
  );
};

/** definition：大立體字（重點換色＋黏土底線），下方補充黏土卡片；小狗在左邊揮手、念到重點時燈泡亮起 */
const Definition: React.FC<P> = ({p, cues, f}) => {
  const big = String(p.bigText ?? p.title ?? ''), hl = String(p.highlight ?? '');
  const notes: string[] = (p.sideNotes ?? []).slice(0, 3);
  const bl = (() => {     // 10 字內一行；有逗號在逗號斷；否則對半分兩行，但不把 highlight 切成兩半
    const one = lines(big, 99, 1);
    if (!one.length || textW(one[0]) <= 10) return one;
    if (/[，；]/.test(big)) return lines(big, 12, 2);
    const ch = Array.from(big), mid = Math.ceil(ch.length / 2);
    const j = hl ? Array.from(big.slice(0, Math.max(0, big.indexOf(hl)))).length : -1, hn = Array.from(hl).length;
    let cut = mid;
    for (let d = 0; d < ch.length; d++) {
      const ok = (c: number) => c > 0 && c < ch.length && (j < 0 || c <= j || c >= j + hn);
      if (ok(mid + d)) { cut = mid + d; break; }
      if (ok(mid - d)) { cut = mid - d; break; }
    }
    return [ch.slice(0, cut).join(''), ch.slice(cut).join('')];
  })();
  const size = fat(bl, 1360, 136, 60);
  const at0 = Math.max(6, cue(cues, p.cueMap?.[0], 6)), hlAt = cue(cues, p.cueMap?.[1], at0 + 30);
  const CX = 1110, lh = size * 1.24;
  const bottom = notes.length ? 520 : 600;
  const nw = notes.length ? 1300 / notes.length : 0;
  return (<>
    {bl.map((t, i) => (
      <Drop key={i} f={f} at={at0 + i * 6} x={CX} y={bottom - (bl.length - 1 - i) * lh} sw={0} h={400}>
        <DefLine f={f} text={t} hl={hl} hlAt={hlAt} size={size} />
      </Drop>
    ))}
    <Splash f={f} at={at0 + 10} x={CX} y={bottom - lh * (bl.length - 1) - 30} w={size * longest(bl) * 0.8} seed="df" />
    {notes.map((t, i) => {
      const at = cue(cues, p.noteCues?.[i], at0 + 40 + i * 20);
      const ls = lines(t, 7, 2);
      const ns = cardSize(ls, nw - 50, 46, 26, 1.4);
      return <Lab key={i} f={f} at={at} x={CX - 650 + nw * (i + 0.5)} y={800} ls={ls} size={ns} rot={i % 2 ? 2 : -2}
        lead={<Ball d={ns} c={COLORS[(i + 1) % 4]}>✓</Ball>} />;
    })}
    <Pup x={240} y={FLOOR} s={PUP} f={f} enter={4} mood={f >= hlAt ? 'grin' : 'happy'} hops={[hlAt + 2]} look={0.8}
      bulb={pr(f, hlAt, 10)} wave={f >= at0 + 8 && f < hlAt} seed={3} />
  </>);
};

/** cards：一張長黏土桌，2～4 個物件依序掉到桌上，上方編號標題卡、桌前小名牌寫說明；最後 footer 膠囊；小狗在桌邊每出現一個就跳一下 */
const Cards: React.FC<P> = ({p, cues, f}) => {
  const cards: {icon?: string; sketch?: string; title?: string; note?: string}[] = (p.cards ?? []).slice(0, 4);
  const n = Math.max(1, cards.length);
  const TX = 440, TW = 1440, TY = 590;
  const slot = TW / n;
  const at = (i: number) => cue(cues, p.cueMap?.[i], 20 + i * 30);
  const lastAt = cards.length ? at(cards.length - 1) : 20;
  const footAt = Math.max(lastAt + 14, cue(cues, cues.length - 1, lastAt + 14));
  const footer = p.footer ? lines(String(p.footer), 18, 1) : [];
  return (<>
    <Shadow x={TX + TW / 2} y={TY + 214} w={TW * 1.05} o={pr(f, 2, 8)} />
    <Pop f={f} at={2} x={TX + TW / 2} y={TY + 204}><div style={{width: TW, height: 204, position: 'relative'}}><Table x={0} y={0} w={TW} h={170} /></div></Pop>
    {cards.map((c, i) => {
      const cx = TX + slot * (i + 0.5), a = at(i);
      const tl = lines(String(c.title ?? ''), 8, 1);
      const ts = cardSize(tl, slot - 50, 50, 26, 1.4);
      const nl = c.note ? lines(c.note, 7, 2) : [];
      const ns = cardSize(nl, slot - 60, 34, 22);
      const isz = Math.min(210, slot * 0.58);
      return (
        <React.Fragment key={i}>
          <Obj f={f} at={a} x={cx} y={TY + 22} icon={c.sketch ?? c.icon} size={isz} />
          <Splash f={f} at={a + 10} x={cx} y={TY + 10} w={isz} n={8} seed={`cd${i}`} />
          {tl[0] && <Lab f={f} at={a + 6} x={cx} y={TY + 22 - isz - 26} ls={tl} size={ts} lead={<Ball d={ts * 1.1} c={COLORS[i % 4]}>{i + 1}</Ball>} />}
          {nl.length > 0 && <Lab f={f} at={a + 12} x={cx} y={TY + 186} ls={nl} size={ns} />}
        </React.Fragment>
      );
    })}
    {footer.length > 0 && <Lab f={f} at={footAt} x={TX + TW / 2} y={190} ls={footer} size={cardSize(footer, 1100, 50)} bg={MU} fg="#fff" />}
    <Pup x={235} y={FLOOR} s={PUP} f={f} enter={4} mood={f >= footAt ? 'grin' : 'happy'} look={0.7}
      hops={cards.map((_, i) => at(i) + 4)} wave={f >= footAt + 4} seed={4} />
  </>);
};

type Side = {frame?: string; icon?: string; sketch?: string; text?: string};
/** vs：左右兩張小桌——壞的慢慢變灰暗＋紅色 ✕、好的明亮＋綠色 ✓ 和小星星；中間立體 VS；小狗站中間左右看 */
const Vs: React.FC<P> = ({p, cues, f}) => {
  const at1 = cue(cues, p.cueMap?.[1], 40);
  const side = (sd: Side | undefined, i: number) => {
    const d = sd ?? {};
    const at = cue(cues, p.cueMap?.[i], i ? 40 : 6);
    const bad = d.frame === 'danger', good = d.frame === 'success';
    const cx = i ? 1440 : 480, TW = 560, TY = 650;
    const ls = lines(String(d.text ?? ''), 9, 2);
    const g = bad ? 0.85 * pr(f, at + 12, 12) : 0;
    return (
      <React.Fragment key={i}>
        <Shadow x={cx} y={TY + 194} w={TW * 1.05} o={pr(f, at, 8)} />
        <Pop f={f} at={at} x={cx} y={TY + 194}><div style={{width: TW, height: 194, position: 'relative'}}><Table x={0} y={0} w={TW} h={160} gray={g} /></div></Pop>
        <Obj f={f} at={at + 4} x={cx - 40} y={TY + 22} icon={d.sketch ?? d.icon} size={210} gray={g} />
        {(bad || good) && (
          <Drop f={f} at={at + 12} x={cx + 170} y={TY + 22} sw={110} h={360}>{bad ? <Cross s={0.75} /> : <Tick s={0.75} />}</Drop>
        )}
        {good && ([[-250, -40, 0.3], [160, -140, 0.24], [250, -10, 0.2]] as [number, number, number][]).map(([dx, dy, s], k) => (
          <Pop key={k} f={f} at={at + 18 + k * 5} x={cx + dx} y={TY + dy}>
            <div style={{transform: `rotate(${12 * Math.sin((f + k * 20) / 14)}deg)`}}><Star s={s} /></div>
          </Pop>
        ))}
        {ls[0] && <Lab f={f} at={at + 2} x={cx} y={TY - 240} ls={ls} size={cardSize(ls, 520, 50, 28)} bg={bad ? mix(CREAM, '#d9d4cb', g) : good ? GR : CREAM}
          fg={good ? '#fff' : NV} />}
      </React.Fragment>
    );
  };
  const mid = !p.mid || String(p.mid).toLowerCase() === 'vs' ? 'VS' : String(p.mid);
  const fp = p.footerPill ? lines(String(p.footerPill), 16, 1) : [];
  const footAt = Math.max(at1 + 14, cue(cues, cues.length - 1, at1 + 30) + 6);
  const lookL = f < at1;
  return (<>
    {side(p.left, 0)}
    {side(p.right, 1)}
    <Pop f={f} at={at1 - 4} x={960} y={470}><Clay3D text={mid} size={isAscii(mid) ? 120 : 100} color={MU} /></Pop>
    {fp.length > 0 && <Lab f={f} at={footAt} x={960} y={222} ls={fp} size={cardSize(fp, 1000, 46)} bg={OR} fg="#fff" />}
    <Pup x={960} y={FLOOR + 10} s={1.1} f={f} enter={4} mood={lookL ? 'wow' : 'grin'} look={lookL ? -0.9 : 0.9}
      hops={[at1 + 4]} heartUp={pr(f, footAt, 10)} seed={5} />
  </>);
};

/** stat：巨大立體數字砸下來（落地壓扁＋噴黏土球）並滾輪式往上數（lib/rollnum），上方說明膠囊、下方補充；小狗驚訝跳起來 */
const Stat: React.FC<P> = ({p, cues, f}) => {
  const at = Math.max(8, cue(cues, 0, 8));
  const raw = String(p.value ?? ''), suf = String(p.suffix ?? '');
  const units = raw.length * 0.6 + (suf ? (isAscii(suf) ? suf.length * 0.32 : suf.length * 0.5) : 0);
  const size = Math.min(380, 980 / Math.max(1, units));
  const CX = 820, BY = 650;
  const label = lines(String(p.label ?? ''), 12, 1);
  const sub = lines(String(p.sub ?? ''), 14, 1);
  const subAt = Math.max(at + 40, cue(cues, 1, at + 40));
  const side = mix(OR, '#000000', 0.32);
  return (<>
    <Drop f={f} at={at} x={CX} y={BY} sw={size * units * 0.9} h={620}>
      <div style={{display: 'flex', alignItems: 'flex-end', whiteSpace: 'nowrap'}}>
        <span style={{fontFamily: FAT, fontWeight: 900, fontSize: size, lineHeight: 1, color: OR, textShadow: depthShadow(size, OR),
          WebkitTextStroke: `${size * 0.02}px ${side}`, display: 'inline-block', transform: 'translateY(0.2em)'}}>
          <RollNum text={raw} p={rollProgress(f, at + 4, 36)} digitW={0.58} />
        </span>
        {suf && <Clay3D text={suf} size={size * 0.46} color={NV} style={{marginLeft: size * 0.06}} />}
      </div>
    </Drop>
    <Splash f={f} at={at + 10} x={CX} y={BY - 30} w={size * units * 0.9} n={18} seed="st" />
    {label[0] && <Lab f={f} at={at + 14} x={CX} y={BY - size * 1.0 - 40} ls={label} size={cardSize(label, 1000, 54)} bg={NV} fg="#fff" />}
    {sub[0] && <Lab f={f} at={subAt} x={CX} y={820} ls={sub} size={cardSize(sub, 1000, 44)} />}
    {p.icon && <Obj f={f} at={at + 20} x={1790} y={FLOOR} icon={p.sketch ?? p.icon} size={140} />}
    <Pup x={1530} y={FLOOR} s={1.2} f={f} enter={4} mood={f >= at + 8 && f < at + 54 ? 'wow' : 'grin'} hops={[at + 12, at + 44]} look={-0.9}
      bulb={pr(f, at + 44, 10)} seed={6} />
  </>);
};

/** quiz 的黏土按鈕：揭曉時正確的彈起來、漸變成綠色、背後一圈暖光；錯的往下壓、慢慢變灰 */
const ClayButton: React.FC<{f: number; at: number; cx: number; y: number; w: number; i: number; text: string; reveal: number; right: boolean}> = (
  {f, at, cx, y, w, i, text, reveal, right}) => {
  const base = COLORS[i % 4];
  const k = pr(f, reveal, 10);
  const col = right ? mix(base, GR, k) : mix(base, '#b5b0a6', k);
  const up = right ? -30 * pop(f, reveal, 9) : 14 * k;
  const ls = lines(text, 6, 2);
  const ts = Math.max(24, Math.min(44, (w - 140) / longest(ls)));
  const glow = right ? k * (0.85 + 0.15 * Math.sin((f - reveal) / 9)) : 0;
  return (
    <Drop f={f} at={at} x={cx} y={y} sw={w} h={380}>
      <div style={{position: 'relative', width: w, height: 190}}>
        {glow > 0 && <div style={{position: 'absolute', left: -60, right: -60, top: -60, bottom: -40, borderRadius: 120, opacity: glow,
          background: 'radial-gradient(closest-side, rgba(255,214,90,0.85), rgba(255,214,90,0))'}} />}
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, borderRadius: 30,
          background: 'linear-gradient(to bottom, #5b5560, #2f2a33)', boxShadow: '0 12px 18px rgba(70,50,30,0.3)'}} />
        <div style={{position: 'absolute', left: 14, right: 14, bottom: 34, height: 128, borderRadius: 44, transform: `translateY(${up}px)`,
          background: `linear-gradient(to bottom, ${mix(col, '#ffffff', 0.4)}, ${col} 50%, ${mix(col, '#000000', 0.18)})`,
          boxShadow: `inset 0 4px 0 rgba(255,255,255,0.4), 0 14px 0 ${mix(col, '#000000', 0.35)}`,
          display: 'flex', alignItems: 'center', gap: 14, padding: '0 30px 0 22px', boxSizing: 'border-box'}}>
          <Ball d={64} c={CREAM} fg={mix(col, '#000000', 0.2)}>{LETTER(i)}</Ball>
          <div style={{fontFamily: TC, fontWeight: 900, fontSize: ts, lineHeight: 1.2, color: '#fff', textShadow: `0 3px 0 ${mix(col, '#000000', 0.3)}`,
            whiteSpace: 'nowrap', flex: 1, textAlign: 'center'}}>{ls.map((l, j) => <div key={j}>{l}</div>)}</div>
        </div>
      </div>
    </Drop>
  );
};

/** quiz：上方題目膠囊，地上一排黏土按鈕；「……」停頓時小狗東張西望，揭曉時正確按鈕彈起發光＋綠勾 */
const Quiz: React.FC<P> = ({p, cues, dur, f}) => {
  const opts: string[] = (p.options ?? []).slice(0, 4);
  const n = Math.max(1, opts.length);
  const reveal = cue(cues, p.revealCue, Math.round(dur * 0.6));
  const q = lines(String(p.question ?? ''), 16, 2);
  const qs = cardSize(q, 1200, 54, 30, 1.5);
  const slot = 1320 / n, bw = Math.min(400, slot - 40);
  const optAt = Math.max(18, cue(cues, 1, 20));
  const done = f >= reveal;
  const ans = Number(p.answerIndex ?? 0);
  const after = p.afterNote ? lines(String(p.afterNote), 16, 1) : [];
  return (<>
    <Lab f={f} at={6} x={1150} y={300} ls={q} size={qs} lead={<Ball d={qs * 1.15} c={MU}>Q</Ball>} />
    {opts.map((o, i) => (
      <ClayButton key={i} f={f} at={optAt + i * 10} cx={520 + slot * (i + 0.5)} y={650} w={bw} i={i} text={o} reveal={reveal} right={i === ans} />
    ))}
    {opts.length > 0 && <Drop f={f} at={reveal + 6} x={520 + slot * (ans + 0.5) + bw / 2 - 10} y={470} sw={0} h={300}><Tick s={0.6} /></Drop>}
    {after[0] && <Lab f={f} at={reveal + 16} x={1180} y={818} ls={after} size={cardSize(after, 1100, 44)} bg={GR} fg="#fff" />}
    <Pop f={f} at={10} x={400} y={460} out={reveal}>
      <div style={{transform: `rotate(${-8 + 8 * Math.sin(f / 9)}deg)`}}><Clay3D text="？" size={96} color={SKY} font={TC} /></div>
    </Pop>
    <Pup x={250} y={FLOOR} s={PUP} f={f} enter={4} mood={done ? 'grin' : 'happy'} look={done ? 0.8 : Math.sin(f / 16)}
      hops={[reveal + 2, reveal + 26]} bulb={pr(f, reveal, 10)} seed={7} />
  </>);
};

/** recap：奶油色清單板逐項打勾；前面場景用過的物件全部回到桌上；右邊「NEXT」預告；小狗揮手、愛心舉高 */
const Recap: React.FC<P> = ({p, cues, f, icons}) => {
  const take: string[] = (p.takeaway ?? []).slice(0, 3), rec: string[] = (p.recap ?? []).slice(0, 4);
  const nextAt = cue(cues, p.nextCue, 120);
  const BX = 470, BW = 990, BY = 130;
  const rowH = 128, BH = 64 + Math.max(1, take.length) * rowH;
  const teaser = p.nextTeaser ? lines(String(p.nextTeaser), 7, 2) : [];
  const objs = (icons.length ? icons : ['book', 'star', 'trophy']).slice(0, 7);
  const TX = 470, TW = 1410, TY = 676;
  const ow = TW / Math.max(objs.length, 1);
  const ts = Math.min(50, ...take.map((t) => (BW - 210) / longest(lines(t, 16, 1))));
  const takeAt = (i: number) => Math.max(12, cue(cues, p.takeCues?.[i], 20 + i * 40));
  return (<>
    <Drop f={f} at={4} x={BX + BW / 2} y={BY + BH} sw={0} h={300}>
      <div style={{width: BW, height: BH, borderRadius: 40, background: `linear-gradient(to bottom, #ffffff, ${CREAM} 40%, #ece5d8)`,
        boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.8), 0 12px 0 #cfc6b4, 0 28px 34px rgba(70,50,30,0.22)'}} />
    </Drop>
    {take.map((t, i) => {
      const at = takeAt(i), y = BY + 40 + i * rowH;
      const ls = lines(t, 16, 1);
      return (
        <React.Fragment key={i}>
          <Pop f={f} at={10 + i * 4} x={BX + 90} y={y + 92}>
            <div style={{width: 80, height: 80, borderRadius: 22, background: '#fff', boxShadow: 'inset 0 -5px 0 #e3dccf, 0 4px 0 #d6cebf'}} />
          </Pop>
          <Drop f={f} at={at + 4} x={BX + 96} y={y + 96} sw={0} h={200}><Tick s={0.5} /></Drop>
          <Pop f={f} at={at} x={BX + 160 + (longest(ls) * ts) / 2} y={y + 86}>
            <div style={{fontFamily: TC, fontWeight: 900, fontSize: ts, color: NV, whiteSpace: 'nowrap', lineHeight: 1.2}}>{ls[0]}</div>
          </Pop>
        </React.Fragment>
      );
    })}
    <Shadow x={TX + TW / 2} y={TY + 196} w={TW * 1.05} o={pr(f, 18, 8)} />
    <Pop f={f} at={18} x={TX + TW / 2} y={TY + 186}><div style={{width: TW, height: 186, position: 'relative'}}><Table x={0} y={0} w={TW} h={152} /></div></Pop>
    {objs.map((ic, i) => <Obj key={i} f={f} at={26 + i * 7} x={TX + ow * (i + 0.5)} y={TY + 22} icon={ic} size={Math.min(120, ow * 0.7)} />)}
    {rec.map((r, i) => {
      const ls = lines(r, 8, 1);
      return <Lab key={i} f={f} at={34 + i * 6} x={TX + (TW / rec.length) * (i + 0.5)} y={TY + 162} ls={ls} size={cardSize(ls, TW / rec.length - 40, 32, 22)} />;
    })}
    {teaser.length > 0 && (<>
      <Pop f={f} at={nextAt} x={1680} y={330}><Clay3D text="NEXT" size={78} color={OR} /></Pop>
      <Lab f={f} at={nextAt + 6} x={1680} y={330 + 40 + teaser.length * 56 + 30} ls={teaser} size={cardSize(teaser, 360, 46, 26)} bg={NV} fg="#fff" />
    </>)}
    <Pup x={240} y={FLOOR} s={1.2} f={f} enter={4} mood="grin" look={0.6} hops={take.map((_, i) => takeAt(i) + 6)}
      wave={teaser.length ? f >= nextAt : f >= 60} heartUp={pr(f, nextAt + 20, 10)} seed={8} />
  </>);
};

/** qaEnd：最後測驗——題目膠囊＋四塊插在地上的黏土牌；揭曉時正確的牌往上彈、漸變綠色發光＋綠勾，其他慢慢變淡 */
const QaEnd: React.FC<P> = ({p, f}) => {
  const opts: string[] = (p.options ?? []).slice(0, 4);
  const ans = Math.round((p.answerSec ?? 4) * 30);
  const right = Number(p.answerIndex ?? 0);
  const q = lines(String(p.question ?? ''), 18, 2);
  const qs = cardSize(q, 1340, 54, 30, 1.5);
  const slot = 1460 / Math.max(1, opts.length), pw = Math.min(330, slot - 34);
  const k = pr(f, ans, 10);
  return (<>
    <Lab f={f} at={4} x={1140} y={280} ls={q} size={qs} lead={<Ball d={qs * 1.15} c={MU}>Q</Ball>} />
    {opts.map((o, i) => {
      const cx = 410 + slot * (i + 0.5), ok = i === right;
      const col = ok ? mix(CREAM, '#cfeedd', k) : CREAM;
      const up = ok ? -36 * pop(f, ans, 9) : 0;
      const ls = lines(o, 5, 2);
      const ts = Math.max(26, Math.min(46, (pw - 120) / longest(ls)));
      return (
        <Drop key={i} f={f} at={10 + i * 6} x={cx} y={FLOOR} sw={180} h={420}>
          <div style={{position: 'relative', width: pw, height: 440, opacity: ok ? 1 : 1 - 0.45 * k, transform: `translateY(${up}px)`}}>
            {ok && k > 0 && <div style={{position: 'absolute', left: -50, right: -50, top: -50, height: 290, borderRadius: 100, opacity: k,
              background: 'radial-gradient(closest-side, rgba(255,214,90,0.8), rgba(255,214,90,0))'}} />}
            <div style={{position: 'absolute', left: pw / 2 - 12, width: 24, top: 160, bottom: 0, borderRadius: 12,
              background: 'linear-gradient(to right, #8a5a34, #b97a45 50%, #8a5a34)'}} />
            <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 190, borderRadius: 36,
              background: `linear-gradient(to bottom, #ffffff, ${col} 45%, ${mix(col, '#000000', 0.1)})`,
              boxShadow: `inset 0 4px 0 rgba(255,255,255,0.8), 0 12px 0 ${mix(col, '#000000', 0.2)}, 0 24px 28px rgba(70,50,30,0.22)`,
              display: 'flex', alignItems: 'center', gap: 12, padding: '0 30px 0 22px', boxSizing: 'border-box'}}>
              <Ball d={64} c={ok ? mix(COLORS[i % 4], GR, k) : COLORS[i % 4]}>{LETTER(i)}</Ball>
              <div style={{fontFamily: TC, fontWeight: 900, fontSize: ts, lineHeight: 1.2, color: NV, whiteSpace: 'nowrap', flex: 1, textAlign: 'center'}}>
                {ls.map((l, j) => <div key={j}>{l}</div>)}
              </div>
            </div>
          </div>
        </Drop>
      );
    })}
    {opts.length > 0 && <Drop f={f} at={ans + 6} x={410 + slot * (right + 0.5) + pw / 2 - 20} y={FLOOR - 440 - 6} sw={0} h={300}><Tick s={0.6} /></Drop>}
    <Pup x={205} y={FLOOR} s={1.1} f={f} enter={4} mood={f >= ans ? 'grin' : 'happy'} look={f >= ans ? 0.8 : Math.sin(f / 16)}
      hops={[ans + 2, ans + 30]} bulb={pr(f, ans, 10)} seed={9} />
  </>);
};

const SCENES: Record<string, React.FC<P>> = {title: Title, scenario: Scenario, definition: Definition, cards: Cards, vs: Vs, stat: Stat, quiz: Quiz, recap: Recap, qaEnd: QaEnd};

/** 左上章節膠囊的文字 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chapterLabel = (type: string, p: any): string => {
  const pick = (v: unknown, fb: string) => (v ? lines(String(v), 12, 1)[0] ?? fb : fb);
  switch (type) {
    case 'scenario': return pick(p.heading, '想一想');
    case 'definition': return pick(p.label ?? p.heading, '關鍵觀念');
    case 'cards': return pick(p.heading, '重點整理');
    case 'vs': return pick(p.heading, '比一比');
    case 'stat': return pick(p.heading, '關鍵數字');
    case 'quiz': return '小測驗';
    case 'recap': return '重點回顧';
    case 'qaEnd': return '最後測驗';
    default: return '';
  }
};

/** 一整頁（自帶不透明攝影棚背景，翻頁時才能蓋住下一頁）；鏡頭整段慢慢推近 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Page: React.FC<{s: any; n?: number; icons: string[]}> = ({s, n, icons}) => {
  const f = useCurrentFrame();
  const Comp = SCENES[s.type] ?? Definition;
  const z = 1 + 0.03 * interpolate(f, [0, s.dur + TURN], [0, 1], clamp);
  const label = chapterLabel(s.type, s.props ?? {});
  return (
    <AbsoluteFill style={{background: STAGE_BG, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${z})`, transformOrigin: '960px 600px'}}>
        <Comp p={s.props ?? {}} cues={s.cues ?? []} dur={s.dur} f={f} icons={icons} />
      </div>
      {label && <Chapter f={f} at={6} n={n} label={label} />}
    </AbsoluteFill>
  );
};

const turnEase = Easing.bezier(0.45, 0.05, 0.35, 1);

/** 一頁＋它的翻頁：f ≥ dur 時整頁捲角翻走（PageTurn 標 data-qa="ignore"：離場中的舊頁不算版面） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Leaf: React.FC<{s: any; n?: number; icons: string[]}> = ({s, n, icons}) => {
  const f = useCurrentFrame();
  const page = <Page s={s} n={n} icons={icons} />;
  if (f < s.dur) return page;
  return <PageTurn p={turnEase(Math.min(1, (f - s.dur) / TURN))}>{page}</PageTurn>;
};

/** 收集分鏡裡用過的圖示（recap 讓物件回到桌上） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const usedIcons = (scenes: any[]): string[] => {
  const out: string[] = [];
  const seen: string[] = [];
  const add = (v: unknown) => {   // 同一個黏土物件只放一次（⏰ 和 ⏱️ 都是鬧鐘）
    if (typeof v !== 'string' || !v) return;
    const key = EMOJI_TO_CLAY[v] ?? v;
    if (!seen.includes(key)) { seen.push(key); out.push(v); }
  };
  for (const s of scenes) {
    const p = s.props ?? {};
    add(p.sketch ?? p.icon);
    for (const c of p.cards ?? []) add(c.sketch ?? c.icon);
    add(p.left?.sketch ?? p.left?.icon);
    add(p.right?.sketch ?? p.right?.icon);
  }
  return out;
};

export const TemplateL: React.FC<TplSpec> = (spec) => {
  const f = useCurrentFrame();
  const cap = captionAt(spec, f, 8);
  // 緊接上一句（間隔 ≤10 格）時直接換字、不淡入：淡入的前 2 格字幕太淡，會被最終品檢判成字幕閃爍
  const capPrev = cap ? spec.captions[spec.captions.indexOf(cap) - 1] : undefined;
  const capO = !cap ? 0 : capPrev && cap.from - capPrev.to <= 10 ? 1 : interpolate(f, [cap.from - 2, cap.from + 3], [0, 1], clamp);
  const capS = cap ? Math.max(30, Math.min(42, 1640 / Math.max(1, textW(cap.text)))) : 42;
  const fade = Math.max(0, spec.brand ? 0 : 1 - f / 8, (f - (spec.totalFrames - 12)) / 12);
  const icons = usedIcons(spec.scenes);
  let k = 0;
  const nums = spec.scenes.map((s) => (s.type === 'title' ? undefined : ++k));
  const order = spec.scenes.map((s, i) => ({s, i})).reverse();   // 早的頁面疊在上面（翻走時露出下一頁）
  return (
    <AbsoluteFill style={{backgroundColor: BGC, overflow: 'hidden'}}>
      <ClayDefs />
      {order.map(({s, i}) => {
        const last = i === spec.scenes.length - 1;
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.dur + (last ? 0 : TURN)}>
            <Leaf s={s} n={nums[i]} icons={icons} />
          </Sequence>
        );
      })}
      {/* 字幕帶：固定淡色漸層底（y 892 以下），翻頁層在它之下、字幕永遠在最上層 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 892, bottom: 0,
        background: 'linear-gradient(to bottom, rgba(226,220,208,0) 0px, rgba(226,220,208,0.96) 46px, rgba(224,218,206,1) 100%)'}} />
      {cap && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 962, display: 'flex', justifyContent: 'center', opacity: capO}}>
          <div data-qa="caption" style={{fontFamily: TC, fontWeight: 900, fontSize: capS, color: '#fff', letterSpacing: 2, whiteSpace: 'nowrap', lineHeight: 1.3,
            background: NV, padding: `${Math.round(capS * 0.22)}px ${Math.round(capS * 0.7)}px`, borderRadius: Math.round(capS * 0.4),
            boxShadow: '0 6px 14px rgba(0,0,0,0.18)'}}>{cap.text}</div>
        </div>
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
