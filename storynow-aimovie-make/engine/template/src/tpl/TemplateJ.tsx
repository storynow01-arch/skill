/* 範本 J：地圖風 Map Quest —— 整支影片是一張羊皮紙探索地圖，每個場景＝路線上的一站：
   鏡頭沿紅色虛線路線平移到下一站（中途微拉遠看到大地圖），到站時圖釘「咚」地插下，地標一筆一筆描出再上水彩，註記卡依旁白彈出。
   招牌特徵（概念忠實度）：①羊皮紙地圖＋等高線、山、樹、湖、海岸、燒黃邊 ②紅色虛線路線一站一站畫過去 ③紅色圖釘落下（留在地圖上＝走過的路）
   ④手繪墨線地標＋水彩上色（先描線再上色）⑤註記卡（雙框紙卡）、紅緞帶、蠟封章、指南針 ⑥白字黑邊字幕＋畫面下緣木桌色漸層底。
   品檢約束：鏡頭連續平移（不取餘數、不跳回）、閃動一律慢速、畫面內容一律 y<900、隨機一律 random(seed)、紙紋只用漸層與少量形狀。
   場景語彙同範本 A～D（title／scenario／definition／cards／vs／stat／quiz／recap／qaEnd），欄位見 templates/範本風格_場景語彙.md。 */
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {QaProbe} from '../QaProbe';
import {
  CINZEL, CREAM, CheckSeal, CompassRose, Cross, DashRoute, GOLD, INK, KAI, LEAF, MUTED, MapText, Mount, NoteCard, P, PAPER, PAPER2, RED, RED_D, RedRing,
  Ribbon, SERIF, Stroke, TABLE, Tree, WaxSeal, cardBox, clamp, fitLines, isAscii, lines, pop, pr, smart, sparkle,
} from '../lib/map/kit';
import {MapIcon} from '../lib/map/icons';
import {ANCHOR, POST, PRE, Terrain, anchorOf, camAt, stationOrigin} from '../lib/map/world';
import {TplSpec, captionAt, cue, sceneIndex, textW} from './common';
import {RollNum, rollProgress} from '../lib/rollnum';
import {BrandLogo} from './brand';

const MIN_AT = 14;   // 鏡頭快到站時才開始出現物件
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SP = {p: any; cues: number[]; dur: number; f: number; i: number; anchors: P[]};
const A = (cues: number[], i: number | undefined, fb: number) => Math.max(MIN_AT, cue(cues, i, fb));
const LETTER = (i: number) => String.fromCharCode(65 + i);

