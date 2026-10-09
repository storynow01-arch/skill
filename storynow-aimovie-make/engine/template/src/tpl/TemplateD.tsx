/* 範本 D：白板手繪 Whiteboard —— 淺灰紙面的一張大白板，每個場景畫在一塊區域，鏡頭平移過去（中途微拉遠），最後拉遠看整張白板。
   招牌特徵（概念忠實度）：①一支馬克筆，筆尖永遠貼著正在畫的那一筆，一次只畫一樣 ②先描黑框、再上色並輕彈一下
   ③扁平藍／橘／黃／紅圖示（lib/whiteboard）④白字黑邊粗字幕 ⑤每個畫面動作都有音效（沙沙、啵、叮、嗡、咻）。
   做法：每個場景把要畫的東西排成「物件清單」（開始格＋長度＋位置），整支片共用一支筆與一台鏡頭。 */
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {loadFont as loadKai} from '@remotion/google-fonts/LXGWWenKaiTC';
import {loadFont as loadSans} from '@remotion/google-fonts/NotoSansTC';
import {DrawShape, DrawText, Item, Marker, R, Shape, Sfx, WB, arrow, box, card, check, circleMark, cross, iconFor, lerp, textInk, tipOf, underline, wbTextW} from '../lib/whiteboard';
import {QaProbe} from '../QaProbe';
import {TplSpec, captionAt, cue, wrap} from './common';
import {BrandLogo} from './brand';

const HAND = loadKai('normal', {weights: ['700'], ignoreTooManyRequestsWarning: true}).fontFamily;
const BOLD = loadSans('normal', {weights: ['900'], ignoreTooManyRequestsWarning: true}).fontFamily;
const SX = 2150, SY = 1300, COLS = 3, PAN = 26;
const PASTEL = ['#dff0f9', '#fde9cf', '#fff3c4', '#e3f4e6'];

/** 場景 i 在白板上的位置（蛇行排列，鏡頭移動距離最短） */
const region = (i: number) => {
  const row = Math.floor(i / COLS), col = row % 2 ? COLS - 1 - (i % COLS) : i % COLS;
  return {x: col * SX, y: row * SY};
};
/** 在寬度 maxW 內放得下的字級 */
const fitW = (s: string, maxW: number, base: number, min = 30) => Math.max(min, Math.min(base, maxW / Math.max(1, wbTextW(s, 1))));
const tdur = (s: string, min = 10) => Math.max(min, Math.round([...s].length * 2.2));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sc = {p: any; cues: number[]; dur: number; from: number};
type Kit = {
  shape: (at: number, x: number, y: number, s: number, sh: Shape, dur?: number, sfx?: Sfx, rot?: number, boxId?: string, inBox?: string) => void;
  text: (at: number, x: number, y: number, t: string, size: number, o?: {color?: string; bold?: boolean; anchor?: 'start' | 'middle'; dur?: number; sfx?: Sfx; box?: string}) => void;
  id: (name: string) => string;                       // 容器 id（品檢：裡面的字不可超出）
  logo: boolean;                                      // 右上角有 LOGO：標題寬度讓開
  C: (i: number | undefined, fb: number) => number;   // 第 i 句旁白開始（絕對格）
  T0: number;                                         // 鏡頭到位、可以開始畫
};

/* ---------- 9 種場景（區域內座標 0..1920 × 0..1080，內容放在 y<900，避開字幕） ---------- */
const heading = (k: Kit, t: string | undefined, at: number) => {
  if (!t) return;
  wrap(t, 20).slice(0, 2).forEach((ln, i) => k.text(at + i * 6, 960, 160 + i * 78, ln, fitW(ln, k.logo ? 1240 : 1500, 72), {color: WB.blue}));
};

/* ---------- 布林項（2026-10-08，數位邏輯）：A'B'D 的撇號＝反相，畫成字母上方的橫線 ---------- */
const TADV = 0.7;                                     // 每個字母佔的寬度（× 字級），固定寬度讓上橫線一定對準字母
const termW = (t: string, size: number) => [...t].filter((c) => c !== "'").length * size * TADV;
/** 一個字母一個字母寫，反相字母寫完補上橫線；回傳寬度 */
const writeTerm = (k: Kit, at: number, x: number, y: number, t: string, size: number, col: string, step = 4) => {
  const ch = [...t], adv = size * TADV; let j = 0;
  ch.forEach((c, i) => {
    if (c === "'") return;
    const cx = x + j * adv + adv / 2, t0 = at + j * step;
    k.text(t0, cx, y, c, size, {bold: true, color: col, dur: 3, sfx: 'none'});
    if (ch[i + 1] === "'") k.shape(t0 + 3, cx - adv * 0.36, y - size * 0.86, 1, {strokes: [`M0 0 H${adv * 0.72}`], w: Math.max(5, size / 10), ink: col}, 3, 'none');
    j++;
  });
  return termW(t, size);
};
/** 整條式子「F = 項 + 項 …」置中寫在 cx；cues[i]＝第 i 項開始的格（沒給就接著寫） */
const writeExpr = (k: Kit, at: number, cx: number, y: number, fn: string, terms: string[], size: number, colors?: string[], cues?: number[]) => {
  const head = `${fn} = `, gap = size * 1.1;
  const total = wbTextW(head, size) + terms.reduce((a, t, i) => a + termW(t, size) + (i ? gap : 0), 0);
  let x = cx - total / 2;
  k.text(at, x, y, head, size, {bold: true, anchor: 'start', dur: 6, sfx: 'none'}); x += wbTextW(head, size);
  terms.forEach((t, i) => {
    const t0 = cues?.[i] ?? at + 8 + i * 14;
    if (i) { k.text(t0, x + gap / 2, y, '+', size, {bold: true, dur: 3, sfx: 'none'}); x += gap; }
    x += writeTerm(k, t0 + 2, x, y, t, size, colors?.[i] ?? WB.ink);
  });
};

