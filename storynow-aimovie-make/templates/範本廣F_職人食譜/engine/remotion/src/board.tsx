/* 黑板：粉筆字一筆一筆寫出（遮罩由左到右擦出）＋粉筆缺口遮罩；板擦由左到右擦掉整頁。
   每一行的字、位置、字級、顏色、哪一頁都來自 timeline.json（timeline.py 依項數與字數排版，少項時整組置中）。
   原作字偏小偏淡：這裡字級加大（項目 44→62、步驟 46→58，見 timeline.py 的 HS／MS／SS／NS），粉筆字用 700 粗細，並在缺口遮罩層底下墊一層半透明實心字，
   粉筆質感保留、但不再被缺口吃掉太多。 */
import React from 'react';
import {C, EIO, J, k, LIN, lerp, Line} from './core';
import {WENKAI} from './fonts';
import {BOARD_DUST, CHALK_MASK} from './textures';

export const LINES = J.lines;
const PAGES = J.pages;
const PAGE_OF = J.pageOf;
const TITLE_TOP = 70; // 標題縮小後的上緣

export const lineBox = (id: string) => ({left: LINES[id].left, w: LINES[id].w});
export const writeP = (f: number, id: string) => {
  const [a, d] = J.w[id];
  return k(f, a, a + d, LIN);
};

/** 打勾的筆跡（0..1 → 相對座標） */
export const tickAt = (p: number): [number, number] =>
  p < 0.35 ? [lerp(0, 14, p / 0.35), lerp(20, 36, p / 0.35)] : [lerp(14, 44, (p - 0.35) / 0.65), lerp(36, -4, (p - 0.35) / 0.65)];

/** 板擦位置（世界座標）；沒在擦時回傳 null */
export const eraserAt = (f: number): {x: number; y: number; p: number} | null => {
  for (const [a, d] of J.erase) {
    if (f >= a && f <= a + d) {
      const p = (f - a) / d;
      return {x: lerp(70, 790, p), y: 520 + 290 * Math.sin(p * Math.PI * 7), p};
    }
  }
  return null;
};

const chalkMask: React.CSSProperties = {
  WebkitMaskImage: `url(${CHALK_MASK})`,
  WebkitMaskSize: '180px 180px',
  maskImage: `url(${CHALK_MASK})`,
  maskSize: '180px 180px',
};

const wipe = (px: number, soft: number) => `linear-gradient(90deg, #000 ${px}px, transparent ${px + soft}px)`;
const unwipe = (px: number) => `linear-gradient(90deg, transparent ${px}px, #000 ${px + 40}px)`;

/** 粉筆字：缺口遮罩層＋底下一層半透明實心字（字比較實、比較亮，仍看得到粉筆顆粒） */
const ChalkText: React.FC<{L: Extract<Line, {kind: 'text'}>}> = ({L}) => {
  const st: React.CSSProperties = {fontFamily: WENKAI, fontWeight: 700, fontSize: L.size, lineHeight: 1.35, color: C[L.color], whiteSpace: 'nowrap'};
  return (
    <div style={{position: 'relative'}}>
      <div style={{...st, position: 'absolute', left: 0, top: 0, opacity: 0.55}}>{L.text}</div>
      <div style={{...st, position: 'relative', ...chalkMask, textShadow: `0 0 ${L.size * 0.08}px rgba(255,255,255,.35)`}}>{L.text}</div>
    </div>
  );
};