/** 三次貝茲取樣成折線（站內小路用） */
const cubicPts = (a: P, c1: P, c2: P, b: P, n = 40): P[] => Array.from({length: n + 1}, (_, k) => {
  const t = k / n, u = 1 - t;
  return {x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y};
});
/** 站內 SVG 圖層（座標＝站內 1920×1080） */
const Layer: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{children}</svg>
);
/** 置中文字區塊（多行） */
const TextBox: React.FC<{ls: string[]; size: number; color?: string; font?: string; style?: React.CSSProperties; lh?: number}> = (
  {ls, size, color = INK, font = SERIF, style, lh = 1.22}) => (
  <div style={{fontFamily: font, fontWeight: font === KAI ? 700 : 900, fontSize: size, color, lineHeight: lh, letterSpacing: size * 0.04, textAlign: 'center',
    whiteSpace: 'nowrap', ...style}}>
    {ls.map((l, i) => <div key={i}>{l}</div>)}
  </div>
);
const center: React.CSSProperties = {position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'};

/* ───────── 9 種站（站內座標 1920×1080，內容一律 y<900；左上 0～620×0～130 留給 HUD） ───────── */

/** title：上方紅緞帶（eyebrow）＋中央卷軸展開（en／大標題／副標）＋左下起點岔路問號＋右下大指南針 */
const Title: React.FC<SP> = ({p, f}) => {
  const title = String(p.title ?? ''), eyebrow = p.eyebrow ? String(p.eyebrow) : '', sub = p.subtitle ? String(p.subtitle) : '', en = p.en ? String(p.en) : '';
  const t0 = 12, un = pr(f, t0, 22);
  const tl = lines(title, 10, 2);
  const ts = Math.min(tl.length > 1 ? 80 : 116, fitLines(tl, 1000, 116, 52, 0.06));
  const sh = 400;
  const S = ANCHOR.title;
  const ends: P[] = [{x: 110, y: 480}, {x: 330, y: 650}, {x: 640, y: 770}, {x: 1000, y: 838}];
  return (<>
    <Layer>
      <Mount x={250} y={250} /><Mount x={1720} y={330} s={0.9} /><Tree x={1420} y={830} /><Tree x={1470} y={860} s={0.8} /><Tree x={90} y={300} />
      {ends.map((e, i) => {
        const c = {x: (S.x + e.x) / 2 + (e.y - S.y) * 0.25, y: (S.y + e.y) / 2 - (e.x - S.x) * 0.25};
        return (
          <g key={i}>
            <Stroke d={`M${S.x} ${S.y}Q${c.x} ${c.y} ${e.x} ${e.y}`} p={pr(f, 22 + i * 6, 22)} w={8} color={RED} />
            <text x={e.x} y={e.y - 20} textAnchor="middle" fontFamily={SERIF} fontWeight={900} fontSize={84} fill={RED} opacity={pr(f, 38 + i * 6, 10)}>？</text>
          </g>
        );
      })}
      <g transform="translate(1660 700)" opacity={pr(f, 18, 16)}><CompassRose size={120} rot={Math.sin(f / 70) * 4 + (1 - pr(f, 18, 30)) * -90} /></g>
    </Layer>
    <MapText f={f} at={14} x={S.x + 64} y={S.y - 26} text="起點" size={44} anchor="l" />
    {eyebrow && <Ribbon f={f} at={6} cx={960} y={70} text={eyebrow} size={50} maxW={900} />}
    {f >= t0 && (
      <div style={{position: 'absolute', left: 360, top: 230, width: 1200, height: sh}}>
        <div style={{...center, inset: '20px 30px', background: PAPER2, border: `5px solid ${INK}`, gap: 6,
          boxShadow: `inset 0 0 60px rgba(140,90,40,0.35), 12px 16px 0 rgba(40,20,5,0.35)`, clipPath: `inset(0 ${(1 - un) * 50}% 0 ${(1 - un) * 50}%)`}}>
          {en && <div style={{fontFamily: isAscii(en) ? CINZEL : SERIF, fontWeight: 700, fontSize: Math.min(30, 1000 / Math.max(1, textW(en) * 1.5)), letterSpacing: 8, color: RED, whiteSpace: 'nowrap'}}>{en}</div>}
          {tl.length > 0 && <TextBox ls={tl} size={ts} lh={1.16} style={{letterSpacing: ts * 0.06}} />}
          {sub && <div style={{fontFamily: KAI, fontWeight: 700, fontSize: fitLines([sub], 980, 58, 30), color: RED, letterSpacing: 6, whiteSpace: 'nowrap',
            opacity: pr(f, t0 + 18, 14), transform: `translateY(${(1 - pr(f, t0 + 18, 14)) * 20}px)`}}>{sub}</div>}
        </div>
        {[-1, 1].map((s) => (
          <div key={s} style={{position: 'absolute', top: 0, width: 46, height: sh, borderRadius: 23, boxSizing: 'border-box',
            background: 'linear-gradient(90deg,#6b4226,#b9864e 45%,#6b4226)', border: `4px solid ${INK}`, left: 600 - 23 + s * un * 575}} />
        ))}
      </div>
    )}
  </>);
};

/** scenario：岔路口——左邊情境地標＋標題註記，路口分出幾條小路通往右側註記卡；最後一張是問題（紅框＋紅路＋大問號） */
const Scenario: React.FC<SP> = ({p, cues, f}) => {
  const pills: string[] = p.pills ?? [];
  const n = Math.max(1, pills.length);
  const lastProblem = p.lastIsProblem !== false;
  const node = ANCHOR.scenario;
  const H0 = 170, H1 = 860, gap = 22;
  const ch = Math.min(170, (H1 - H0 - (n - 1) * gap) / n), y0 = H0 + (H1 - H0 - (n * ch + (n - 1) * gap)) / 2;
  const CX = 920, CW = 920;
  const hl = lines(String(p.heading ?? ''), 10, 2), hs = fitLines(hl, 660, 58, 32);
  const hh = 84 + hl.length * hs * 1.22;   // 多留 20：小英文 CROSSROADS 和標題字之間要有間距（示範片 6 字標題曾重疊 18%）
  const ats = pills.map((_, i) => A(cues, p.cueMap?.[i], 20 + i * 30));
  const probAt = lastProblem && pills.length ? ats[pills.length - 1] : 1e9;
  return (<>
    <Layer>
      <Mount x={250} y={830} /><Mount x={400} y={856} s={0.8} /><Tree x={700} y={270} /><Tree x={772} y={300} s={0.85} /><Tree x={720} y={860} s={0.9} />
      {pills.map((_, i) => {
        const last = lastProblem && i === pills.length - 1;
        const T = {x: CX - 6, y: y0 + i * (ch + gap) + ch / 2};
        const pts = cubicPts(node, {x: node.x + 200, y: node.y}, {x: T.x - 190, y: T.y}, T);
        return <DashRoute key={i} pts={pts} p={pr(f, ats[i] - 8, 14)} w={last ? 9 : 7} color={last ? RED : INK} head={false} />;
      })}
      <circle cx={node.x} cy={node.y} r={18} fill={PAPER} stroke={INK} strokeWidth={6} opacity={pr(f, 12, 8)} />
    </Layer>
    {hl.length > 0 && (
      <NoteCard f={f} at={MIN_AT} x={60} y={160} w={760} h={hh} rot={-1.2}>
        <div style={{...center, inset: 0, paddingTop: 6}}>
          <div style={{fontFamily: CINZEL, fontWeight: 700, fontSize: 22, letterSpacing: 6, color: RED, marginBottom: 12}}>CROSSROADS</div>
          <TextBox ls={hl} size={hs} />
        </div>
      </NoteCard>
    )}
    <MapIcon icon={p.sketch ?? p.icon} f={f} at={MIN_AT + 2} x={120} y={Math.max(360, 160 + hh + 30)} size={300} />
    {f >= probAt && <MapText f={f} at={probAt + 4} x={720} y={380} text="？" size={130} color={RED} rot={10} ls={0} />}
    {pills.map((x, i) => {
      const last = lastProblem && i === pills.length - 1;
      const ls = smart(x, CW - 180, 58);
      return (
        <NoteCard key={i} f={f} at={ats[i]} x={CX} y={y0 + i * (ch + gap)} w={CW} h={ch} rot={i % 2 ? 0.8 : -0.6}
          border={last ? RED : INK} bg={last ? '#f6e1cc' : PAPER2}>
          <WaxSeal f={f} at={ats[i] + 3} x={66} y={ch / 2} r={Math.min(36, ch * 0.26)} text={last ? '？' : String(i + 1)} />
          <div style={{...center, left: 130, right: 30, top: 0, bottom: 0}}>
            <TextBox ls={ls} size={fitLines(ls, CW - 180, 58, 28)} color={last ? RED : INK} />
          </div>
        </NoteCard>
      );
    })}
  </>);
};

/** definition 大字的一行：highlight 那段在 hlAt 時刷上金色螢光、字變紅 */
const BigLine: React.FC<{text: string; hl: string; hlAt: number; f: number}> = ({text, hl, hlAt, f}) => {
  const i = hl ? text.indexOf(hl) : -1;
  const k = pr(f, hlAt, 12);
  if (i < 0) return <div>{text}</div>;
  return (
    <div>
      {text.slice(0, i)}
      <span style={{backgroundImage: `linear-gradient(transparent 60%, rgba(224,177,63,0.75) 60%, rgba(224,177,63,0.75) 94%, transparent 94%)`,
        backgroundRepeat: 'no-repeat', backgroundSize: `${k * 100}% 100%`, color: k > 0.5 ? RED : INK}}>{hl}</span>
      {text.slice(i + hl.length)}
    </div>
  );
};

/** definition：大型地標（紅圈圈起）＋地標頂的名詞旗幟（label）＋右側大註記卡（bigText，重點刷金）＋下方小便條（sideNotes） */
const Definition: React.FC<SP> = ({p, cues, f}) => {
  const big = String(p.bigText ?? p.title ?? ''), hl = String(p.highlight ?? '');
  const notes: string[] = (p.sideNotes ?? []).slice(0, 3);
  const hasN = notes.length > 0;
  const label = p.label ? String(p.label) : '';
  const at0 = A(cues, p.cueMap?.[0], MIN_AT), hlAt = Math.max(at0 + 14, cue(cues, p.cueMap?.[1], at0 + 30));
  const bl = (() => {   // 換行時盡量不要把 highlight 切成兩半
    const ls = lines(big, 10, 2);
    if (hl && ls.length === 2 && !ls.some((ln) => ln.includes(hl)) && big.includes(hl)) {
      const j = big.indexOf(hl), cut = j + hl.length <= 12 ? j + hl.length : j;
      return [big.slice(0, cut), big.slice(cut)].filter(Boolean);
    }
    return ls;
  })();
  const bs = fitLines(bl, 940, 104, 50);
  const card = hasN ? {x: 790, y: 200, w: 1050, h: 410} : {x: 790, y: 250, w: 1050, h: 500};
  const fs = label ? Math.min(46, 440 / Math.max(1, textW(label) * 1.1)) : 46;
  const fw = label ? Math.min(560, textW(label) * fs * 1.1 + 100) : 0;
  const hoist = pr(f, 12, 20);
  const fy = 330 - 150 * hoist;
  const wv = Math.sin(f / 14) * 8;
  const nw = hasN ? (1050 - (notes.length - 1) * 24) / notes.length : 0;
  return (<>
    <Layer>
      <Tree x={110} y={420} /><Tree x={150} y={460} s={0.8} /><Mount x={120} y={860} s={0.9} /><Tree x={740} y={300} />
      {label && (<>
        <line x1={420} y1={350} x2={420} y2={170} stroke={INK} strokeWidth={8} strokeLinecap="round" opacity={pr(f, 8, 8)} />
        <circle cx={420} cy={166} r={9} fill={GOLD} stroke={INK} strokeWidth={4} opacity={pr(f, 8, 8)} />
        <path d={`M424 ${fy}Q${424 + fw * 0.5} ${fy - 10 + wv} ${424 + fw} ${fy}L${424 + fw - 34} ${fy + 44}L${424 + fw} ${fy + 88}Q${424 + fw * 0.5} ${fy + 78 + wv} 424 ${fy + 88}Z`}
          fill={RED} stroke={RED_D} strokeWidth={4} opacity={pr(f, 12, 8)} />
      </>)}
      <RedRing cx={420} cy={590} rx={270} ry={245} p={pr(f, at0 + 12, 22)} />
    </Layer>
    {label && f >= 12 && (
      <div style={{...center, left: 430, top: fy + 2, width: fw - 50, height: 84, fontFamily: SERIF, fontWeight: 900, fontSize: fs, color: CREAM,
        whiteSpace: 'nowrap', letterSpacing: 4, opacity: pr(f, 14, 8)}}>{label}</div>
    )}
    <MapIcon icon={p.sketch ?? p.icon ?? 'lighthouse'} f={f} at={MIN_AT} x={180} y={340} size={480} />
    <NoteCard f={f} at={at0} x={card.x} y={card.y} w={card.w} h={card.h} rot={0.6}>
      <div style={{...center, inset: 0, gap: 10}}>
        <div style={{fontFamily: CINZEL, fontWeight: 700, fontSize: 24, letterSpacing: 8, color: RED}}>DEFINITION</div>
        <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: bs, lineHeight: 1.22, color: INK, letterSpacing: bs * 0.04, textAlign: 'center', whiteSpace: 'nowrap'}}>
          {bl.map((ln, i) => <BigLine key={i} text={ln} hl={hl} hlAt={hlAt} f={f} />)}
        </div>
      </div>
    </NoteCard>
    {notes.map((t, i) => {
      const at = A(cues, p.noteCues?.[i], at0 + 40 + i * 15);
      const ls = lines(t, 8, 2);
      return (
        <NoteCard key={i} f={f} at={at} x={790 + i * (nw + 24)} y={660} w={nw} h={170} rot={i % 2 ? 1.2 : -1}>
          <svg width={nw} height={40} style={{position: 'absolute', left: 0, top: -18}}><circle cx={nw / 2} cy={20} r={13} fill={RED} stroke={RED_D} strokeWidth={3} /></svg>
          <div style={{...center, inset: 0}}><TextBox ls={ls} size={fitLines(ls, nw - 70, 50, 26)} font={KAI} color={MUTED} /></div>
        </NoteCard>
      );
    })}
  </>);
};