const SCENES: Record<string, (k: Kit, r: Sc) => void> = {
  title: (k, r) => {
    const p = r.p;
    if (p.eyebrow) k.text(k.T0, 960, 330, String(p.eyebrow), 64, {color: WB.blue, dur: 10});
    const size = fitW(p.title, 1500, 150);
    k.text(k.T0 + 8, 960, 540, p.title, size, {bold: true, dur: tdur(p.title, 22), sfx: 'ding'});
    const w = Math.min(1500, wbTextW(p.title, size));
    k.shape(k.T0 + 10, 960 - w / 2, 590, 1, underline(w), 12, 'none');
    if (p.en) k.text(k.T0 + 14, 960, 690, p.en, fitW(p.en, 1400, 46), {color: '#7d8791', dur: 12});
    if (p.icon || p.sketch) k.shape(k.T0, 960, 200, 0.9, iconFor(p.sketch ?? p.icon), 14);
  },
  scenario: (k, r) => {
    const p = r.p, pills: string[] = p.pills ?? [];
    heading(k, p.heading, k.T0);
    k.shape(k.T0, 470, 520, 1.9, iconFor(p.sketch ?? p.icon), 18);
    const gap = Math.min(150, 560 / Math.max(1, pills.length));
    pills.forEach((x, i) => {
      const at = k.C(p.cueMap?.[i], 20 + i * 30), y = 340 + i * gap;
      const last = i === pills.length - 1 && p.lastIsProblem !== false;
      k.shape(at, 900, y - 20, 0.7, last ? cross() : check(), 8, last ? 'buzz' : 'pop');
      k.text(at + 6, 970, y, x, fitW(x, 820, 60), {color: last ? WB.red : WB.ink, dur: tdur(x), anchor: 'start'});
    });
  },
  definition: (k, r) => {
    const p = r.p, big: string = p.bigText ?? '', hl: string = p.highlight ?? '';
    if (p.label) {
      const lw = wbTextW(String(p.label), 50) + 80;
      k.shape(k.T0, 960, 190, 1, card(lw, 90, '#dff0f9'), 10, 'none', 0, k.id('label'));
      k.text(k.T0 + 8, 960, 208, String(p.label), 50, {color: WB.blue, dur: 8, box: k.id('label')});
    }
    const lines = wrap(big, 13).slice(0, 2);
    const size = Math.min(...lines.map((ln) => fitW(ln, 1600, 124))), lh = Math.round(size * 1.3);   // 行距：兩行大字不重疊（2026-10-09 0-0 開場品檢抓到）
    lines.forEach((ln, i) => k.text(k.C(p.cueMap?.[0], 6) + i * 10, 960, 430 + i * lh, ln, size, {bold: true, color: WB.orange, dur: tdur(ln, 16), sfx: i ? 'none' : 'ding'}));
    const li = lines.findIndex((ln) => hl && ln.includes(hl));
    if (li >= 0) {
      const ln = lines[li], x0 = 960 - wbTextW(ln, size) / 2 + wbTextW(ln.slice(0, ln.indexOf(hl)), size);
      k.shape(k.C(p.cueMap?.[1], 40), x0, 430 + li * lh + 26, 1, underline(wbTextW(hl, size), WB.red), 12, 'none');
    }
    const notes: string[] = p.sideNotes ?? [];
    const w = Math.min(520, 1600 / Math.max(1, notes.length) - 40);
    notes.forEach((n, i) => {
      const at = k.C(p.noteCues?.[i], 50 + i * 15), x = 960 + (i - (notes.length - 1) / 2) * (w + 40);
      k.shape(at, x, 760, 1, card(w, 150, PASTEL[(i + 1) % 4]), 10, 'pop', 0, k.id(`note${i}`));
      k.text(at + 8, x, 778, n, fitW(n, w - 50, 46), {dur: tdur(n), box: k.id(`note${i}`)});
    });
  },
  cards: (k, r) => {
    const p = r.p, cards: {icon?: string; sketch?: string; title: string; note?: string}[] = p.cards ?? [];
    heading(k, p.heading, k.T0);
    const n = Math.max(1, cards.length), w = Math.min(500, 1700 / n - 40);
    cards.forEach((c, i) => {
      const at = k.C(p.cueMap?.[i], 20 + i * 30), x = 960 + (i - (n - 1) / 2) * (w + 40);
      k.shape(at, x, 520, 1, card(w, 500, PASTEL[i % 4]), 10, 'none', 0, k.id(`card${i}`));
      k.shape(at + 2, x, 410, Math.min(1.25, w / 260), iconFor(c.sketch ?? c.icon), 14, 'pop', 0, undefined, k.id(`card${i}`));
      k.text(at + 4, x, 610, c.title, fitW(c.title, w - 50, 58), {bold: true, dur: tdur(c.title, 8), box: k.id(`card${i}`)});
      if (c.note) wrap(c.note, Math.max(4, Math.floor((w - 50) / 38))).slice(0, 2).forEach((ln, j) =>
        k.text(at + 8 + j * 4, x, 680 + j * 50, ln, fitW(ln, w - 50, 38), {color: '#5b6672', dur: tdur(ln, 8), box: k.id(`card${i}`)}));
    });
    if (p.footer) k.text(k.C(r.cues.length - 1, 120) + 10, 960, 860, '★ ' + p.footer, fitW(p.footer, 1500, 54), {color: WB.red});
  },
  vs: (k, r) => {
    const p = r.p;
    const side = (sd: {frame?: string; icon?: string; sketch?: string; text: string}, i: number) => {
      const at = k.C(p.cueMap?.[i], i ? 40 : 6), x = i ? 1420 : 500, dy = k.logo ? 25 : 0;
      const bg = sd.frame === 'danger' ? '#fde3df' : sd.frame === 'success' ? '#e3f4e6' : '#dff0f9';
      k.shape(at, x, 470 + dy, 1, card(760, 600, bg), 10, 'none', 0, k.id(`side${i}`));   // 右上角有 LOGO：整組往下讓開
      k.shape(at + 2, x, 330 + dy, 1.35, iconFor(sd.sketch ?? sd.icon), 14, 'pop', 0, undefined, k.id(`side${i}`));
      wrap(sd.text ?? '', 11).slice(0, 3).forEach((ln, j) => k.text(at + 6 + j * 4, x, 560 + dy + j * 70, ln, fitW(ln, 680, 58), {dur: tdur(ln), box: k.id(`side${i}`)}));
      if (sd.frame === 'danger') k.shape(at + 10, x + 300, 230 + dy, 1.1, cross(), 8, 'buzz', 0, undefined, k.id(`side${i}`));
      if (sd.frame === 'success') k.shape(at + 10, x + 300, 230 + dy, 1.1, check(), 8, 'ding', 0, undefined, k.id(`side${i}`));
    };
    side(p.left ?? {text: ''}, 0);
    k.text(k.C(p.cueMap?.[1], 40) - 4, 960, 500, !p.mid || p.mid === 'vs' ? 'vs' : p.mid, 90, {bold: true, color: WB.orange, dur: 6, sfx: 'none'});
    side(p.right ?? {text: ''}, 1);
    if (p.footerPill) k.text(k.C(r.cues.length - 1, 90) + 6, 960, 860, '→ ' + p.footerPill, fitW(p.footerPill, 1500, 56), {color: WB.red});
  },
  stat: (k, r) => {
    const p = r.p, at = Math.max(k.C(0, 10), k.T0), num = `${p.value}${p.suffix ?? ''}`;
    const size = fitW(num, 900, 300);
    k.text(at, 620, 560, num, size, {bold: true, color: WB.orange, dur: 18, sfx: 'ding'});
    const w = wbTextW(num, size);
    k.shape(at + 4, 620, 460, 1, circleMark(w / 2 + 70, size * 0.5), 14, 'none');
    wrap(p.label ?? '', 9).slice(0, 2).forEach((ln, i) => k.text(at + 8 + i * 6, 1200, 440 + i * 96, ln, fitW(ln, 680, 80), {anchor: 'start'}));
    wrap(p.sub ?? '', 13).slice(0, 2).forEach((ln, i) => k.text(at + 12 + i * 6, 1200, 660 + i * 60, ln, 46, {color: WB.blue, anchor: 'start'}));
  },
  quiz: (k, r) => {
    const p = r.p, opts: string[] = p.options ?? [], reveal = k.C(p.revealCue, Math.round(r.dur * 0.6));
    const qw = wbTextW('小測驗', 42) + 70;                // 依字寬畫標籤（不借用吊牌圖示：字會壓到框與圓孔）
    k.shape(k.T0, 90 + qw / 2, 150, 1, card(qw, 80, WB.orange), 10, 'none', 0, k.id('qlabel'));
    k.text(k.T0 + 4, 90 + qw / 2, 165, '小測驗', 42, {bold: true, color: WB.ink, dur: 6, box: k.id('qlabel')});   // 深墨字：白字在橘標籤上只有 2.2:1（2026-10-08）
    wrap(p.question ?? '', 20).slice(0, 2).forEach((ln, i) => k.text(k.T0 + 8 + i * 6, 960, 320 + i * 80, ln, fitW(ln, 1600, 66)));
    const n = Math.max(1, opts.length), w = Math.min(620, 1700 / n - 50);
    opts.forEach((o, i) => {
      const x = 960 + (i - (n - 1) / 2) * (w + 50), at = k.T0 + 30 + i * 14;
      k.shape(at, x, 600, 1, box(w, 200), 8, 'none', 0, k.id(`opt${i}`));
      k.text(at + 4, x, 620, `${String.fromCharCode(65 + i)}. ${o}`, fitW(o + 'AA', w - 60, 58), {dur: tdur(o, 8), box: k.id(`opt${i}`)});
      if (i === p.answerIndex) k.shape(reveal, x, 600, 1, circleMark(w / 2 + 30, 130), 14, 'ding');
    });
    if (p.afterNote) k.text(reveal + 16, 960, 860, p.afterNote, fitW(p.afterNote, 1600, 54), {color: WB.red});
  },
  recap: (k, r) => {
    const p = r.p, take: string[] = p.takeaway ?? [], recap: string[] = p.recap ?? [];
    k.text(k.T0, 960, 160, '今天帶走', 72, {color: WB.blue, dur: 10});
    take.forEach((t, i) => {
      const at = Math.max(k.C(p.takeCues?.[i], 20 + i * 40), k.T0 + 12), y = 330 + i * 120;
      const x0 = recap.length ? 330 : 520;
      k.shape(at, x0, y - 22, 0.7, check(), 8, 'pop');
      k.text(at + 4, x0 + 70, y, t, fitW(t, recap.length ? 1000 : 1300, 62), {anchor: 'start'});
    });
    recap.forEach((t, i) => k.text(k.T0 + 30 + i * 10, 1450, 330 + i * 64, '· ' + t, fitW(t, 380, 38), {color: '#5b6672', anchor: 'start', dur: tdur(t, 8)}));
    if (p.nextTeaser) {
      const at = k.C(p.nextCue, 120);
      k.shape(at, recap.length ? 420 : 610, 790, 0.8, iconFor('house'), 12);
      k.text(at + 4, recap.length ? 540 : 730, 820, '下一節：' + p.nextTeaser, fitW('下一節：' + p.nextTeaser, 1200, 64), {bold: true, color: WB.orange, anchor: 'start', sfx: 'ding'});
    }
  },
  qaEnd: (k, r) => {
    const p = r.p, opts: string[] = p.options ?? [], ans = r.from + Math.round((p.answerSec ?? 4) * 30);
    wrap(p.question ?? '', 22).slice(0, 2).forEach((ln, i) => k.text(r.from + 6 + i * 6, 960, 170 + i * 78, ln, fitW(ln, 1600, 64), {color: WB.blue, dur: 10}));
    opts.slice(0, 4).forEach((o, i) => {
      const x = 960 + ((i % 2) - 0.5) * 820, y = 420 + Math.floor(i / 2) * 230, at = r.from + 20 + i * 8;
      k.shape(at, x, y, 1, box(740, 180), 6, 'none', 0, k.id(`end${i}`));
      k.text(at + 2, x, y + 20, `${String.fromCharCode(65 + i)}. ${o}`, fitW(o + 'AA', 660, 54), {dur: 6, sfx: 'none', box: k.id(`end${i}`)});
      if (i === p.answerIndex) k.shape(ans, x, y, 1, circleMark(400, 115), 12, 'ding');
    });
  },
  /* 布林式 → 每一項換成 0／1（2026-10-08）：上方寫整條式子，下方每項一張卡：字母在上、0／1 寫在正下方（有上橫線＝0） */
  terms: (k, r) => {
    const p = r.p, terms: string[] = p.terms ?? [], n = terms.length;
    heading(k, p.heading, k.T0);
    writeExpr(k, k.C(p.exprCue, 6), 960, p.heading ? 330 : 250, p.fn ?? 'F', terms, 64);
    const size = 78, adv = size * TADV, gap = 70;
    const ws = terms.map((t) => termW(t, size) + 70), total = ws.reduce((a, b) => a + b, 0) + gap * (n - 1);
    let x = 960 - total / 2;
    terms.forEach((t, i) => {
      const at = k.C(p.termCues?.[i], 40 + i * 30), cx = x + ws[i] / 2, bx = cx - termW(t, size) / 2;
      k.shape(at, cx, 600, 1, card(ws[i], 270, PASTEL[i % 4]), 8, 'none', 0, k.id(`term${i}`));
      writeTerm(k, at + 4, bx, 545, t, size, WB.ink, 3);
      const ch = [...t]; let j = 0;
      ch.forEach((c, ci) => {
        if (c === "'") return;
        const bit = ch[ci + 1] === "'" ? '0' : '1';
        k.text(at + 20 + j * 4, bx + j * adv + adv / 2, 680, bit, 70, {bold: true, color: bit === '1' ? WB.red : WB.blue, dur: 3, sfx: 'none'});
        j++;
      });
      x += ws[i] + gap;
    });
    if (p.rule) k.text(k.C(p.ruleCue, 120), 960, 830, p.rule, fitW(p.rule, 1500, 50), {color: WB.red});
  },
  /* 逐個變數比對（2026-10-08，照使用者上課的講法）：把圈裡每一格的 0／1 列成表，一欄一欄看——不變的「保留」、有跳動的「淘汰」，最後組成這一圈的項 */
  readTable: (k, r) => {
    const p = r.p, vars: string[] = p.vars ?? ['A', 'B', 'C', 'D'], codes: string[] = p.codes ?? [], n = vars.length;
    const col = p.color ?? WB.red;
    heading(k, p.heading, k.T0);
    const X = (j: number) => 960 + (j - (n - 1) / 2) * 240, top = p.heading ? 330 : 260, rh = 96;
    const rAt = k.C(p.rowsCue, 10);
    vars.forEach((v, j) => k.text(rAt + j * 2, X(j), top, v, 76, {bold: true, color: WB.blue, dur: 3, sfx: 'none'}));
    codes.forEach((c, i) => [...c].forEach((b, j) => k.text(rAt + 12 + i * 10 + j * 2, X(j), top + 100 + i * rh, b, 76, {bold: true, dur: 3, sfx: 'none'})));
    if (p.label) k.text(rAt + 4, X(0) - 220, top + 100 + ((codes.length - 1) * rh) / 2, p.label, 40, {color: col, anchor: 'middle', dur: 6, sfx: 'none'});
    const lineY = top + 100 + (codes.length - 1) * rh + 50;
    k.shape(rAt + 30, X(0) - 100, lineY, 1, {strokes: [`M0 0 H${X(n - 1) - X(0) + 200}`], w: 5}, 8, 'none');
    let term = '';
    vars.forEach((v, j) => {
      const at = k.C(p.verdictCues?.[j], 60 + j * 30), bits = codes.map((c) => c[j]), same = bits.every((b) => b === bits[0]);
      if (same) {
        const t = bits[0] === '0' ? `${v}'` : v; term += t;
        writeTerm(k, at, X(j) - termW(t, 76) / 2, lineY + 92, t, 76, WB.green);
        k.text(at + 8, X(j), lineY + 150, '保留', 36, {color: WB.green, dur: 4, sfx: 'pop'});
      } else {
        k.shape(at, X(j), lineY + 66, 0.7, cross(), 8, 'buzz');
        k.text(at + 8, X(j), lineY + 150, '跳動淘汰', 36, {color: WB.red, dur: 4, sfx: 'none'});
      }
    });
    if (p.termCue !== undefined || p.showTerm !== false) {
      const at = k.C(p.termCue, 160), size = 84, w = termW(term, size) + wbTextW('→ ', size);
      const x = 960 - w / 2, y = Math.min(880, lineY + 260);
      k.text(at, x, y, '→ ', size, {bold: true, color: col, anchor: 'start', dur: 4, sfx: 'ding'});
      writeTerm(k, at + 4, x + wbTextW('→ ', size), y, term, size, col);
    }
  },
  /* 卡諾圖（2026-10-08，數位邏輯）：畫格子 → 標格雷碼 → （選用）左邊真值表 → 逐格填 1／0／X → 紅筆圈組（跨邊界自動拆兩段、超出格線表示相連）→ 下方寫出化簡結果 */
  kmap: (k, r) => {
    const p = r.p;
    heading(k, p.heading, k.T0);
    const rows: string[] = p.rows ?? ['0', '1'], cols: string[] = p.cols ?? ['00', '01', '11', '10'];
    const nr = rows.length, nc = cols.length, nv = rows[0].length + cols[0].length;
    const cs = p.cell ?? (nr * nc >= 16 ? 118 : nr * nc >= 8 ? 150 : 170);
    const W = nc * cs, H = nr * cs, hasT = !!p.table, side = !hasT && (p.groups ?? []).some((g: {term?: string}) => g.term);
    const x0 = (hasT ? 1300 : side ? 700 : 1020) - W / 2, y0 = p.heading ? (nr >= 4 ? 330 : 350) : 270;
    const mOf = (ri: number, ci: number) => parseInt(rows[ri] + cols[ci], 2);
    const pos = (m: number) => { for (let ri = 0; ri < nr; ri++) for (let ci = 0; ci < nc; ci++) if (mOf(ri, ci) === m) return [ri, ci]; return [0, 0]; };
    const ones: number[] = p.ones ?? [], dc: number[] = p.dc ?? [];
    const val = (m: number) => ones.includes(m) ? '1' : dc.includes(m) ? 'X' : p.zeros === false ? '' : '0';
    // 格子＋左上角斜線與變數名
    const gAt = k.C(p.gridCue, 0), strokes = [R(0, 0, W, H)];
    const mc = Math.floor(nc / 2), mr = Math.floor(nr / 2);   // 先畫中間十字、再細分（使用者手畫 16 格的方式，比較工整）
    if (nc > 1) strokes.push(`M${mc * cs} 0 V${H}`);
    if (nr > 1) strokes.push(`M0 ${mr * cs} H${W}`);
    for (let c = 1; c < nc; c++) if (c !== mc) strokes.push(`M${c * cs} 0 V${H}`);
    for (let q = 1; q < nr; q++) if (q !== mr) strokes.push(`M0 ${q * cs} H${W}`);
    k.shape(gAt, x0, y0, 1, {strokes, w: 6}, 20, 'none');
    k.shape(gAt + 2, x0 - 140, y0 - 110, 1, {strokes: ['M0 0 L140 110'], w: 4}, 4, 'none');
    k.text(gAt + 4, x0 - 112, y0 - 14, p.rowVar ?? 'A', 42, {color: WB.blue, dur: 4, sfx: 'none'});
    k.text(gAt + 6, x0 - 44, y0 - 74, p.colVar ?? 'BC', 42, {color: WB.blue, dur: 4, sfx: 'none'});
    // 格雷碼標頭（橘色）
    const hAt = k.C(p.headCue, 24);
    cols.forEach((s, c) => k.text(hAt + c * 2, x0 + c * cs + cs / 2, y0 - 50, s, 46, {color: WB.orange, bold: true, dur: 5, sfx: 'none'}));
    rows.forEach((s, q) => k.text(hAt + (nc + q) * 2, x0 - 54, y0 + q * cs + cs / 2 + 16, s, 46, {color: WB.orange, bold: true, dur: 5, sfx: 'none', anchor: 'middle'}));
    // 格子編號（左上小字，依格雷碼順序一格一格寫）
    if (p.showIndex) {
      const iAt = k.C(p.indexCue, 50), order: [number, number][] = [];
      for (let q = 0; q < nr; q++) for (let c = 0; c < nc; c++) order.push([q, c]);
      order.forEach(([q, c], j) => k.text(iAt + j * (p.indexStep ?? 3), x0 + c * cs + 10, y0 + q * cs + (cs < 140 ? 28 : 34), `m${mOf(q, c)}`, cs < 140 ? 22 : 28, {color: '#7d8791', dur: 3, sfx: 'none', anchor: 'start'}));
    }
    // 真值表（左邊）：變數欄＋F 欄，F＝1 的列用紅字
    if (hasT) {
      const tAt = k.C(p.tableCue, 10), n = 1 << nv, rh = Math.min(56, 560 / (n + 1)), cw = 74, tx = 120, ty = y0 - 40;
      const names: string[] = p.varNames ?? [...(p.rowVar ?? 'A') + (p.colVar ?? 'BC')];
      const fn = p.fn ?? 'F', tw = (nv + 1) * cw, th = (n + 1) * rh;
      k.shape(tAt, tx, ty, 1, {strokes: [R(0, 0, tw, th, 10), `M0 ${rh} H${tw}`, `M${nv * cw} 0 V${th}`], w: 5}, 14, 'none');
      [...names, fn].forEach((s, c) => k.text(tAt + 4, tx + c * cw + cw / 2, ty + rh * 0.72, s, Math.min(40, rh * 0.75), {bold: true, color: c === nv ? WB.red : WB.blue, dur: 3, sfx: 'none'}));
      for (let m = 0; m < n; m++) {
        const bits = m.toString(2).padStart(nv, '0'), v = val(m) || '0', yy = ty + (m + 1) * rh + rh * 0.72;
        k.text(tAt + 8 + m, tx + 10, yy, [...bits].join('    '), Math.min(34, rh * 0.68), {dur: 3, sfx: 'none', anchor: 'start'});
        k.text(tAt + 8 + m, tx + nv * cw + cw / 2, yy, v, Math.min(34, rh * 0.68), {bold: true, color: v === '1' ? WB.red : '#7d8791', dur: 2, sfx: 'none'});
      }
    }
    // 填值：依編號由小到大（跟真值表同順序），1 紅、X 藍、0 灰
    if (ones.length || dc.length || p.zeros) {
      const fAt = k.C(p.fillCue, 80), n = 1 << nv;
      for (let m = 0, j = 0; m < n; m++) {
        const v = val(m); if (!v) continue;
        const [q, c] = pos(m);
        const vs = Math.min(72, cs * 0.5);
        k.text(fAt + j++ * (p.fillStep ?? 4), x0 + c * cs + cs / 2 + (cs < 140 && p.showIndex ? 14 : 0), y0 + q * cs + cs / 2 + vs * 0.36 + (cs < 140 && p.showIndex ? 14 : 0), v, vs,
          {bold: true, color: v === '1' ? WB.red : v === 'X' ? WB.blue : '#9aa1a9', dur: 5, sfx: v === '1' ? 'pop' : 'none'});
      }
    }
    // 照座標填 1（2026-10-08，使用者上課的方式）：0001 → 左邊列標 00 畫底線、上面行標 01 畫底線 → 交叉的格子寫 1
    const placed: {code: string; cue?: number}[] = p.place ?? [];
    placed.forEach((pl, i) => {
      const rc = pl.code.slice(0, rows[0].length), cc = pl.code.slice(rows[0].length), q = rows.indexOf(rc), c = cols.indexOf(cc);
      if (q < 0 || c < 0) return;
      const at = k.C(pl.cue, 60 + i * 40), vs = Math.min(72, cs * 0.5);
      k.shape(at, x0 - 54 - 32, y0 + q * cs + cs / 2 + 30, 1, underline(64, WB.red), 6, 'none');
      k.shape(at + 8, x0 + c * cs + cs / 2 - 32, y0 - 34, 1, underline(64, WB.red), 6, 'none');
      k.text(at + 16, x0 + c * cs + cs / 2, y0 + q * cs + cs / 2 + vs * 0.36, '1', vs, {bold: true, color: WB.red, dur: 5, sfx: 'pop'});
    });
    // 圈組：連續的一段畫一個圓角框；跨邊界拆成兩段，往外多畫 34px 表示「接到另一邊」
    const spans = (idx: number[], n: number) => {
      const u = [...new Set(idx)].sort((a, b) => a - b);
      if (u.length === n || u[u.length - 1] - u[0] === u.length - 1) return [{a: u[0], b: u[u.length - 1], lo: false, hi: false}];
      let g = 0; for (let i = 1; i < u.length; i++) if (u[i] - u[i - 1] > 1) g = i;
      return [{a: u[0], b: u[g - 1], lo: true, hi: false}, {a: u[g], b: u[u.length - 1], lo: false, hi: true}];
    };
    const GC = [WB.red, WB.blue, WB.green, WB.orange, '#8e5cc4'];
    const groups: {cells: number[]; term?: string; cue?: number; termCue?: number; color?: string; arrow?: boolean}[] = p.groups ?? [];
    const gBox: {x: number; y: number}[][] = [];
    groups.forEach((g, gi) => {
      const at = k.C(g.cue, 120 + gi * 40), col = g.color ?? GC[gi % GC.length], pad = 8 + (gi % 3) * 6;
      const pts = g.cells.map(pos);
      const pcs: {x: number; y: number}[] = [];
      spans(pts.map((t) => t[0]), nr).forEach((rs) => spans(pts.map((t) => t[1]), nc).forEach((ss, si) => {
        const x = x0 + ss.a * cs + pad - (ss.lo ? 16 + pad : 0), y = y0 + rs.a * cs + pad - (rs.lo ? 16 + pad : 0);
        const w = (ss.b - ss.a + 1) * cs - 2 * pad + (ss.lo || ss.hi ? 16 + pad : 0), h = (rs.b - rs.a + 1) * cs - 2 * pad + (rs.lo || rs.hi ? 16 + pad : 0);
        k.shape(at + si * 2, x, y, 1, {strokes: [R(0, 0, w, h, Math.min(46, w / 2, h / 2))], w: 8, ink: col}, 14, si ? 'none' : 'ding');
        pcs.push({x: x + w, y: y + h / 2});
      }));
      gBox.push(pcs);
    });
    // 化簡結果：F ＝ 各組的項依序寫出（顏色同圈）。項寫成 A'B 這種格式：撇號＝反相，畫成字母上方的橫線（2026-10-08 使用者指定上橫線）
    const terms = groups.filter((g) => g.term);
    if (terms.length) {
      const size = side ? 66 : 62, adv = size * 0.7;
      const letters = (t: string) => [...t].filter((ch) => ch !== "'");
      const termW = (t: string) => letters(t).length * adv;
      /** 一個字一個字寫，反相的字母寫完補一條上橫線；回傳寫完的寬度 */
      const writeTerm = (at: number, x: number, y: number, t: string, col: string) => {
        const ch = [...t]; let j = 0;
        ch.forEach((c, i) => {
          if (c === "'") return;
          const cx = x + j * adv + adv / 2, t0 = at + j * 4;
          k.text(t0, cx, y, c, size, {bold: true, color: col, dur: 3, sfx: 'none'});
          if (ch[i + 1] === "'") k.shape(t0 + 3, cx - adv * 0.36, y - size * 0.86, 1, {strokes: [`M0 0 H${adv * 0.72}`], w: 7, ink: col}, 3, 'none');
          j++;
        });
        return termW(t);
      };
      const parts: {t: string; c: string; at: number; term?: boolean}[] = [{t: `${p.fn ?? 'F'} = `, c: WB.ink, at: k.C(terms[0].termCue ?? terms[0].cue, 150) + 16}];
      terms.forEach((g, i) => {
        const at = k.C(g.termCue ?? g.cue, 150 + i * 40) + 16;
        if (i) parts.push({t: '+ ', c: WB.ink, at});
        parts.push({t: g.term!, c: g.color ?? GC[groups.indexOf(g) % GC.length], at: at + 1, term: true});
      });
      const w = (q: {t: string; term?: boolean}) => q.term ? termW(q.t) + size * 0.25 : wbTextW(q.t, size);
      if (side) groups.forEach((g, gi) => {   // 箭頭：圈的右緣 → 這一項（使用者上課時從圈畫箭頭到旁邊寫結果）
        const ti = terms.indexOf(g); if (!g.arrow || ti < 0) return;
        const tx = 1150, ty = y0 + 70 + ti * 100 - size * 0.32;
        const pc = gBox[gi].reduce((b2, q) => Math.abs(q.y - ty) < Math.abs(b2.y - ty) ? q : b2), sx = pc.x + 8, sy = pc.y;
        const len = Math.hypot(tx - sx, ty - sy), ang = (Math.atan2(ty - sy, tx - sx) * 180) / Math.PI;
        k.shape(k.C(g.termCue ?? g.cue, 150) + 8, sx, sy, 1, {...arrow(len, 0), ink: g.color ?? GC[gi % GC.length]}, 8, 'none', ang);
      });
      if (side) {   // 格子右邊直排：F ＝ 一行，之後每項一行（前面加 ＋）
        let ln = 0, x = 1180;
        parts.forEach((q) => {
          if (q.t === '+ ') { ln++; x = 1180; }
          const y = y0 + 70 + ln * 100;
          if (q.term) x += writeTerm(q.at, x, y, q.t, q.c) + size * 0.25;
          else { k.text(q.at, x, y, q.t, size, {bold: true, color: q.c, anchor: 'start', dur: tdur(q.t, 6), sfx: 'none'}); x += wbTextW(q.t, size); }
        });
      } else {
        let x = (hasT ? 1300 : 960) - parts.reduce((a2, q) => a2 + w(q), 0) / 2;
        const ry = y0 + H + 105;
        parts.forEach((q) => {
          if (q.term) x += writeTerm(q.at, x, ry, q.t, q.c) + size * 0.25;
          else { k.text(q.at, x, ry, q.t, size, {bold: true, color: q.c, anchor: 'start', dur: tdur(q.t, 6), sfx: 'none'}); x += wbTextW(q.t, size); }
        });
      }
    }
    if (p.note) k.text(k.C(p.noteCue, 160), hasT ? 1300 : 960, Math.min(880, y0 + H + (terms.length && !side ? 190 : 100)), p.note, fitW(p.note, hasT ? 1000 : 1500, 50), {color: WB.red});
  },
};

