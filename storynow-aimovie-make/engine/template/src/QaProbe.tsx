/* 品檢探針：只在 inputProps.qa=true 時掛上。字型載完後量測畫面上所有文字，輸出 QA:{json} 到瀏覽器 console，
   由 scripts/qa_layout.mjs 收集。檢查：①超出畫面 ②文字互相重疊 ③內容闖進字幕區 ④元素內容溢出
   ⑤物件標點（畫面文字不放「，；—」、不以「。」結尾）⑥文字貼邊（壓到圓角框／膠囊的弧線）——⑤⑥ 2026-10-05 從範本E 移植。
   ⑦文字對比（WCAG 2.x AA：一般字 4.5:1、大字 3:1）——2026-10-08 從範本E 移植。
   ⑧手機字小（1080p 畫面上 <32px）⑨收集各格字色給色盲檢查（final_qa/colorblind_check.py）——2026-10-08。
   ⑩範本E 版面細項（2026-10-08 取代範本E 驗收時移植，級別 L.版面細項＝提醒後擋）：詞中斷行、斷行不佳、標題過長（HTML 字，用 Range 量每一行）、
   間距過小（兩段字 <12px）、圖塊重疊（卡片／膠囊／圖片互壓）、版面偏移——這三項只有根元素標 data-qa-strict 的卡片式範本才量（版面偏移另要 data-qa-centered）。 */
import React, {useLayoutEffect, useState} from 'react';
import {continueRender, delayRender, useCurrentFrame} from 'remotion';

type Box = {text: string; x: number; y: number; w: number; h: number; el: Element};

const visible = (el: Element) => {
  let e: Element | null = el, op = 1;
  while (e && e instanceof HTMLElement || e instanceof SVGElement) {
    const cs = getComputedStyle(e as Element);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
    op *= parseFloat(cs.opacity || '1');
    e = (e as Element).parentElement;
  }
  return op;
};

/** 文字所在的圓角框（往上 5 層內第一個有圓角、且有底色或邊框的元素） */
const roundedCard = (el: Element) => {
  let e = el.parentElement;
  for (let k = 0; e && k < 5; k++, e = e.parentElement) {
    const cs = getComputedStyle(e);
    const rad = parseFloat(cs.borderTopLeftRadius || '0');
    const bg = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor);
    const alpha = bg ? parseFloat(bg[1].split(',')[3] ?? '1') : 0;
    const solid = alpha > 0.2 || parseFloat(cs.borderTopWidth) > 0;
    if (rad > 0 && solid) {
      const r = e.getBoundingClientRect();
      return {r, rad: Math.min(rad, r.height / 2, r.width / 2)};
    }
  }
  return null;
};

/** 文字框四角落在圓角框弧線外（至少要離弧線 8px）超出幾 px，0＝沒問題 */
const curveOverflow = (b: {x: number; y: number; w: number; h: number}, card: {r: DOMRect; rad: number}) => {
  const {r, rad} = card;
  if (rad < 12) return 0;
  const shrink = b.h * 0.15;
  let worst = 0;
  for (const x of [b.x, b.x + b.w]) for (const y of [b.y + shrink, b.y + b.h - shrink]) {
    const cx = x < r.left + rad ? r.left + rad : x > r.right - rad ? r.right - rad : null;
    const cy = y < r.top + rad ? r.top + rad : y > r.bottom - rad ? r.bottom - rad : null;
    if (cx === null || cy === null) continue;
    worst = Math.max(worst, Math.hypot(x - cx, y - cy) - (rad - 8));
  }
  return Math.round(worst);
};