/** cards：上方紅緞帶標題，中段 2～4 個小地標沿一條小路排開（路線依旁白一站一站畫過去），下方各自的註記卡；footer＝下緣印章條 */
const Cards: React.FC<SP> = ({p, cues, f}) => {
  const cards: {icon?: string; sketch?: string; title?: string; note?: string}[] = (p.cards ?? []).slice(0, 4);
  const n = Math.max(1, cards.length);
  const slot = 1760 / n, s = Math.min(220, slot * 0.5);
  const footer = p.footer ? String(p.footer) : '';
  const ch = footer ? 212 : 280, cw = slot - 36, TY = 528;
  const ats = cards.map((_, i) => A(cues, p.cueMap?.[i], 20 + i * 30));
  const lastAt = ats.length ? ats[ats.length - 1] : 20;
  const footAt = Math.max(lastAt + 12, cue(cues, cues.length - 1, lastAt + 12));
  const cx = (i: number) => 80 + slot * (i + 0.5);
  const stops = [ANCHOR.cards, ...cards.map((_, i) => ({x: cx(i), y: TY}))];
  const fsF = footer ? Math.min(46, 1100 / Math.max(1, textW(footer) * 1.06)) : 46;
  const fW = footer ? Math.min(1240, textW(footer) * fsF * 1.06 + 140) : 0;
  return (<>
    <Layer>
      {cards.map((_, i) => {
        const a = stops[i], b = stops[i + 1];
        const pts = Array.from({length: 31}, (_, k) => ({x: a.x + (b.x - a.x) * (k / 30), y: TY + Math.sin((a.x + (b.x - a.x) * (k / 30)) / 70) * 12}));
        return <DashRoute key={i} pts={pts} p={pr(f, ats[i] - 12, 12)} w={7} f={f} />;
      })}
      {cards.map((_, i) => {
        const k = pop(f, ats[i]);
        return k > 0 ? <g key={`s${i}`} transform={`translate(${cx(i)} ${TY + Math.sin(cx(i) / 70) * 12}) scale(${k})`}>
          <circle r={16} fill={RED} stroke={RED_D} strokeWidth={4} /><circle r={6} fill={CREAM} />
        </g> : null;
      })}
    </Layer>
    {p.heading && <Ribbon f={f} at={8} cx={960} y={150} text={String(p.heading)} size={50} maxW={1300} h={100} />}
    {cards.map((c, i) => {
      const at = ats[i];
      const title = String(c.title ?? '');
      const ts = fitLines([title], cw - 70, 54, 28);
      const nl = c.note ? lines(c.note, Math.max(4, Math.floor((cw - 50) / 40)), 2) : [];
      const ns = fitLines(nl.length ? nl : [' '], cw - 50, 38, 24);
      return (
        <React.Fragment key={i}>
          <MapIcon icon={c.sketch ?? c.icon} f={f} at={at} x={cx(i) - s / 2} y={TY - 22 - s} size={s} />
          <NoteCard f={f} at={at + 4} x={cx(i) - cw / 2} y={566} w={cw} h={ch} rot={i % 2 ? 1 : -1}>
            <WaxSeal f={f} at={at + 8} x={14} y={14} r={30} text={String(i + 1)} />
            <div style={{...center, inset: '14px 20px', gap: 8}}>
              {title && <TextBox ls={[title]} size={ts} />}
              {nl.length > 0 && <TextBox ls={nl} size={ns} font={KAI} color={MUTED} lh={1.25} />}
            </div>
          </NoteCard>
        </React.Fragment>
      );
    })}
    {footer && (
      <NoteCard f={f} at={footAt} x={960 - fW / 2} y={800} w={fW} h={80} border={RED}>
        <div style={{...center, inset: 0}}><TextBox ls={[footer]} size={fsF} color={RED} /></div>
      </NoteCard>
    )}
  </>);
};