/** 整支片的物件清單：各場景排好 → 同場景內不重疊（一支筆一次只畫一樣） */
const buildItems = (spec: TplSpec): Item[] => {
  const all: Item[] = [];
  spec.scenes.forEach((s, i) => {
    const g = region(i), items: Item[] = [];
    const T0 = s.from + (i === 0 ? 10 : PAN);
    const k: Kit = {
      T0,
      C: (ci, fb) => s.from + cue(s.cues, ci, fb),
      id: (name) => `${s.id}-${name}`,
      logo: !!spec.brand?.logo,
      shape: (at, x, y, sc, sh, dur = 16, sfx = 'pop', rot = 0, boxId, inBox) =>
        items.push({kind: 'shape', at, dur, x: g.x + x, y: g.y + y, s: sc, rot, shape: sh, boxId, inBox, sfx: sh.fills?.length ? sfx : sfx === 'pop' ? 'none' : sfx}),
      text: (at, x, y, t, size, o = {}) =>
        items.push({kind: 'text', at, dur: o.dur ?? tdur(t), x: g.x + x, y: g.y + y, text: t, size, color: o.color, bold: o.bold, anchor: o.anchor ?? 'middle', sfx: o.sfx, box: o.box}),
    };
    (SCENES[s.type] ?? SCENES.definition)(k, {p: s.props ?? {}, cues: s.cues ?? [], dur: s.dur, from: s.from});
    // 加料特效（筆畫型）：hl 螢光筆、sticky 便利貼——由同一支筆畫出來（其餘特效見 fxOf）
    ((s.props?.fx ?? []) as Fx[]).forEach((e, j) => {
      const at = k.C(e.cue, 30), x = e.x ?? 960, y = e.y ?? 540;
      if (e.type === 'hl') k.shape(at, x, y, 1, {strokes: [`M0 0 L${e.w ?? 400} 0`], w: e.h ?? 50, ink: 'rgba(247,201,74,0.55)'}, 10, 'none');
      if (e.type === 'sticky') {
        const w = e.w ?? 400, h = e.h ?? 230, lines = wrap(e.text ?? '', e.wrap ?? 8).slice(0, 3), size = e.size ?? 46;
        k.shape(at, x, y, 1, card(w, h, '#fff1a8'), 8, 'pop', e.rot ?? -3, k.id(`sticky${j}`));
        lines.forEach((ln, i) => k.text(at + 6 + i * 4, x, y - ((lines.length - 1) * size * 1.25) / 2 + size * 0.35 + i * size * 1.25, ln, size,
          {dur: tdur(ln, 8), color: e.color, box: k.id(`sticky${j}`)}));
      }
    });
    // 跨章引用角標（2026-10-09，系列教學）：props.ref＝"5-1" 或 ["5-1","5-3"]，refCue＝第幾句旁白出現；畫在區域左上角
    const refs: string[] = ([] as string[]).concat(s.props?.ref ?? []);
    let rx = 40;
    refs.forEach((rf, j) => {
      const t = `👉 ${rf}`, w = wbTextW(t, 44) + 60, at = k.C(s.props?.refCue, 30) + j * 10;
      k.shape(at, rx + w / 2, 62, 1, card(w, 76, '#fde2dc'), 8, 'pop', 0, k.id(`ref${j}`));
      k.text(at + 6, rx + w / 2, 78, t, 44, {bold: true, color: WB.red, dur: 8, sfx: 'none', box: k.id(`ref${j}`)});
      rx += w + 20;
    });
    items.forEach((it) => { it.at = Math.max(it.at, T0); });   // 鏡頭到位前不畫；同時開始的照寫入順序（標題先、再卡片）
    items.sort((a, b) => a.at - b.at);
    const end = s.from + s.dur - 4, want = items.map((it) => [it.at, it.dur]);
    for (let pass = 0, k2 = 1; pass < 4; pass++) {      // 排不下就整場等比例加快，保證換場前畫完
      let t = T0;
      items.forEach((it, j) => { it.dur = Math.max(3, Math.round(want[j][1] * k2)); it.at = Math.max(want[j][0], t); t = it.at + it.dur - 2; });
      if (t + 2 <= end || !items.length) break;
      k2 *= Math.max(0.35, (end - T0) / Math.max(1, t + 2 - T0)) * 0.97;
    }
    all.push(...items);
  });
  return all;
};

