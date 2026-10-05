/* 版面品檢探針：只在 props.qa=true 時掛上（正式渲染不會出現）。
   字型載完後量測畫面上每一段文字的實際位置，輸出 QA:{json} 到瀏覽器 console，
   由 04_引擎/qa/qa_layout.mjs 收集。

   檢查：超出畫面、文字互相重疊、闖進字幕區、超出安全區、字級過小、內容溢出、
        文字被裁切（行數超過容器）、物件標點、文字貼邊（壓到圓角弧線）。
   data-qa="caption" 是字幕帶；data-qa="chrome" 是 LOGO／章節標籤／進度條，不受安全區限制。 */
import React, {useLayoutEffect, useState} from 'react';
import {continueRender, delayRender, useCurrentFrame} from 'remotion';

export const QA_RULES = {
  // 安全區採 ChatGPT 建議與 Remotion 官方 video-layout 規則的數字：左右 80px、上下 100px。
  // 下緣另有字幕區（約 y 940 起），內容不得進入，由「闖進字幕區」把關。
  safeX: 80, safeTop: 100, safeBottom: 980,
  minGap: 12,           // 兩段相鄰文字（不同元素）最小間距；太近看起來會黏在一起
  minFont: 24,          // 1080p 教學畫面可讀下限（px）
  overlap: 0.18,        // 兩段文字交疊面積 / 較小者面積
  minOpacity: 0.35,     // 低於這個透明度視為「還沒出現」，不量
  headingFont: 56,      // 字級 ≥ 這個值視為標題，最多兩行
  contrast: 4.5,        // WCAG 2.x AA：一般文字 4.5:1；大字（≥32px 或 ≥24px 粗體）3:1
  contrastLarge: 3.0,
  centerTol: 60,        // 全部內容的外框中心偏離畫面中線超過幾 px 算版面偏移
};

// ── 顏色與對比 ──
const rgba = (c: string): number[] | null => {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const v = m[1].split(',').map((x) => parseFloat(x));
  return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1];
};
const lum = ([r, g, b]: number[]) => {
  const f = (x: number) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrastRatio = (a: number[], b: number[]) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
/** 這段字底下實際看到的底色：取文字中心點，由上往下疊（elementsFromPoint），
 *  所以絕對定位的兄弟元素當底（例如定義卡的橘色強調底）也算得到；半透明就跟下層混色 */
const bgOf = (el: Element): number[] => {
  const r = el.getBoundingClientRect();
  const stack: number[][] = [];
  for (const e of document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)) {
    if (e !== el && el.contains(e)) continue;
    const c = rgba(getComputedStyle(e).backgroundColor);
    if (c && c[3] > 0) { stack.push(c); if (c[3] >= 0.99) break; }
  }
  let base = [24, 24, 24];
  for (const c of stack.reverse()) base = base.map((x, i) => x * (1 - c[3]) + c[i] * c[3]);
  return base;
};
/** 有實體外觀的「圖塊」：卡片、膠囊（有背景或框線）、圖片、SVG、emoji 大圖示 */
const blockOf = (el: Element, W: number, H: number) => {
  const r = el.getBoundingClientRect();
  if (r.width < 24 || r.height < 24 || r.width * r.height > W * H * 0.5) return null;
  const cs = getComputedStyle(el);
  const solid = (rgba(cs.backgroundColor)?.[3] ?? 0) > 0.2 || parseFloat(cs.borderTopWidth) > 0;
  const media = el.tagName === 'IMG' || el.tagName === 'svg';
  return solid || media ? r : null;
};

/** 一個元素自己的文字排成幾行、每行多寬、幾個字 */
const lineBoxes = (el: Element) => {
  const rows: {top: number; w: number; chars: number; last: string; first: string; zwAfter: boolean}[] = [];
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType !== 3) continue;
    const txt = node.textContent ?? '';
    for (let i = 0; i < txt.length; i++) {
      if (!txt[i].trim()) continue;
      const r = document.createRange();
      r.setStart(node, i); r.setEnd(node, i + 1);
      const rect = r.getBoundingClientRect();
      if (!rect.width) continue;
      let row = rows.find((x) => Math.abs(x.top - rect.top) < rect.height * 0.5);
      if (!row) { row = {top: rect.top, w: 0, chars: 0, last: '', first: txt[i], zwAfter: false}; rows.push(row); }
      row.w += rect.width; row.chars += 1; row.last = txt[i];
      row.zwAfter = txt[i + 1] === '​' || txt[i + 1] === ' ';   // 後面是詞邊界（零寬空白）或空白
    }
  }
  return rows.sort((a, b) => a.top - b.top);
};