/** vs：同一個路口分出兩條路——上路通往左方案、下路通往右方案；危險那條是死路（墨色虛線＋紅叉），正確那條是紅色路線＋打勾 */
const Vs: React.FC<SP> = ({p, cues, f}) => {
  const node = ANCHOR.vs;
  const at1 = A(cues, p.cueMap?.[1], 40);
  const mid = !p.mid || String(p.mid).toLowerCase() === 'vs' ? 'VS' : String(p.mid);
  const fp = p.footerPill ? String(p.footerPill) : '';
  const footAt = Math.max(at1 + 14, cue(cues, cues.length - 1, at1 + 30) + 6);
  const sides = [p.left ?? {}, p.right ?? {}] as {frame?: string; icon?: string; sketch?: string; text?: string}[];
  const CY = [170, 560], CH = 270, CX = 900, CW = 940;
  const ats = [A(cues, p.cueMap?.[0], MIN_AT), at1];
  const fsF = fp ? Math.min(44, 640 / Math.max(1, textW(fp) * 1.06)) : 44;
  return (<>
    <Layer>
      <Tree x={150} y={280} /><Tree x={215} y={310} s={0.85} /><Mount x={520} y={230} s={0.9} /><Mount x={560} y={880} s={0.8} />
      {sides.map((d, i) => {
        const T = {x: CX - 20, y: CY[i] + CH / 2};
        const pts = cubicPts(node, {x: node.x + 230, y: node.y}, {x: T.x - 230, y: T.y}, T);
        const danger = d.frame === 'danger', ok = d.frame === 'success';
        const pp = pr(f, ats[i] - 10, 16);
        return (
          <g key={i}>
            <DashRoute pts={pts} p={pp} w={ok ? 10 : 8} color={danger ? INK : RED} head={false} glow={ok ? pr(f, ats[i] + 10, 14) : 0} />
            {danger && <Cross x={T.x - 34} y={T.y} s={24} p={pr(f, ats[i] + 8, 12)} />}
          </g>
        );
      })}
      <circle cx={node.x} cy={node.y} r={18} fill={PAPER} stroke={INK} strokeWidth={6} opacity={pr(f, 12, 8)} />
    </Layer>
    <WaxSeal f={f} at={at1 - 4} x={650} y={500} r={52} text={mid} />
    {sides.map((d, i) => {
      const danger = d.frame === 'danger', ok = d.frame === 'success';
      const ls = lines(String(d.text ?? ''), 8, 3);
      const at = ats[i];
      return (
        <NoteCard key={i} f={f} at={at} x={CX} y={CY[i]} w={CW} h={CH} rot={i ? 0.8 : -0.8} border={danger ? '#7a2a20' : ok ? RED : INK}
          bg={danger ? '#ece0c6' : PAPER2}>
          <MapIcon icon={d.sketch ?? d.icon} f={f} at={at + 2} x={36} y={(CH - 190) / 2} size={190} />
          <div style={{...center, left: 250, right: 30, top: 0, bottom: 0}}>
            {ls.length > 0 && <TextBox ls={ls} size={fitLines(ls, CW - 300, 62, 30)} />}
          </div>
          {(danger || ok) && f >= at + 8 && (
            <div style={{position: 'absolute', right: 26, top: -26, padding: '4px 14px', border: `4px solid ${RED}`, borderRadius: 6, background: 'rgba(244,232,198,0.95)',
              fontFamily: SERIF, fontWeight: 900, fontSize: 30, color: RED, whiteSpace: 'nowrap',
              transform: `rotate(${i ? 4 : -4}deg) scale(${2 - Math.min(1, pop(f, at + 8, 12))})`, opacity: pr(f, at + 8, 6)}}>{danger ? '此路不通' : '正確路線'}</div>
          )}
          {ok && <svg width={80} height={80} style={{position: 'absolute', right: 24, bottom: 18, overflow: 'visible'}}><CheckSeal x={40} y={40} f={f} at={at + 14} r={30} /></svg>}
        </NoteCard>
      );
    })}
    {fp && (
      <NoteCard f={f} at={footAt} x={60} y={776} w={Math.min(760, textW(fp) * fsF * 1.06 + 100)} h={84} border={RED} rot={-1}>
        <div style={{...center, inset: 0}}><TextBox ls={[fp]} size={fsF} color={RED} /></div>
      </NoteCard>
    )}
  </>);
};