/* ---------- 加料特效（2026-10-09，系列教學；使用者選定 6 種，每支片自己判斷挑 2～3 種用）----------
   場景 props.fx = [{type, cue, x, y, ...}]（x、y＝場景區域內座標 0..1920 × 0..1080，內容放在 y<900）
   zoom   鏡頭推近＋白色泡泡：{x, y, z=1.4, cue, untilCue|sec, text, bx, by}（泡泡尖角指著 x,y）
   hl     螢光筆：{x, y, w, h, cue}（從 x 往右劃一道；筆畫出來）
   sticky 便利貼：{x, y, w, h, text, cue, rot}（老師提醒用；筆畫出來）
   stamp  紅色印章：{x, y, text="統測必考", cue, rot=-12}
   pow    擬聲字：{x, y, text="正解！", cue, sec=2.5, rot}
   roll   數字往上數：{x, y, from, to, base=10, pad, size, suffix, cue, sec=2}
   pup    吉祥物反應：{x, y, mood: yay|wow|think, size=260, cue, sec=3}（storyboard brand 資料夾要有 mascot.png）
   卡片、清單依旁白錯開出現（骨牌）用原本的 cueMap。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fx = {type: string; cue?: number; untilCue?: number; sec?: number; x?: number; y?: number; [k: string]: any};
type Ov = {kind: string; at: number; end: number; x: number; y: number; p: Fx};
type Zoom = {a: number; b: number; x: number; y: number; z: number};
const FX_CACHE = new WeakMap<object, {ov: Ov[]; zm: Zoom[]}>();
const fxOf = (spec: TplSpec) => {
  const hit = FX_CACHE.get(spec);
  if (hit) return hit;
  const v: {ov: Ov[]; zm: Zoom[]} = {ov: [], zm: []};
  spec.scenes.forEach((s, i) => {
    const g = region(i), last = s.from + s.dur - 6;
    const C = (ci: number | undefined, fb: number) => s.from + cue(s.cues ?? [], ci, fb);
    ((s.props?.fx ?? []) as Fx[]).forEach((e) => {
      const at = Math.max(C(e.cue, 30), s.from + PAN + 4);
      const end = Math.min(last, e.untilCue !== undefined ? C(e.untilCue, 90) : at + Math.round((e.sec ?? 3) * 30));
      const x = g.x + (e.x ?? 960), y = g.y + (e.y ?? 540);
      if (e.type === 'zoom') {
        const z = e.z ?? 1.4, hw = 960 / z, hh = 540 / z;     // 推近的視野不超出這個場景的區域（不然會看到隔壁場景）
        v.zm.push({a: at, b: end, x: g.x + Math.min(1920 - hw, Math.max(hw, e.x ?? 960)), y: g.y + Math.min(1080 - hh, Math.max(hh, e.y ?? 540)), z});
        if (e.text) v.ov.push({kind: 'bubble', at: at + 12, end: end - 8, x: g.x + (e.bx ?? (e.x ?? 960)), y: g.y + (e.by ?? ((e.y ?? 540) - 190)), p: {...e, tx: x, ty: y}});
      } else if (['stamp', 'pow', 'roll', 'pup'].includes(e.type)) {
        v.ov.push({kind: e.type, at, end: e.type === 'stamp' || e.type === 'roll' ? last : end, x, y, p: e});
      }
    });
  });
  FX_CACHE.set(spec, v);
  return v;
};
const popIn = (f: number, at: number, over = 1.25) => {
  const t = f - at;
  if (t < 0) return 0;
  return t < 6 ? interpolate(t, [0, 6], [0.2, over]) : t < 12 ? interpolate(t, [6, 12], [over, 1]) : 1;
};
const FxLayer: React.FC<{spec: TplSpec; f: number}> = ({spec, f}) => {
  const {ov} = fxOf(spec);
  return (
    <>
      {ov.map((o, i) => {
        if (f < o.at || f > o.end + 10) return null;
        const out = 1 - lerp(f, o.end, o.end + 10), p = o.p;
        if (o.kind === 'stamp') {
          const t = String(p.text ?? '統測必考'), size = p.size ?? 58, w = wbTextW(t, size) + 70, h = size * 1.7;
          const sc = f - o.at < 6 ? interpolate(f - o.at, [0, 6], [1.8, 1]) : 1, op = lerp(f, o.at, o.at + 4);
          return (
            <g key={i} data-qa="ignore" transform={`translate(${o.x} ${o.y}) rotate(${p.rot ?? -12}) scale(${sc})`} opacity={op * 0.92}>
              <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={14} fill="none" stroke="#d6342a" strokeWidth={8} />
              <rect x={-w / 2 + 10} y={-h / 2 + 10} width={w - 20} height={h - 20} rx={8} fill="none" stroke="#d6342a" strokeWidth={3} />
              <text x={0} y={size * 0.36} textAnchor="middle" style={{fontFamily: BOLD}} fontWeight={900} fontSize={size} fill="#d6342a" letterSpacing={4}>{t}</text>
            </g>);
        }
        if (o.kind === 'pow') {
          const t = String(p.text ?? '正解！'), size = p.size ?? 110, sc = popIn(f, o.at, 1.3) * (1 + 0.03 * Math.sin((f - o.at) / 3));
          return (
            <g key={i} data-qa="ignore" transform={`translate(${o.x} ${o.y}) rotate(${p.rot ?? -8}) scale(${sc})`} opacity={out}>
              <text x={0} y={size * 0.36} textAnchor="middle" style={{fontFamily: BOLD, paintOrder: 'stroke fill'}} fontWeight={900} fontSize={size}
                fill="#ffd23f" stroke="#1d232a" strokeWidth={14} strokeLinejoin="round">{t}</text>
            </g>);
        }
        if (o.kind === 'pup') {
          const m = spec.brand?.mascot;
          if (!m) return null;
          const H = p.size ?? 260, W = H * 0.58, t = f - o.at, mood = p.mood ?? 'yay';
          const dy = mood === 'yay' ? -Math.abs(Math.sin(t / 5)) * 26 : 0;
          const rot = mood === 'wow' ? Math.sin(t * 1.4) * 5 * Math.max(0, 1 - t / 24) : mood === 'think' ? Math.sin(t / 10) * 4 : 0;
          const mark = mood === 'yay' ? '✦' : mood === 'wow' ? '！' : '？', mc = mood === 'yay' ? WB.yellow : mood === 'wow' ? WB.red : WB.blue;
          return (
            <g key={i} data-qa="ignore" transform={`translate(${o.x} ${o.y + dy}) rotate(${rot}) scale(${popIn(f, o.at, 1.12) * out})`}>
              <ellipse cx={0} cy={H / 2 - 6 - dy} rx={W * 0.42} ry={12} fill="#000" opacity={0.12} />
              <image href={staticFile(m)} x={-W / 2} y={-H / 2} width={W} height={H} />
              <text x={W * 0.48} y={-H * 0.32} textAnchor="middle" style={{fontFamily: BOLD, paintOrder: 'stroke fill'}} fontWeight={900}
                fontSize={H * 0.24} fill={mc} stroke="#fff" strokeWidth={8} opacity={lerp(f, o.at + 8, o.at + 12)}>{mark}</text>
            </g>);
        }
        if (o.kind === 'roll') {
          const base = p.base ?? 10, size = p.size ?? 160, from = p.from ?? 0, to = p.to ?? 0, pad = p.pad ?? 0;
          const n = Math.round((p.sec ?? 2) * 30), tt = lerp(f, o.at, o.at + n, 0, 1, Easing.out(Easing.cubic));
          const val = from + (to - from) * tt, v = Math.min(to, Math.floor(val + 1e-6)), fr = v >= to ? 0 : val - v;
          const sa = v.toString(base).toUpperCase().padStart(pad, '0'), sb = Math.min(to, v + 1).toString(base).toUpperCase().padStart(sa.length, '0');
          const dw = size * 0.62, W = sa.length * dw, col = p.color ?? WB.orange, e = Easing.inOut(Easing.cubic)(fr);
          return (
            <g key={i} transform={`translate(${o.x} ${o.y})`}>
              <clipPath id={`roll${i}`}><rect x={-W / 2 - 10} y={-size * 0.95} width={W + 20} height={size * 1.25} /></clipPath>
              <g clipPath={`url(#roll${i})`}>
                {[...sa].map((d, j) => {
                  const nd = sb[j] ?? d, cx = -W / 2 + dw * (j + 0.5);
                  const txt = (ch: string, oy: number, op: number) => <text x={cx} y={oy} textAnchor="middle" style={{fontFamily: BOLD}} fontWeight={900}
                    fontSize={size} fill={textInk(col, size)} opacity={op}>{ch}</text>;
                  return <g key={j}>{nd !== d ? <>{txt(d, -e * size, 1 - e)}{txt(nd, (1 - e) * size, e)}</> : txt(d, 0, 1)}</g>;
                })}
              </g>
              {p.suffix && <text x={W / 2 + 14} y={0} style={{fontFamily: BOLD}} fontWeight={900} fontSize={size * 0.45} fill={WB.ink}>{p.suffix}</text>}
            </g>);
        }
        if (o.kind === 'bubble') {
          const t = String(p.text), size = p.size ?? 46, w = wbTextW(t, size) + 70, h = size * 1.9, sc = popIn(f, o.at, 1.08) * out;
          const dx = p.tx - o.x, dy = p.ty - o.y, by = dy > 0 ? h / 2 : -h / 2, bx = Math.max(-w / 2 + 40, Math.min(w / 2 - 40, dx * 0.4));
          return (
            <g key={i} transform={`translate(${o.x} ${o.y}) scale(${sc})`} data-qa-box={`bub${i}`}>
              <path d={`M${bx - 24} ${by} L${dx * 0.85} ${dy * 0.85} L${bx + 24} ${by} Z`} fill="#fff" stroke={WB.ink} strokeWidth={6} strokeLinejoin="round" />
              <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill="#fff" stroke={WB.ink} strokeWidth={6} />
              <rect x={bx - 21} y={by - 9} width={42} height={18} fill="#fff" />
              <text data-qa-in={`bub${i}`} x={0} y={size * 0.36} textAnchor="middle" style={{fontFamily: BOLD}} fontWeight={900} fontSize={size} fill={WB.ink}>{t}</text>
            </g>);
        }
        return null;
      })}
    </>
  );
};
/** 特效音：印章、吉祥物「啵」；擬聲字與數字停住「叮」 */
const FxSfx: React.FC<{spec: TplSpec}> = ({spec}) => (
  <>
    {fxOf(spec).ov.map((o, i) => {
      if (o.kind === 'bubble') return null;
      const n = o.kind === 'roll' ? Math.round((o.p.sec ?? 2) * 30) : o.kind === 'stamp' ? 5 : 0;
      const wav = o.kind === 'pow' || o.kind === 'roll' ? 'ding' : 'pop';
      return <Sequence key={i} from={o.at + n} durationInFrames={36} layout="none">
        <Audio src={staticFile(`sfx_d/${wav}.wav`)} volume={o.kind === 'stamp' ? 0.4 : 0.28} /></Sequence>;
    })}
  </>
);