const ChalkLine: React.FC<{id: string; f: number; eraseX: number | null}> = ({id, f, eraseX}) => {
  const L = LINES[id];
  const p = writeP(f, id);
  if (p <= 0) return null;
  const {left, w} = lineBox(id);
  let body: React.ReactNode;
  let boxTop = L.y;
  let boxW = w + 40;
  let boxH = 0;
  let mask = 'none';
  if (L.kind === 'tick') {
    boxW = 60;
    boxH = 60;
    boxTop = L.y - 10;
    body = (
      <svg width={60} height={60} viewBox="-6 -10 60 60" style={{display: 'block', overflow: 'visible'}}>
        <path d="M0,20 L14,36 L44,-4" fill="none" stroke={C[L.color]} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      </svg>
    );
  } else {
    const sz = L.size;
    boxH = sz * 1.45;
    const soft = sz * 0.6;
    mask = wipe(p * (w + soft) - soft, soft);
    body = <ChalkText L={L} />;
    if (L.bullet) {
      // 方框或圓圈數字：這行開始寫時先畫好
      const bp = Math.min(1, p * 4);
      const bx = -66;
      const node =
        L.bullet === 'box' ? (
          <svg width={46} height={46} viewBox="0 0 46 46" style={{position: 'absolute', left: bx, top: sz * 0.22, overflow: 'visible', ...chalkMask}}>
            <rect x={3} y={3} width={40} height={40} rx={3} fill="none" stroke={C.chalk} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - bp} />
          </svg>
        ) : (
          <div style={{position: 'absolute', left: bx - 4, top: sz * 0.14, width: 52, height: 52, ...chalkMask}}>
            <svg width={52} height={52} viewBox="0 0 52 52" style={{position: 'absolute', left: 0, top: 0}}>
              <circle cx={26} cy={26} r={22} fill="none" stroke={C.pink} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - bp} transform="rotate(-90 26 26)" />
            </svg>
            <div style={{position: 'absolute', inset: 0, textAlign: 'center', fontFamily: WENKAI, fontWeight: 700, fontSize: 34, lineHeight: '52px', color: C.pink, opacity: bp}}>{L.bullet}</div>
          </div>
        );
      body = (
        <>
          {node}
          <div style={{WebkitMaskImage: mask, maskImage: mask}}>{body}</div>
        </>
      );
      mask = 'none';
    }
  }
  const erased = eraseX !== null ? unwipe(eraseX - left) : 'none';
  return (
    <div style={{position: 'absolute', left, top: boxTop, width: boxW, height: boxH || undefined, WebkitMaskImage: erased, maskImage: erased}}>
      <div style={{WebkitMaskImage: mask, maskImage: mask, ...(L.kind === 'tick' ? chalkMask : {})}}>{body}</div>
    </div>
  );
};

/** 黑板（世界座標 30..790 × 30..1050） */
export const Board: React.FC<{f: number}> = ({f}) => {
  // 第 i 頁從 erase[i-1] 開始出現，到 erase[i] 擦完為止（第 0 頁的標題例外：縮到頂端一直留著）
  const visible: string[] = [];
  PAGES.forEach((ids, i) => {
    const er = J.erase[i];
    const start = i === 0 ? 0 : J.erase[i - 1][0];
    if (f < start) return;
    if (er && f > er[0] + er[1]) return;
    ids.forEach((id) => id !== 'title' && visible.push(id));
  });
  const eraser = eraserAt(f);
  const erasing = J.erase.findIndex(([a, d]) => f >= a && f <= a + d);
  let haze = 0;
  for (const [a, d] of J.erase) {
    if (f >= a) haze = Math.max(haze, Math.min(1, (f - a) / d) * (1 - k(f, a + d, a + d + 70, LIN)));
  }
  const hazeX = eraser ? eraser.x : 790;
  const T0 = LINES.title;
  const tp = k(f, J.erase[0][0], J.erase[0][0] + 26, EIO);
  const tScale = lerp(1, 0.5, tp);
  const tY = lerp(0, TITLE_TOP - T0.y, tp);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 820, height: 1080}}>
      <div style={{position: 'absolute', left: 30, top: 30, width: 760, height: 1020, borderRadius: 10, background: 'linear-gradient(135deg,#9A6B43,#7B5233)', boxShadow: '0 18px 30px rgba(60,40,20,.35)'}} />
      <div style={{position: 'absolute', left: 50, top: 50, width: 720, height: 980, borderRadius: 4, background: `radial-gradient(ellipse at 40% 30%, #3B4D45 0%, ${C.board} 55%, ${C.boardDeep} 100%)`, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, backgroundImage: `url(${BOARD_DUST})`, backgroundSize: '720px 980px', opacity: 0.9}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: hazeX - 50, height: 980, backgroundImage: `url(${BOARD_DUST})`, backgroundSize: '720px 980px', backgroundPosition: '-120px 60px', opacity: haze * 1.6}} />
      </div>
      <div style={{position: 'absolute', left: 50, top: 990, width: 720, height: 26, background: '#6E4A2E', borderRadius: 3}} />
      <div style={{position: 'absolute', left: 520, top: 994, width: 64, height: 14, background: C.chalk, borderRadius: 6}} />
      <div style={{position: 'absolute', left: 600, top: 996, width: 40, height: 12, background: C.pink, borderRadius: 6}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: 820, height: 1080, transform: `translateY(${tY}px) scale(${tScale})`, transformOrigin: `410px ${T0.y}px`}}>
        <ChalkLine id="title" f={f} eraseX={null} />
      </div>
      {visible.map((id) => (
        <ChalkLine key={id} id={id} f={f} eraseX={eraser && PAGE_OF[id] === erasing ? eraser.x : null} />
      ))}
    </div>
  );
};