/** stat：石碑從地面升起，數字刻在碑上並滾輪式往上數（lib/rollnum：每位上下滑動、前快後慢，不逐格換字）；右側說明卡＋補充便條 */
const Stat: React.FC<SP> = ({p, cues, f}) => {
  const at = A(cues, 0, MIN_AT) + 10;
  const raw = String(p.value ?? ''), suf = String(p.suffix ?? '');
  const units = raw.length * 0.62 + (suf ? (isAscii(suf) ? suf.length * 0.32 : suf.length * 0.5) : 0);
  const size = Math.min(250, 520 / Math.max(1, units));
  const label = lines(String(p.label ?? ''), 9, 2), sub = lines(String(p.sub ?? ''), 12, 2);
  const rise = pr(f, MIN_AT - 4, 18);
  const done = rollProgress(f, at, 40);
  return (<>
    <Layer>
      <Tree x={110} y={500} /><Tree x={150} y={540} s={0.8} /><Mount x={1780} y={860} s={0.8} /><Tree x={1650} y={870} s={0.8} />
      <g transform={`translate(0 ${(1 - rise) * 160})`} opacity={Math.min(1, rise * 3)}>
        <path d="M250 860V345Q250 200 560 200Q870 200 870 345V860Z" fill="#d6cbb0" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        <path d="M285 840V355Q285 236 560 236Q835 236 835 355V840" fill="none" stroke="#b3a585" strokeWidth={4} />
        <path d="M800 420l-26 40l18 22l-14 30" fill="none" stroke="#8f8165" strokeWidth={4} strokeLinecap="round" />
        <path d="M310 700l30 26l-6 30" fill="none" stroke="#8f8165" strokeWidth={4} strokeLinecap="round" />
        <path d="M200 810H920V866H200Z" fill="#b9ab8c" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        <path d="M232 812q30 -30 70 -6q30 -26 60 2Z" fill={LEAF} opacity={0.85} />
        <path d="M770 812q30 -26 60 -2q26 -22 54 2Z" fill={LEAF} opacity={0.85} />
      </g>
      {f >= MIN_AT + 10 && f < MIN_AT + 40 && [0, 1, 2, 3, 4].map((k) => {
        const t = (f - MIN_AT - 10) / 30;
        return <circle key={k} cx={230 + k * 165 + (k - 2) * t * 40} cy={858 - t * 22} r={14 + t * 30} fill="#c9b48a" opacity={0.55 * (1 - t)} />;
      })}
      {done > 0.98 && [0, 1, 2, 3].map((k) => {
        const pts = [[330, 300], [790, 330], [320, 640], [800, 620]][k];
        return <path key={k} d={sparkle(pts[0], pts[1], 18)} fill={GOLD} opacity={0.55 + 0.35 * Math.sin(f / 9 + k * 1.7)} />;
      })}
    </Layer>
    {rise > 0.6 && (
      <div style={{...center, left: 270, width: 580, top: 250, height: 520, transform: `translateY(${(1 - rise) * 160}px)`}}>
        <div style={{fontFamily: CINZEL, fontWeight: 700, fontSize: 30, letterSpacing: 10, color: '#6b5a44', marginBottom: 6}}>MILESTONE</div>
        <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: size, lineHeight: 1, color: '#4a3b2a', whiteSpace: 'nowrap', display: 'flex', alignItems: 'flex-end',
          textShadow: '3px 3px 0 rgba(255,255,255,0.55), -2px -2px 0 rgba(60,40,20,0.35)', opacity: f >= at ? 1 : 0}}>
          <RollNum text={raw} p={done} digitW={0.6} />
          {suf && <span style={{fontSize: size * 0.42, marginLeft: size * 0.06, marginBottom: size * 0.08}}>{suf}</span>}
        </div>
      </div>
    )}
    {label.length > 0 && (
      <NoteCard f={f} at={at + 6} x={1010} y={230} w={830} h={290} rot={-0.8}>
        <div style={{...center, inset: 0}}><TextBox ls={label} size={fitLines(label, 740, 68, 30)} /></div>
      </NoteCard>
    )}
    {sub.length > 0 && (
      <NoteCard f={f} at={at + 18} x={1010} y={570} w={830} h={190} rot={1}>
        <div style={{...center, inset: 0}}><TextBox ls={sub} size={fitLines(sub, 740, 48, 26)} font={KAI} color={MUTED} /></div>
      </NoteCard>
    )}
  </>);
};