/* ---------- 鏡頭 ---------- */
/** 片尾拉遠的起點：最後一句字幕結束後（最晚 = 片尾前 80 格） */
const outroStart = (spec: TplSpec) => {
  if (spec.outro === false) return spec.totalFrames + 999;   // storyboard "outro": false＝片尾不拉遠看全景（2026-10-09 系列教學：正式片不需要）
  const last = spec.captions.length ? spec.captions[spec.captions.length - 1].to + 6 : 0;
  return Math.min(spec.totalFrames - 40, Math.max(spec.totalFrames - 80, last));
};
type Cam = {x: number; y: number; z: number; oy?: number};
const camAt = (spec: TplSpec, f: number): Cam => {
  const ctr = (i: number) => ({x: region(i).x + 960, y: region(i).y + 540});
  const n = spec.scenes.length;
  let idx = 0;
  spec.scenes.forEach((s, i) => { if (f >= s.from) idx = i; });
  let cam: Cam;
  if (idx === 0) {
    const p = lerp(f, 0, 30);
    cam = {...ctr(0), z: 1.12 - 0.12 * p};
  } else {
    const a = ctr(idx - 1), b = ctr(idx), s0 = spec.scenes[idx].from;
    const p = lerp(f, s0, s0 + PAN, 0, 1, Easing.inOut(Easing.cubic));
    const dip = Math.min(0.28, Math.hypot(b.x - a.x, b.y - a.y) / 9000);
    cam = {x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, z: 1 - dip * Math.sin(Math.PI * p)};
  }
  for (const zq of fxOf(spec).zm) {                       // 加料特效 zoom：推近、停住、拉回
    const w = lerp(f, zq.a, zq.a + 14) * (1 - lerp(f, zq.b - 14, zq.b));
    if (w > 0) cam = {x: cam.x + (zq.x - cam.x) * w, y: cam.y + (zq.y - cam.y) * w, z: cam.z * Math.pow(zq.z, w)};
  }
  // 片尾：拉遠看整張白板
  const rows = Math.ceil(n / COLS), cols = Math.min(n, COLS);
  const W = (cols - 1) * SX + 1920, H = (rows - 1) * SY + 1080;
  const lg = !!spec.brand?.logo;
  const zAll = Math.min(1920 / (W + 160), (lg ? 720 : 880) / (H + 80));   // 全景放在字幕區上方（有 LOGO 時也讓開右上角）
  const q0 = outroStart(spec), q = lerp(f, q0, Math.min(spec.totalFrames - 12, q0 + 50), 0, 1, Easing.inOut(Easing.cubic));
  if (q > 0 && n > 1) {
    const z = Math.exp(Math.log(cam.z) + (Math.log(zAll) - Math.log(cam.z)) * q);
    return {x: cam.x + (W / 2 - cam.x) * q, y: cam.y + (H / 2 - cam.y) * q, z, oy: 540 - (lg ? 5 : 85) * q};
  }
  return cam;
};
const toScreen = (pt: {x: number; y: number}, c: Cam) => ({x: (pt.x - c.x) * c.z + 960, y: (pt.y - c.y) * c.z + (c.oy ?? 540)});