type Box = {text: string; x: number; y: number; w: number; h: number; el: Element; font: number; chrome: boolean};

/** 文字所在的圓角框（往上找 5 層內第一個有圓角、且有底色或邊框的元素） */
const roundedCard = (el: Element) => {
  let e = el.parentElement;
  for (let k = 0; e && k < 5; k++, e = e.parentElement) {
    const cs = getComputedStyle(e);
    const rad = parseFloat(cs.borderTopLeftRadius || '0');
    const solid = (rgba(cs.backgroundColor)?.[3] ?? 0) > 0.2 || parseFloat(cs.borderTopWidth) > 0;
    if (rad > 0 && solid) {
      const r = e.getBoundingClientRect();
      return {r, rad: Math.min(rad, r.height / 2, r.width / 2)};
    }
  }
  return null;
};

/** 文字框四角是否落在圓角框的圓弧外（壓到或超出弧線）。回傳超出幾 px，0＝沒問題 */
const curveOverflow = (b: {x: number; y: number; w: number; h: number}, card: {r: DOMRect; rad: number}) => {
  const {r, rad} = card;
  if (rad < 12) return 0;
  const shrink = b.h * 0.15;                       // 行高上下有留白，取字形的大略範圍
  const ys = [b.y + shrink, b.y + b.h - shrink], xs = [b.x, b.x + b.w];
  let worst = 0;
  for (const x of xs) for (const y of ys) {
    const cx = x < r.left + rad ? r.left + rad : x > r.right - rad ? r.right - rad : null;
    const cy = y < r.top + rad ? r.top + rad : y > r.bottom - rad ? r.bottom - rad : null;
    if (cx === null || cy === null) continue;      // 不在四個圓角區
    const d = Math.hypot(x - cx, y - cy) - (rad - 8);   // 至少離弧線 8px
    worst = Math.max(worst, d);
  }
  return Math.round(worst);
};

const opacityOf = (el: Element) => {
  let e: Element | null = el, op = 1;
  while (e && (e instanceof HTMLElement || e instanceof SVGElement)) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
    op *= parseFloat(cs.opacity || '1');
    e = e.parentElement;
  }
  return op;
};

