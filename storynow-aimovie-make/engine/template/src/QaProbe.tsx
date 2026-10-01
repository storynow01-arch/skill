/* 品檢探針：只在 inputProps.qa=true 時掛上。字型載完後量測畫面上所有文字，輸出 QA:{json} 到瀏覽器 console，
   由 scripts/qa_layout.mjs 收集。檢查：①超出畫面 ②文字互相重疊 ③內容闖進字幕區 ④元素內容溢出。 */
import React, {useLayoutEffect, useState} from 'react';
import {continueRender, delayRender, useCurrentFrame} from 'remotion';

type Box = {text: string; x: number; y: number; w: number; h: number};

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
    const b = {text: own.slice(0, 24), x: r.left, y: r.top, w: r.width, h: r.height};
    leaves.push(b);
    if (r.left < -4 || r.top < -4 || r.right > W + 4 || r.bottom > H + 4) issues.push({kind: '超出畫面', detail: `「${b.text}」(${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)})`});
    const he = el as HTMLElement;
    if (he.scrollWidth && he.clientWidth && he.scrollWidth > he.clientWidth + 6 && getComputedStyle(he).overflow !== 'visible')
      issues.push({kind: '內容溢出', detail: `「${b.text}」 scroll ${he.scrollWidth} > ${he.clientWidth}`});
  }
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const a = leaves[i], c = leaves[j];
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
  return {texts: leaves.length, issues};
};

export const QaProbe: React.FC<{w: number; h: number}> = ({w, h}) => {
  const f = useCurrentFrame();
  const [handle] = useState(() => delayRender('qa-measure'));
  useLayoutEffect(() => {
    (document as Document & {fonts: FontFaceSet}).fonts.ready.then(() => setTimeout(() => {
      const r = measure(w, h);
      console.log('QA:' + JSON.stringify({frame: f, ...r}));
      continueRender(handle);
    }, 60));
  }, [f, handle, w, h]);
  return null;
};