/* ---------- 筆：畫的時候貼著筆尖，空檔短就滑到下一筆，空檔長就收到右下角 ---------- */
const OFF = {x: 2450, y: 1650};
const penAt = (spec: TplSpec, items: Item[], f: number, c: Cam) => {
  for (const it of items) { const tp = tipOf(it, f); if (tp) return toScreen(tp, c); }
  let prev: Item | null = null, next: Item | null = null;
  for (const it of items) {
    if (it.at + it.dur < f && (!prev || it.at + it.dur > prev.at + prev.dur)) prev = it;
    if (it.at > f && (!next || it.at < next.at)) next = it;
  }
  const pEnd = prev ? prev.at + prev.dur : -999;
  const pTip = prev ? toScreen(tipOf(prev, pEnd)!, camAt(spec, pEnd)) : OFF;
  const nTip = next ? toScreen(tipOf(next, next.at)!, camAt(spec, next.at)) : OFF;
  const mix = (a: typeof OFF, b: typeof OFF, p: number) => ({x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p - Math.sin(Math.PI * p) * 40});
  if (next && next.at - pEnd <= 24) return mix(pTip, nTip, lerp(f, pEnd, next.at));
  if (f - pEnd < 13) return mix(pTip, OFF, lerp(f, pEnd, pEnd + 13, 0, 1, Easing.in(Easing.quad)));
  if (next && next.at - f < 13) return mix(OFF, nTip, lerp(f, next.at - 13, next.at, 0, 1, Easing.out(Easing.quad)));
  return OFF;
};