const measure = (W: number, H: number) => {
  const issues: {kind: string; text: string; detail: string}[] = [];
  const leaves: Box[] = [];
  let cap: DOMRect | null = null;
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    if ((el as HTMLElement).dataset?.qa === 'caption') { cap = el.getBoundingClientRect(); continue; }
    if (el.closest('[data-qa="caption"]')) continue;
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3 && (n.textContent ?? '').trim())
      .map((n) => n.textContent!.trim()).join('');
    if (!own) continue;
    if (opacityOf(el) < QA_RULES.minOpacity) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.right < 0 || r.bottom < 0 || r.left > W || r.top > H) continue;
    const font = parseFloat(getComputedStyle(el).fontSize || '0');
    // 祖先的 transform: scale 會讓實際字級變小，用渲染高度與 CSS 高度的比例換算
    const he = el as HTMLElement;
    const ratio = he.offsetHeight ? r.height / he.offsetHeight : 1;
    const b: Box = {text: own.slice(0, 28), x: r.left, y: r.top, w: r.width, h: r.height, el,
                    font: Math.round(font * ratio), chrome: !!el.closest('[data-qa="chrome"]')};
    leaves.push(b);
    const box = `(${Math.round(r.left)},${Math.round(r.top)})-(${Math.round(r.right)},${Math.round(r.bottom)})`;
    if (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2)
      issues.push({kind: '超出畫面', text: b.text, detail: box});
    else if (!b.chrome && (r.left < QA_RULES.safeX || r.right > W - QA_RULES.safeX ||
                           r.top < QA_RULES.safeTop || r.bottom > QA_RULES.safeBottom))
      issues.push({kind: '超出安全區', text: b.text, detail: box});
    // 對比度：只量完全不透明（已被唸到／焦點中）的文字；淡化中的非焦點項本來就是刻意壓暗
    const fg = rgba(getComputedStyle(el).color);
    // 彩色圖示不是文字，不量對比（含 2️⃣ 這種數字鍵帽：數字＋FE0F＋20E3）
    const emojiOnly = /^(?:[\p{Extended_Pictographic}️‍⃣\s]|[0-9#*](?=️?⃣))+$/u.test(own);
    if (!emojiOnly && fg && fg[3] > 0.9 && opacityOf(el) > 0.95 && getComputedStyle(el).backgroundClip !== 'text') {
      const cr = contrastRatio(fg, bgOf(el));
      const weight = parseInt(getComputedStyle(el).fontWeight || '400', 10);
      const need = b.font >= 32 || (b.font >= 24 && weight >= 700) ? QA_RULES.contrastLarge : QA_RULES.contrast;
      if (cr < need) issues.push({kind: '對比不足', text: b.text, detail: `${cr.toFixed(2)}:1 < ${need}:1`});
    }
    if (!b.chrome && b.font && b.font < QA_RULES.minFont)
      issues.push({kind: '字級過小', text: b.text, detail: `${b.font}px < ${QA_RULES.minFont}px`});
    if (he.scrollWidth > he.clientWidth + 4 && getComputedStyle(he).overflow !== 'visible')
      issues.push({kind: '內容溢出', text: b.text, detail: `scroll ${he.scrollWidth} > ${he.clientWidth}`});
    // 物件標點（2026-10-04 使用者抽檢）：畫面物件文字比照字幕規則，不放「，」「；」、不以「。」結尾
    if (!b.chrome && (/[，；—―]|[。]$/u.test(own) || /點(?=[A-Za-z])/u.test(own)))
      issues.push({kind: '物件標點', text: b.text, detail: `含「${(own.match(/[，；。—―]|點(?=[A-Za-z])/u) ?? [''])[0]}」`});
    // 文字貼邊：文字壓到圓角框（膠囊）的弧線（2026-10-04 使用者抽檢 1-14 流程卡）
    const card = b.chrome ? null : roundedCard(el);
    const over = card ? curveOverflow(b, card) : 0;
    if (over > 0) issues.push({kind: '文字貼邊', text: b.text, detail: `超出圓角安全範圍 ${over}px`});
    // 斷行：用 Range 取每一行的實際範圍。最後一行只剩 1～3 個字（孤字）、或大字標題超過兩行，都算版面問題
    const lines = lineBoxes(el);
    if (!b.chrome && lines.length >= 2) {
      const last = lines[lines.length - 1];
      const widest = Math.max(...lines.map((l) => l.w));
      if (last.chars <= 3 && last.w < widest * 0.3)
        issues.push({kind: '斷行不佳', text: b.text, detail: `${lines.length} 行，最後一行只剩 ${last.chars} 字`});
      // 詞中斷行：換行處前一個字不是標點（中文詞或英數詞被切開，例如「每台裝／置一個」「私有／IP」）
      for (let k = 0; k < lines.length - 1; k++) {
        const endOk = /[，、：；。？！…」』）\s—​]/u.test(lines[k].last) || lines[k].zwAfter;
        const nextStartsLatin = /[A-Za-z0-9]/.test(lines[k + 1].first) && /[A-Za-z0-9]/.test(lines[k].last);
        const startsWithPunct = /^[，、：；。？！…・·」』）]/u.test(lines[k + 1].first);   // 標點不能在行首
        if (!endOk || nextStartsLatin || startsWithPunct) {
          issues.push({kind: '詞中斷行', text: b.text, detail: `第 ${k + 1} 行結尾「${lines[k].last}」→ 下一行「${lines[k + 1].first}」`});
          break;
        }
      }
      if (b.font >= QA_RULES.headingFont && lines.length > 2)
        issues.push({kind: '標題過長', text: b.text, detail: `${b.font}px 標題排成 ${lines.length} 行`});
    }
  }
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const a = leaves[i], c = leaves[j];
    if (a.el.contains(c.el) || c.el.contains(a.el)) continue;
    const ix = Math.max(0, Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x));
    const iy = Math.max(0, Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y));
    const small = Math.min(a.w * a.h, c.w * c.h);
    if (small > 0 && (ix * iy) / small > QA_RULES.overlap)
      issues.push({kind: '文字重疊', text: `${a.text} × ${c.text}`, detail: `${Math.round((ix * iy) / small * 100)}%`});
  }
  // 間距過小：兩段文字在某一軸上重疊（同一列或同一欄），另一軸的距離卻小於 minGap
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const a = leaves[i], c = leaves[j];
    if (a.chrome || c.chrome || a.el.contains(c.el) || c.el.contains(a.el)) continue;
    const blockOfEl = (e: Element) => { let p: Element | null = e; while (p && getComputedStyle(p).display.startsWith('inline')) p = p.parentElement; return p; };
    if (blockOfEl(a.el) === blockOfEl(c.el)) continue;      // 同一句話裡的強調片段
    if (a.el.parentElement === c.el.parentElement && a.el.tagName === 'SPAN' && c.el.tagName === 'SPAN') continue;  // 同一段文字切成的短語（flex 容器會把 inline-block 變成 block）
    const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
    const oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
    if (ox > 0 && oy > 0) continue;                       // 已經重疊，交給「文字重疊」
    const gapY = Math.max(a.y, c.y) - Math.min(a.y + a.h, c.y + c.h);
    const gapX = Math.max(a.x, c.x) - Math.min(a.x + a.w, c.x + c.w);
    const gap = ox > Math.min(a.w, c.w) * 0.3 ? gapY : oy > Math.min(a.h, c.h) * 0.3 ? gapX : 999;
    if (gap >= 0 && gap < QA_RULES.minGap)
      issues.push({kind: '間距過小', text: `${a.text} ／ ${c.text}`, detail: `${Math.round(gap)}px < ${QA_RULES.minGap}px`});
  }
  // 圖塊重疊：卡片、膠囊、圖片彼此不是父子關係卻壓在一起
  const blocks: {el: Element; r: DOMRect}[] = [];
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    if (el.closest('[data-qa="chrome"]') || el.closest('[data-qa="caption"]')) continue;
    if (opacityOf(el) < QA_RULES.minOpacity) continue;
    const r = blockOf(el, W, H);
    if (r) blocks.push({el, r});
  }
  for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
    const a = blocks[i], c = blocks[j];
    if (a.el.contains(c.el) || c.el.contains(a.el)) continue;
    const ix = Math.min(a.r.right, c.r.right) - Math.max(a.r.left, c.r.left);
    const iy = Math.min(a.r.bottom, c.r.bottom) - Math.max(a.r.top, c.r.top);
    if (ix > 4 && iy > 4)
      issues.push({kind: '圖塊重疊', text: `${(a.el.textContent ?? a.el.tagName).slice(0, 12)} × ${(c.el.textContent ?? c.el.tagName).slice(0, 12)}`,
                   detail: `${Math.round(ix)}×${Math.round(iy)}px`});
  }
  // 版面置中：所有內容文字的外框中心要接近畫面中線（這套風格全部置中排版）
  const content: Box[] = [];
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    if (el.closest('[data-qa="chrome"]') || el.closest('[data-qa="caption"]')) continue;
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
    const r = el.getBoundingClientRect();
    // 文字＋卡片／膠囊外框都算（卡片裡的字常靠左對齊，只量字會誤判成偏一邊）
    const solid = blockOf(el, W, H);
    if ((own || solid) && r.width > 2 && r.height > 2 && r.right > 0 && r.left < W)
      content.push({text: (el.textContent ?? '').trim().slice(0, 28), x: r.left, y: r.top, w: r.width, h: r.height, el, font: 0, chrome: false});
  }
  if (content.length) {
    const l = Math.min(...content.map((b) => b.x)), r = Math.max(...content.map((b) => b.x + b.w));
    const off = (l + r) / 2 - W / 2;
    if (Math.abs(off) > QA_RULES.centerTol)
      issues.push({kind: '版面偏移', text: content[0].text, detail: `內容中心偏 ${Math.round(off)}px`});
  }
  if (cap) for (const b of leaves) {
    if (b.chrome) continue;
    const hx = Math.min(b.x + b.w, cap.right) - Math.max(b.x, cap.left);
    if (hx > 10 && b.y + b.h > cap.top + 2 && b.y < cap.bottom)
      issues.push({kind: '闖進字幕區', text: b.text, detail: `文字底 ${Math.round(b.y + b.h)} > 字幕頂 ${Math.round(cap.top)}`});
  }
  return {
    texts: leaves.length,
    issues,
    boxes: leaves.filter((b) => !b.chrome).map((b) => ({t: b.text, x: Math.round(b.x), y: Math.round(b.y),
      w: Math.round(b.w), h: Math.round(b.h), f: b.font})),
  };
};

export const QaProbe: React.FC<{w: number; h: number}> = ({w, h}) => {
  const f = useCurrentFrame();
  const [handle] = useState(() => delayRender('qa-measure'));
  useLayoutEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      console.log('QA:' + JSON.stringify({frame: f, ...measure(w, h)}));
      continueRender(handle);
    };
    (document as Document & {fonts: FontFaceSet}).fonts.ready.then(() => setTimeout(go, 80));
    const t = setTimeout(go, 3000);
    return () => clearTimeout(t);
  }, [f, handle, w, h]);
  return null;
};