// ── 顏色與對比（2026-10-08 從範本E 移植）──
const rgba = (c: string): number[] | null => {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const v = m[1].split(/[ ,/]+/).filter(Boolean).map((x) => parseFloat(x));
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
/** 這段字底下實際看到的底色：文字中心點由上往下疊（elementsFromPoint），半透明就和下層混色。
 *  完全找不到底色時當成黑色（Remotion 輸出 mp4 時透明＝黑）；範本E 原本寫死深灰 #181818，白底範本會誤判 */
const bgOf = (el: Element): number[] => {
  const r = el.getBoundingClientRect();
  const stack: number[][] = [];
  // 只看疊在文字「下面」的東西：清單由上往下，文字之前的是蓋在字上面的（例如正在圈字的馬克筆），不算底色（2026-10-08）
  const hits = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  const own = hits.indexOf(el);
  for (const e of own >= 0 ? hits.slice(own + 1) : hits) {
    if (e !== el && el.contains(e)) continue;
    const ecs = getComputedStyle(e);
    // SVG 圖形（標籤、便利貼、手繪框）的底色在 fill，不在 background（2026-10-08 範本D「小測驗」標籤誤判）
    const shape = e instanceof SVGGeometryElement && !(e instanceof SVGTextContentElement);
    const c = rgba(shape ? ecs.fill : ecs.backgroundColor);
    if (c && shape) c[3] *= parseFloat(ecs.fillOpacity || '1') * parseFloat(ecs.opacity || '1');
    if (c && c[3] > 0) { stack.push(c); if (c[3] >= 0.99) break; }
  }
  let base = [0, 0, 0];
  for (const c of stack.reverse()) base = base.map((x, i) => x * (1 - c[3]) + c[i] * c[3]);
  return base;
};
/** 一個 HTML 元素自己的文字排成幾行、每行多寬、幾個字（範本E lineBoxes 移植） */
const lineBoxes = (el: Element) => {
  const rows: {top: number; w: number; chars: number; last: string; first: string; zwAfter: boolean}[] = [];
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType !== 3) continue;
    const txt = node.textContent ?? '';
    for (let i = 0; i < txt.length; i++) {
      if (!txt[i].trim()) continue;
      const rg = document.createRange();
      rg.setStart(node, i); rg.setEnd(node, i + 1);
      const rect = rg.getBoundingClientRect();
      if (!rect.width) continue;
      let row = rows.find((x) => Math.abs(x.top - rect.top) < rect.height * 0.5);
      if (!row) { row = {top: rect.top, w: 0, chars: 0, last: '', first: txt[i], zwAfter: false}; rows.push(row); }
      row.w += rect.width; row.chars += 1; row.last = txt[i];
      row.zwAfter = txt[i + 1] === '\u200b' || txt[i + 1] === ' ';
    }
  }
  return rows.sort((a, b) => a.top - b.top);
};
/** 有實體外觀的圖塊：卡片、膠囊（有底色或框線）、圖片（範本E blockOf 移植） */
const blockOf = (el: Element, W: number, H: number) => {
  const r = el.getBoundingClientRect();
  if (r.width < 24 || r.height < 24 || r.width * r.height > W * H * 0.5) return null;
  const cs = getComputedStyle(el);
  const solid = (rgba(cs.backgroundColor)?.[3] ?? 0) > 0.2 || parseFloat(cs.borderTopWidth) > 0;
  return solid || el.tagName === 'IMG' ? r : null;
};
const EMOJI_ONLY = /^(?:[\p{Extended_Pictographic}️‍⃣\s]|[0-9#*](?=️?⃣))+$/u;

const measure = (W: number, H: number) => {
  const issues: {kind: string; detail: string}[] = [];
  const leaves: Box[] = [];
  const colors: Record<string, string> = {};     // 字色 rgb → 一段用這個顏色的字（色盲檢查用）
  const all = Array.from(document.querySelectorAll('body *'));
  let cap: DOMRect | null = null;
  for (const el of all) {
    if ((el as HTMLElement).dataset?.qa === 'caption') { cap = el.getBoundingClientRect(); continue; }
    if (el.closest('[data-qa="caption"]') || el.closest('[data-qa="ignore"]')) continue;
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3 && (n.textContent ?? '').trim()).map((n) => n.textContent!.trim()).join('');
    if (!own) continue;
    if (visible(el) < 0.35) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.right < 0 || r.bottom < 0 || r.left > W || r.top > H) continue;   // 完全在畫面外＝觀眾看不到，不算
    const inCanvas = !!el.closest('[data-qa="canvas"]');                      // 一鏡到底大畫布：邊緣被鏡頭切掉是正常的
    const b = {text: own.slice(0, 24), x: r.left, y: r.top, w: r.width, h: r.height, el};
    leaves.push(b);
    if (!inCanvas && (r.left < -4 || r.top < -4 || r.right > W + 4 || r.bottom > H + 4)) issues.push({kind: '超出畫面', detail: `「${b.text}」(${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)})`});
    const he = el as HTMLElement;
    if (he.scrollWidth && he.clientWidth && he.scrollWidth > he.clientWidth + 6 && getComputedStyle(he).overflow !== 'visible')
      issues.push({kind: '內容溢出', detail: `「${b.text}」 scroll ${he.scrollWidth} > ${he.clientWidth}`});
    if (/[\u4e00-\u9fff]/.test(own) && (/[，；—―]/.test(own) || /。$/.test(own)))
      issues.push({kind: '物件標點', detail: `「${b.text}」`});
    const card = roundedCard(el);
    const over = card ? curveOverflow(b, card) : 0;
    if (over > 0) issues.push({kind: '文字貼邊', detail: `「${b.text}」超出圓角安全範圍 ${over}px`});
    // ⑦ 文字對比：只量完全不透明（已出現、焦點中）的字；淡化中的非焦點項本來就是刻意壓暗。SVG 文字的字色在 fill
    const cs = getComputedStyle(el);
    const fg = rgba(el instanceof SVGElement ? cs.fill : cs.color);
    // 畫面上實際的字高：HTML 用縮放比例換算；SVG 字（白板）跟著鏡頭縮放，用外框高度換算（中文字框約字級的 1.25 倍）
    const font = el instanceof SVGElement ? r.height / 1.25 : parseFloat(cs.fontSize || '0') * (he.offsetHeight ? r.height / he.offsetHeight : 1);
    // 鏡頭拉遠的全景（範本D 片尾「拉遠看整張白板」）：字被鏡頭縮到 75% 以下，那一刻是看全貌、不是閱讀，不量字級與對比
    // （2026-10-08：卡諾圖 2 的 47 處手機字小／對比不足全部出在片尾全景那一格）
    const zoom = el instanceof SVGGraphicsElement ? (() => { const m = el.getScreenCTM(); return m ? Math.hypot(m.a, m.b) : 1; })()
      : (he.offsetHeight ? r.height / he.offsetHeight : 1);
    const reading = zoom >= 0.75;
    // ⑧ 手機字小：手機上整個畫面縮小，1080p 畫面上的字要比電腦版下限（24px）大（門檻先訂 32px，看實際影片再調）
    const chrome = !!el.closest('[data-qa="chrome"]');      // 模擬的系統介面（工作列、時鐘）：不是內容，不量字級與間距
    if (reading && !chrome && !EMOJI_ONLY.test(own) && font > 0 && font < 32 && visible(el) > 0.95)
      issues.push({kind: '手機字小', detail: `「${b.text}」${Math.round(font)}px < 32px`});
    if (!EMOJI_ONLY.test(own) && fg && fg[3] > 0.9 && visible(el) > 0.95) colors[fg.slice(0, 3).map(Math.round).join(',')] ??= b.text;
    if (reading && !EMOJI_ONLY.test(own) && fg && fg[3] > 0.9 && visible(el) > 0.95 && cs.backgroundClip !== 'text') {
      const cr = contrastRatio(fg, bgOf(el));
      const need = font >= 32 || (font >= 24 && parseInt(cs.fontWeight || '400', 10) >= 700) ? 3 : 4.5;
      if (cr < need) issues.push({kind: '對比不足', detail: `「${b.text}」${cr.toFixed(2)}:1 < ${need}:1（${Math.round(font)}px）`});
    }
    // ⑩ 換行（HTML 字才會自動換行；SVG 白板字一行一句，不會觸發）
    if (!(el instanceof SVGElement)) {
      const lines = lineBoxes(el);
      if (lines.length >= 2) {
        const last = lines[lines.length - 1], widest = Math.max(...lines.map((l) => l.w));
        if (last.chars <= 3 && last.w < widest * 0.3)
          issues.push({kind: '斷行不佳', detail: `「${b.text}」${lines.length} 行，最後一行只剩 ${last.chars} 字`});
        for (let k = 0; k < lines.length - 1; k++) {
          const endOk = /[，、：；。？！…」』）\s—\u200b]/u.test(lines[k].last) || lines[k].zwAfter;
          const latin = /[A-Za-z0-9]/.test(lines[k + 1].first) && /[A-Za-z0-9]/.test(lines[k].last);
          const punctHead = /^[，、：；。？！…・·」』）]/u.test(lines[k + 1].first);
          if (!endOk || latin || punctHead) {
            issues.push({kind: '詞中斷行', detail: `「${b.text}」第 ${k + 1} 行結尾「${lines[k].last}」→ 下一行「${lines[k + 1].first}」`});
            break;
          }
        }
        if (font >= 56 && lines.length > 2) issues.push({kind: '標題過長', detail: `「${b.text}」${Math.round(font)}px 標題排成 ${lines.length} 行`});
      }
    }
  }
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const a = leaves[i], c = leaves[j];
    if (a.el.contains(c.el) || c.el.contains(a.el)) continue;   // 同一段文字裡的標亮片段，不算重疊
    const ix = Math.max(0, Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x));
    const iy = Math.max(0, Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y));
    const inter = ix * iy, small = Math.min(a.w * a.h, c.w * c.h);
    const contains = (p: Box, q: Box) => q.x >= p.x - 1 && q.y >= p.y - 1 && q.x + q.w <= p.x + p.w + 1 && q.y + q.h <= p.y + p.h + 1;
    if (small > 0 && inter / small > 0.18 && !contains(a, c) && !contains(c, a))
      issues.push({kind: '文字重疊', detail: `「${a.text}」×「${c.text}」 ${Math.round((inter / small) * 100)}%`});
  }
  // ⑩ 間距過小、圖塊重疊、版面偏移：範本E 卡片式排版的規則，只有根元素標 data-qa-strict 的範本才量
  //   （2026-10-08 實測：範本A 像素遊戲風的方塊拼圖、HUD 標籤貼標題、範本H 視窗互疊都是設計，套用會出現上百處誤報）
  const strict = !!document.querySelector('[data-qa-strict]');
  const blockEl = (e: Element) => { let q: Element | null = e; while (q && getComputedStyle(q).display.startsWith('inline')) q = q.parentElement; return q; };
  if (strict) for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const a = leaves[i], c = leaves[j];
    if (a.el.contains(c.el) || c.el.contains(a.el) || blockEl(a.el) === blockEl(c.el)) continue;
    if (a.el.closest('[data-qa="chrome"]') || c.el.closest('[data-qa="chrome"]')) continue;
    if (a.el.parentElement === c.el.parentElement && a.el.tagName === 'SPAN' && c.el.tagName === 'SPAN') continue;
    const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
    if (ox > 0 && oy > 0) continue;                              // 已經重疊，交給「文字重疊」
    const gapY = Math.max(a.y, c.y) - Math.min(a.y + a.h, c.y + c.h), gapX = Math.max(a.x, c.x) - Math.min(a.x + a.w, c.x + c.w);
    // SVG 字（白板）同一列左右相鄰＝同一個詞（為了畫上橫線，A'B'C'D 拆成一字一段），只看上下行的距離（2026-10-08 範本D 111 處誤報）
    // SVG 字（白板）不量：位置是座標精確排的；左右相鄰是同一個詞拆開（畫上橫線用），上下緊貼是同一段的分行；真的撞到由「文字重疊」抓（2026-10-08）
    if (a.el instanceof SVGElement && c.el instanceof SVGElement) continue;
    const gap = ox > Math.min(a.w, c.w) * 0.3 ? gapY : oy > Math.min(a.h, c.h) * 0.3 ? gapX : 999;
    if (gap >= 0 && gap < 12) issues.push({kind: '間距過小', detail: `「${a.text}」／「${c.text}」${Math.round(gap)}px < 12px`});
  }
  // SVG 分行（白板 wrap 依字數硬切）的詞中斷行：用位置猜「同一段」不可靠（清單會誤判、置中分行會漏），2026-10-08 試過三版後移除；
  //   根源是 tpl/common.ts 的 wrap() 會切斷「L形」這類英數接中文的詞——待使用者決定是否修 wrap
  // ⑩ 圖塊重疊：卡片、膠囊、圖片彼此不是父子關係卻壓在一起
  const blocks: {el: Element; r: DOMRect}[] = [];
  if (strict) for (const el of all) {
    if (el.closest('[data-qa="caption"]') || el.closest('[data-qa="ignore"]') || visible(el) < 0.35) continue;
    const r = blockOf(el, W, H);
    if (r) blocks.push({el, r});
  }
  for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
    const a = blocks[i], c = blocks[j];
    if (a.el.contains(c.el) || c.el.contains(a.el)) continue;
    const ix = Math.min(a.r.right, c.r.right) - Math.max(a.r.left, c.r.left), iy = Math.min(a.r.bottom, c.r.bottom) - Math.max(a.r.top, c.r.top);
    if (ix > 4 && iy > 4) issues.push({kind: '圖塊重疊', detail: `${(a.el.textContent ?? a.el.tagName).trim().slice(0, 12)} × ${(c.el.textContent ?? c.el.tagName).trim().slice(0, 12)} ${Math.round(ix)}×${Math.round(iy)}px`});
  }
  // ⑩ 版面偏移：只有宣告「置中排版」的範本（根元素 data-qa-centered）才量——範本D 卡諾圖刻意靠左、右邊寫結果
  if (strict && document.querySelector('[data-qa-centered]') && leaves.length) {
    const l = Math.min(...leaves.map((b) => b.x)), rr = Math.max(...leaves.map((b) => b.x + b.w));
    const off = (l + rr) / 2 - W / 2;
    if (Math.abs(off) > 60) issues.push({kind: '版面偏移', detail: `內容中心偏 ${Math.round(off)}px`});
  }
  if (cap) for (const b of leaves) {
    const hx = Math.min(b.x + b.w, cap.right) - Math.max(b.x, cap.left);
    if (hx > 20 && b.y + b.h > cap.top + 4 && b.y < cap.bottom) issues.push({kind: '闖進字幕區', detail: `「${b.text}」`});
  }
  // ⑤ 文字超出所屬圖形（2026-10-05：「小測驗」字壓到吊牌框，原本的量測只看文字對文字，看不到 SVG 圖形）
  //    容器圖形標 data-qa-box="id"、放在裡面的字標 data-qa-in="id"
  for (const el of Array.from(document.querySelectorAll('[data-qa-in]'))) {
    if (visible(el) < 0.35) continue;
    const box = document.querySelector(`[data-qa-box="${el.getAttribute('data-qa-in')}"]`);
    if (!box || visible(box) < 0.35) continue;
    const r = el.getBoundingClientRect(), bb = box.getBoundingClientRect();
    if (r.width < 2 || bb.width < 2 || r.right < 0 || r.left > W) continue;
    const isText = !!(el.textContent ?? '').trim();
    const label = isText ? (el.textContent ?? '').trim().slice(0, 24) : '圖示';
    const kind = isText ? '文字超出圖形' : '圖示超出圖形';
    const out = Math.max(bb.left - r.left, r.right - bb.right, bb.top - r.top, r.bottom - bb.bottom);
    if (out > 2) { issues.push({kind, detail: `「${label}」超出所屬框 ${Math.round(out)}px`}); continue; }
    // 框線（含圓孔、尖角）穿過文字：沿每條描邊取樣，點落在文字範圍內就算（只看外框範圍抓不到，2026-10-05 負面測試）
    let hits = 0;
    for (const path of Array.from(box.querySelectorAll('path')) as SVGPathElement[]) {
      const st = getComputedStyle(path).stroke;
      if (!st || st === 'none') continue;
      const m = path.getScreenCTM(); if (!m) continue;
      const len = path.getTotalLength(), n = Math.min(400, Math.max(40, Math.round(len / 3)));
      for (let i = 0; i <= n; i++) {
        const q = path.getPointAtLength((len * i) / n), x = m.a * q.x + m.c * q.y + m.e, y = m.b * q.x + m.d * q.y + m.f;
        if (x > r.left + 2 && x < r.right - 2 && y > r.top + r.height * 0.15 && y < r.bottom - r.height * 0.15) hits++;
      }
    }
    if (hits) issues.push({kind, detail: `「${label}」壓到所屬框的框線（${hits} 點）`});
  }
  // ⑥ LOGO 保留區：任何文字或容器圖形碰到 LOGO
  const logo = document.querySelector('[data-qa="logo"]');
  if (logo && visible(logo) >= 0.35) {
    const L = logo.getBoundingClientRect();
    const hit = (x: number, y: number, w: number, h: number) =>
      Math.min(x + w, L.right) - Math.max(x, L.left) > 2 && Math.min(y + h, L.bottom) - Math.max(y, L.top) > 2;
    for (const b of leaves) if (hit(b.x, b.y, b.w, b.h)) issues.push({kind: '壓到 LOGO', detail: `「${b.text}」`});
    for (const el of Array.from(document.querySelectorAll('[data-qa-box]')))
      if (visible(el) >= 0.35) { const r = el.getBoundingClientRect(); if (hit(r.left, r.top, r.width, r.height)) issues.push({kind: '壓到 LOGO', detail: `圖形 ${el.getAttribute('data-qa-box')}`}); }
  }
  return {texts: leaves.length, issues, colors};
};

export const QaProbe: React.FC<{w: number; h: number}> = ({w, h}) => {
  const f = useCurrentFrame();
  const [handle] = useState(() => delayRender('qa-measure'));
  useLayoutEffect(() => {
    let done = false;
    const go = () => {
      if (done) return; done = true;
      const r = measure(w, h);
      console.log('QA:' + JSON.stringify({frame: f, ...r}));
      continueRender(handle);
    };
    (document as Document & {fonts: FontFaceSet}).fonts.ready.then(() => setTimeout(go, 60));
    const t = setTimeout(go, 2500);   // 字型一直沒載完也照樣量測，避免卡死
    return () => clearTimeout(t);
  }, [f, handle, w, h]);
  return null;
};