/* ---------- 音效（tpl_sfx.py D 產生 public/sfx_d/*.wav；換場 whoosh 在 tpl_sfx.wav） ---------- */
const DrawSfx: React.FC<{items: Item[]}> = ({items}) => (
  <>
    {items.map((it, i) => (
      <React.Fragment key={i}>
        <Sequence from={it.at} durationInFrames={Math.max(4, it.dur)} layout="none">
          <Audio src={staticFile('sfx_d/scribble.wav')} startFrom={(i * 37) % 120}
            volume={(t) => 0.22 * Math.min(1, t / 3, Math.max(0, (Math.max(4, it.dur) - t) / 3))} />
        </Sequence>
        {it.kind === 'shape' && it.sfx === 'pop' && (
          <Sequence from={it.at + it.dur} durationInFrames={10} layout="none"><Audio src={staticFile('sfx_d/pop.wav')} volume={0.3} /></Sequence>)}
        {(it.sfx === 'ding' || it.sfx === 'buzz') && (
          <Sequence from={it.at + (it.kind === 'text' ? Math.max(0, it.dur - 2) : 2)} durationInFrames={36} layout="none">
            <Audio src={staticFile(`sfx_d/${it.sfx}.wav`)} volume={it.sfx === 'ding' ? 0.28 : 0.22} /></Sequence>)}
      </React.Fragment>
    ))}
  </>
);