/** quiz：三岔路——上方題目卷、左邊路口分出 2～3 條路通往選項；揭曉時正確那條路亮成紅色路線（金色光暈），其他路變淡打叉 */
const Quiz: React.FC<SP> = ({p, cues, dur, f}) => {
  const opts: string[] = (p.options ?? []).slice(0, 3);
  const n = Math.max(1, opts.length);
  const reveal = cue(cues, p.revealCue, Math.round(dur * 0.6));
  const node = ANCHOR.quiz;
  const ys = n === 3 ? [370, 550, 730] : n === 2 ? [430, 640] : [550];
  const CX = 980, CW = 840, CH = 130;
  const q = lines(String(p.question ?? ''), 20, 2);
  const optAt = A(cues, 1, 24);
  const done = f >= reveal;
  const an = p.afterNote ? String(p.afterNote) : '';
  const fsA = an ? Math.min(42, 600 / Math.max(1, textW(an) * 1.06)) : 42;
  return (<>
    <Layer>
      <Tree x={120} y={420} /><Tree x={180} y={450} s={0.85} /><Mount x={560} y={420} s={0.8} />
      {opts.map((_, i) => {
        const T = {x: CX - 16, y: ys[i] + CH / 2};
        const pts = cubicPts(node, {x: node.x + 300, y: node.y}, {x: T.x - 260, y: T.y}, T);
        const right = i === p.answerIndex;
        return (
          <g key={i}>
            <g opacity={right ? 1 : 1 - 0.7 * pr(f, reveal, 10)}>
              <DashRoute pts={pts} p={pr(f, optAt + i * 12 - 6, 12)} w={7} color={INK} head={false} />
            </g>
            {right && <DashRoute pts={pts} p={pr(f, reveal, 18)} w={11} color={RED} f={f} glow={pr(f, reveal + 12, 12)} />}
            {!right && <Cross x={T.x - 40} y={T.y} s={18} p={pr(f, reveal + 6, 10)} />}
          </g>
        );
      })}
      <circle cx={node.x} cy={node.y} r={18} fill={PAPER} stroke={INK} strokeWidth={6} opacity={pr(f, 12, 8)} />
    </Layer>
    <NoteCard f={f} at={MIN_AT} x={180} y={150} w={1560} h={190} rot={-0.5}>
      <WaxSeal f={f} at={MIN_AT + 4} x={90} y={95} r={50} text="Q" />
      <div style={{...center, left: 170, right: 40, top: 0, bottom: 0}}>{q.length > 0 && <TextBox ls={q} size={fitLines(q, 1300, 60, 32)} />}</div>
    </NoteCard>
    {opts.map((o, i) => {
      const at = optAt + i * 12, right = i === p.answerIndex;
      const ls = lines(o, 12, 2);
      return (
        <NoteCard key={i} f={f} at={at} x={CX} y={ys[i]} w={CW} h={CH} rot={i % 2 ? 0.6 : -0.6} border={done && right ? RED : INK}
          dim={done && !right ? 1 - 0.45 * pr(f, reveal, 10) : 1}>
          <WaxSeal f={f} at={at + 3} x={64} y={CH / 2} r={38} text={LETTER(i)} />
          <div style={{...center, left: 130, right: 110, top: 0, bottom: 0}}><TextBox ls={ls} size={fitLines(ls, CW - 250, 54, 28)} /></div>
          {right && <svg width={80} height={80} style={{position: 'absolute', right: 20, top: CH / 2 - 40, overflow: 'visible'}}><CheckSeal x={40} y={40} f={f} at={reveal + 8} r={30} /></svg>}
        </NoteCard>
      );
    })}
    {an && (
      <NoteCard f={f} at={reveal + 16} x={60} y={780} w={Math.min(680, textW(an) * fsA * 1.06 + 90)} h={80} border={RED} rot={-1}>
        <div style={{...center, inset: 0}}><TextBox ls={[an]} size={fsA} color={RED} /></div>
      </NoteCard>
    )}
  </>);
};

/** recap：回頭看走過的路——左邊小地圖把整條路線重畫一次、經過的每一站打勾；右邊回顧清單逐條打勾；右下木製路標指向下一節 */
const Recap: React.FC<SP> = ({p, cues, f, i: idx, anchors}) => {
  const take: string[] = (p.takeaway ?? []).slice(0, 3), rec: string[] = (p.recap ?? []).slice(0, 4);
  const nextAt = cue(cues, p.nextCue, 120);
  const teaser = p.nextTeaser ? String(p.nextTeaser) : '';
  const mh = rec.length ? 560 : 680;
  // 小地圖：把第 0～idx 站的位置縮放進框內
  const pts = anchors.slice(0, idx + 1);
  const bx = 40, by = 96, bw = 680, bh = mh - by - 40;
  const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sc = Math.min(bw / Math.max(1, maxX - minX), bh / Math.max(1, maxY - minY), 0.25);
  const ox = bx + (bw - (maxX - minX) * sc) / 2, oy = by + (bh - (maxY - minY) * sc) / 2;
  const mp = pts.map((q) => ({x: ox + (q.x - minX) * sc, y: oy + (q.y - minY) * sc}));
  const route: P[] = mp.length > 1 ? mp.flatMap((q, k) => (k === 0 ? [q] : Array.from({length: 12}, (_, j) => ({
    x: mp[k - 1].x + (q.x - mp[k - 1].x) * ((j + 1) / 12), y: mp[k - 1].y + (q.y - mp[k - 1].y) * ((j + 1) / 12) + Math.sin(((j + 1) / 12) * Math.PI) * (k % 2 ? 18 : -18)})))) : mp;
  const rp = pr(f, 20, 44);
  const rf = Math.min(40, rec.length ? (680 - (rec.length - 1) * 14 - rec.length * 40) / Math.max(1, rec.reduce((s, r) => s + textW(r), 0)) : 40);
  const ttl = take.map((t) => lines(t, 15, 2));
  const tsz = Math.min(...ttl.map((ls) => fitLines(ls, 780, 50, 28)), 50);
  return (<>
    <NoteCard f={f} at={MIN_AT} x={60} y={160} w={760} h={mh} rot={-0.8}>
      <div style={{position: 'absolute', left: 40, top: 26, display: 'flex', alignItems: 'baseline', gap: 16}}>
        <div style={{fontFamily: CINZEL, fontWeight: 700, fontSize: 24, letterSpacing: 6, color: RED}}>ROUTE</div>
        <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 40, color: INK, letterSpacing: 4}}>走過的路</div>
      </div>
      <svg width={760} height={mh} style={{position: 'absolute', left: 0, top: 0}}>
        <rect x={bx - 10} y={by - 10} width={bw + 20} height={bh + 20} fill={PAPER} stroke={INK} strokeWidth={2} strokeDasharray="8 6" opacity={0.8} />
        {route.length > 1 && <DashRoute pts={route} p={rp} w={6} f={f} head={false} />}
        {mp.map((q, k) => {
          const at = 20 + 44 * (mp.length > 1 ? k / (mp.length - 1) : 0);
          const last = k === mp.length - 1;
          return (
            <g key={k}>
              <circle cx={q.x} cy={q.y} r={11} fill={PAPER2} stroke={INK} strokeWidth={4} opacity={pr(f, at - 4, 6)} />
              {!last && <CheckSeal x={q.x} y={q.y - 4} f={f} at={at + 2} r={18} />}
              {last && f >= at && <path d={sparkle(q.x, q.y - 2, 26)} fill={GOLD} stroke={INK} strokeWidth={3} opacity={pr(f, at, 8)} />}
            </g>
          );
        })}
      </svg>
    </NoteCard>
    {rec.length > 0 && (
      <div style={{position: 'absolute', left: 60, top: 754, width: 760, display: 'flex', gap: 14, justifyContent: 'center'}}>
        {rec.map((r, k) => (
          <div key={k} style={{...cardBox, position: 'relative', padding: '10px 20px', fontFamily: KAI, fontWeight: 700, fontSize: rf, color: INK, whiteSpace: 'nowrap',
            boxShadow: '6px 8px 0 rgba(40,20,5,0.3)', opacity: pr(f, 30 + k * 8, 10), transform: `translateY(${(1 - pr(f, 30 + k * 8, 10)) * 20}px)`}}>{r}</div>
        ))}
      </div>
    )}
    <NoteCard f={f} at={MIN_AT + 4} x={880} y={160} w={960} h={teaser ? 480 : 680} rot={0.6}>
      <div style={{position: 'absolute', left: 50, top: 30, fontFamily: SERIF, fontWeight: 900, fontSize: 46, color: INK, letterSpacing: 6}}>重點回顧</div>
      <svg width={300} height={20} style={{position: 'absolute', left: 50, top: 92}}><Stroke d="M0 8Q120 0 280 10" p={pr(f, MIN_AT + 8, 14)} w={6} color={RED} /></svg>
      <div style={{position: 'absolute', left: 50, right: 40, top: 130, bottom: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly'}}>
        {take.map((t, k) => {
          const at = A(cues, p.takeCues?.[k], 20 + k * 40);
          return (
            <div key={k} style={{display: 'flex', alignItems: 'center', gap: 24, opacity: pr(f, at, 8), transform: `translateX(${(1 - pr(f, at, 10)) * 30}px)`}}>
              <svg width={64} height={64} style={{flexShrink: 0, overflow: 'visible'}}>
                <circle cx={32} cy={32} r={26} fill={PAPER} stroke={INK} strokeWidth={4} />
                <CheckSeal x={32} y={32} f={f} at={at + 4} r={28} />
              </svg>
              <TextBox ls={ttl[k]} size={tsz} style={{textAlign: 'left'}} />
            </div>
          );
        })}
      </div>
    </NoteCard>
    {teaser && f >= nextAt && (
      <div style={{position: 'absolute', left: 880, top: 680, width: 960, height: 170, opacity: pr(f, nextAt, 10),
        transform: `translateX(${(1 - pr(f, nextAt, 14)) * -60}px) rotate(-1deg)`}}>
        <svg width={960} height={170} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <path d="M0 18H860L950 85L860 152H0Z" fill="#a06a35" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <path d="M30 60H820M40 110H780" stroke="#7a4a22" strokeWidth={3} opacity={0.6} />
          <circle cx={30} cy={40} r={7} fill={INK} /><circle cx={30} cy={130} r={7} fill={INK} />
        </svg>
        <div style={{position: 'absolute', left: 60, top: 0, height: 170, display: 'flex', alignItems: 'center', gap: 28}}>
          <div style={{fontFamily: CINZEL, fontWeight: 700, fontSize: 34, letterSpacing: 6, color: '#f6d9a0'}}>NEXT</div>
          <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: Math.min(54, 620 / Math.max(1, textW(teaser) * 1.06)), color: CREAM, letterSpacing: 3, whiteSpace: 'nowrap'}}>{teaser}</div>
        </div>
      </div>
    )}
  </>);
};

