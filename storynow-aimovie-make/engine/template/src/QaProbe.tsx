/* 品檢探針：只在 inputProps.qa=true 時掛上。字型載完後量測畫面上所有文字，輸出 QA:{json} 到瀏覽器 console，
   由 scripts/qa_layout.mjs 收集。檢查：①超出畫面 ②文字互相重疊 ③內容闖進字幕區 ④元素內容溢出
   ⑤物件標點（畫面文字不放「，；—」、不以「。」結尾）⑥文字貼邊（壓到圓角框／膠囊的弧線）——⑤⑥ 2026-10-05 從範本E 移植。 */
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

const measure = (W: number, H: number) => {
  const issues: {kind: string; detail: string}[] = [];
  const leaves: Box[] = [];
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
    const label = (el.textContent ?? '').trim().slice(0, 24);
    const out = Math.max(bb.left - r.left, r.right - bb.right, bb.top - r.top, r.bottom - bb.bottom);
    if (out > 2) { issues.push({kind: '文字超出圖形', detail: `「${label}」超出所屬框 ${Math.round(out)}px`}); continue; }
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
    if (hits) issues.push({kind: '文字超出圖形', detail: `「${label}」壓到所屬框的框線（${hits} 點）`});
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
  return {texts: leaves.length, issues};
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