export const TemplateD: React.FC<TplSpec> = (spec) => {
  const f = useCurrentFrame();
  const items = useMemo(() => buildItems(spec), [spec]);
  const c = camAt(spec, f);
  const pen = penAt(spec, items, f, c);
  const cap = f < outroStart(spec) ? captionAt(spec, f, 8) : undefined;
  // 前一頁字幕 10 格內剛結束（接續換頁）就直接顯示、不淡入：淡入第一格只有 40%，短頁（「是數位」）會被判成字幕帶空一格閃爍（2026-10-09 1-1 抓到）
  const joined = cap ? spec.captions.some((c) => c !== cap && c.to <= cap.from && cap.from - c.to <= 10) : false;
  const capO = cap ? (joined ? 1 : interpolate(f, [cap.from - 2, cap.from + 3], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})) : 0;
  const fade = Math.max(0, spec.brand ? 0 : 1 - f / 8, (f - (spec.totalFrames - 12)) / 12);   // 有片頭時由片頭淡入白板，不從黑開場
  const vis = items.filter((it) => it.at <= f);
  return (
    <AbsoluteFill style={{backgroundColor: WB.paper, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #f6f6f7 0%, #eeeef0 60%, #dfe0e3 100%)'}} />
      <svg width={1920} height={1080} style={{position: 'absolute', opacity: 0.35}}>
        {Array.from({length: 140}, (_, i) => <circle key={i} cx={random(`x${i}`) * 1920} cy={random(`y${i}`) * 1080} r={0.8 + random(`r${i}`) * 1.2} fill="#b9bcc2" />)}
      </svg>
      <div data-qa="canvas" style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080}}>
        <svg width={1920} height={1080} style={{position: 'absolute', overflow: 'visible'}}>
          <g transform={`translate(960 ${c.oy ?? 540}) scale(${c.z}) translate(${-c.x} ${-c.y})`}>
            {vis.map((it, i) => it.kind === 'shape'
              ? <DrawShape key={i} it={it} f={f} />
              : <DrawText key={i} it={it} f={f} id={`wbt${i}`} hand={HAND} bold={BOLD} />)}
            <FxLayer spec={spec} f={f} />
          </g>
        </svg>
      </div>
      <svg data-qa="ignore" width={1920} height={1080} style={{position: 'absolute'}}>
        <Marker x={pen.x} y={pen.y} scale={0.95 * Math.max(0.75, c.z)} tilt={Math.sin(f / 9) * 2} kind={spec.pen} />
      </svg>
      {cap && (
        <div data-qa="caption" style={{position: 'absolute', left: 60, right: 60, top: 948, textAlign: 'center', opacity: capO, fontFamily: BOLD, fontWeight: 900,
          fontSize: 54, color: '#fff', letterSpacing: 2, WebkitTextStroke: '10px #1d232a', paintOrder: 'stroke fill', textShadow: '0 4px 10px rgba(0,0,0,0.25)'}}>{cap.text}</div>
      )}
      <BrandLogo logo={spec.brand?.logo} width={spec.brand?.logoWidth} />
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
      {spec.qa && <QaProbe w={spec.width} h={spec.height} />}
      {spec.music && <Audio src={staticFile(spec.music)} volume={spec.musicVolume ?? 0.5} />}
      {spec.voice && <Audio src={staticFile(spec.voice)} />}
      <Audio src={staticFile('tpl_sfx.wav')} />
      <DrawSfx items={items} />
      <FxSfx spec={spec} />
    </AbsoluteFill>
  );
};