/** 寶箱（站內小插畫，揭曉時蓋子打開＋金光） */
const Chest: React.FC<{open: number; glow: number; f: number}> = ({open, glow, f}) => (
  <svg width={170} height={170} viewBox="-130 -150 260 260" style={{overflow: 'visible'}}>
    {glow > 0 && <circle cx={0} cy={-20} r={150} fill="#ffe9a0" opacity={0.6 * glow} />}
    {glow > 0 && [[-110, -110], [100, -120], [0, -150]].map(([x, y], k) => (
      <path key={k} d={sparkle(x, y, 20)} fill="#f7dc7a" stroke={INK} strokeWidth={3} opacity={glow * (0.6 + 0.3 * Math.sin(f / 8 + k))} />
    ))}
    {open > 0 && <path d="M-100 0Q0 -70 100 0Z" fill={GOLD} stroke={INK} strokeWidth={5} opacity={open} />}
    <path d="M-120 0H120V95H-120Z" fill="#8a5a2b" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d="M-55 0v95M55 0v95" stroke={INK} strokeWidth={6} />
    {/* 蓋子往後翻開：以上緣為軸縱向翻轉（正面看＝蓋子縮短並翻到箱子上方），不會蓋到旁邊的字母章 */}
    <g transform={`translate(0 -82) scale(1 ${1 - 1.5 * open}) translate(0 82)`}>
      <path d="M-120 0L-102 -82H102L120 0Z" fill="#a06a35" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <path d="M-55 0L-50 -82M55 0L50 -82" stroke={INK} strokeWidth={6} />
    </g>
    <path d="M-15 14h30v32h-30Z" fill={GOLD} stroke={INK} strokeWidth={5} />
  </svg>
);

/** qaEnd：終點寶藏四選一——上方題目，下方四個寶箱註記卡；揭曉時答案寶箱打開、金光、紅圈圈起，其他變淡 */
const QaEnd: React.FC<SP> = ({p, f}) => {
  const opts: string[] = (p.options ?? []).slice(0, 4);
  const ans = Math.round((p.answerSec ?? 4) * 30);
  const q = lines(String(p.question ?? ''), 22, 2);
  const X = [130, 990], Y = [360, 620], W = 800, H = 230;
  const ai = typeof p.answerIndex === 'number' ? p.answerIndex : -1;
  return (<>
    <NoteCard f={f} at={MIN_AT - 6} x={160} y={150} w={1600} h={170} rot={-0.4}>
      <div style={{position: 'absolute', left: 44, top: 22, fontFamily: CINZEL, fontWeight: 700, fontSize: 22, letterSpacing: 6, color: RED}}>FINAL QUEST</div>
      <div style={{...center, left: 260, right: 60, top: 0, bottom: 0}}>{q.length > 0 && <TextBox ls={q} size={fitLines(q, 1260, 58, 32)} />}</div>
      <svg data-qa="ignore" width={120} height={120} style={{position: 'absolute', left: 70, top: 52}}><g transform="translate(46 64)"><CompassRose size={40} rot={Math.sin(f / 30) * 10} /></g></svg>
    </NoteCard>
    {opts.map((o, i) => {
      const at = MIN_AT + i * 8, right = i === ai;
      const ls = lines(o, 9, 2);
      const x = X[i % 2], y = Y[Math.floor(i / 2)];
      return (
        <NoteCard key={i} f={f} at={at} x={x} y={y} w={W} h={H} rot={i % 2 ? 0.7 : -0.7} border={right && f >= ans ? RED : INK}
          dim={!right && f >= ans ? 1 - 0.45 * pr(f, ans, 10) : 1}>
          <div style={{position: 'absolute', left: 26, top: 34}}><Chest open={right ? pr(f, ans, 14) : 0} glow={right ? pr(f, ans + 4, 14) : 0} f={f} /></div>
          <WaxSeal f={f} at={at + 4} x={20} y={20} r={30} text={LETTER(i)} />
          <div style={{...center, left: 230, right: 30, top: 0, bottom: 0}}><TextBox ls={ls} size={fitLines(ls, W - 300, 56, 28)} /></div>
        </NoteCard>
      );
    })}
    {ai >= 0 && ai < opts.length && (
      <Layer><RedRing cx={X[ai % 2] + W / 2} cy={Y[Math.floor(ai / 2)] + H / 2} rx={W / 2 + 26} ry={H / 2 + 12} p={pr(f, ans + 2, 20)} w={8} /></Layer>
    )}
  </>);
};

const STATIONS: Record<string, React.FC<SP>> = {title: Title, scenario: Scenario, definition: Definition, cards: Cards, vs: Vs, stat: Stat, quiz: Quiz, recap: Recap, qaEnd: QaEnd};

/** 左上固定介面：小指南針（跟著鏡頭轉）＋地圖名稱＋第幾站 */
const Hud: React.FC<{f: number; x: number; o: number; name: string; idx: number; n: number}> = ({f, x, o, name, idx, n}) => {
  if (o <= 0.01) return null;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity: o}}>
      <svg width={170} height={170} viewBox="-85 -85 170 170" style={{position: 'absolute', left: 14, top: 8}}>
        <CompassRose size={58} rot={Math.sin(f / 23) * 6 + x / 90} />
      </svg>
      <div style={{position: 'absolute', left: 168, top: 34, padding: '8px 22px 10px', background: PAPER2, border: `3px solid ${INK}`, whiteSpace: 'nowrap',
        boxShadow: `inset 0 0 0 4px ${PAPER2}, inset 0 0 0 5px ${INK}, 5px 7px 0 rgba(40,20,5,0.3)`}}>
        <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: Math.min(36, 380 / Math.max(1, textW(name) * 1.15)), color: INK, letterSpacing: 6, lineHeight: 1.2}}>{name}</div>
        <div style={{fontFamily: CINZEL, fontWeight: 700, fontSize: 18, color: RED, letterSpacing: 6}}>{`STATION ${idx + 1} / ${n}`}</div>
      </div>
    </div>
  );
};

export const TemplateJ: React.FC<TplSpec> = (spec) => {
  const f = useCurrentFrame();
  const scenes = spec.scenes;
  const cam = camAt(f, scenes);
  const idx = sceneIndex(spec, f);
  const anchors = useMemo(() => scenes.map((s, i) => anchorOf(i, s.type)), [scenes]);
  const cap = captionAt(spec, f, 8);
  // 緊接上一句（間隔 ≤10 格）時直接換字、不淡入：淡入的前 2 格字幕太淡，會被最終品檢判成字幕閃爍
  const capPrev = cap ? spec.captions[spec.captions.indexOf(cap) - 1] : undefined;
  const capO = !cap ? 0 : capPrev && cap.from - capPrev.to <= 10 ? 1 : interpolate(f, [cap.from - 2, cap.from + 3], [0, 1], clamp);
  const capS = cap ? fitLines([cap.text], 1760, 54, 34) : 54;
  const fade = Math.max(0, spec.brand ? 0 : 1 - f / 8, (f - (spec.totalFrames - 12)) / 12);
  // HUD：標題站時收起（緞帶與卷軸在畫面上方）
  const hide = Math.max(0, ...scenes.map((s) => (s.type === 'title' ? pr(f, s.from - PRE - 12, 12) * (1 - pr(f, s.from + s.dur - PRE, 14)) : 0)));
  const hudO = pr(f, 0, 12) * (1 - hide);
  return (
    <AbsoluteFill style={{backgroundColor: TABLE, overflow: 'hidden'}}>
      <Terrain f={f} cam={cam} scenes={scenes} />
      {scenes.map((s, i) => {
        const lf = f - s.from;
        if (lf < -PRE - 2 || lf > s.dur + POST + 2) return null;
        const o = stationOrigin(i);
        const rest = lf >= POST && lf < s.dur - PRE;
        const Comp = STATIONS[s.type] ?? Definition;
        return (
          <div key={s.id} data-qa={rest ? undefined : 'ignore'} style={{position: 'absolute', left: (o.x - cam.x) * cam.z + 960, top: (o.y - cam.y) * cam.z + 450,
            width: 1920, height: 1080, transform: `scale(${cam.z})`, transformOrigin: '0 0'}}>
            <Comp p={s.props ?? {}} cues={s.cues ?? []} dur={s.dur} f={lf} i={i} anchors={anchors} />
          </div>
        );
      })}
      {/* 螢幕暈影 */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(50,25,8,0.42) 100%)', pointerEvents: 'none'}} />
      <Hud f={f} x={cam.x} o={hudO} name={spec.hud?.left ?? '探索地圖'} idx={idx} n={scenes.length} />
      {/* 字幕底：固定在畫面下緣的木桌色漸層（y 900→1080），鏡頭移動時地圖不在字幕後面晃動 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 900, height: 180, background: `linear-gradient(rgba(59,38,22,0), ${TABLE} 40%, ${TABLE})`}} />
      {cap && (
        <div data-qa="caption" style={{position: 'absolute', left: 60, right: 60, top: 954, textAlign: 'center', opacity: capO, fontFamily: SERIF, fontWeight: 900,
          fontSize: capS, color: '#fff', letterSpacing: 2, whiteSpace: 'nowrap', WebkitTextStroke: '9px #111', paintOrder: 'stroke fill'}}>{cap.text}</div>
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
