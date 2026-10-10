/* 收尾：電路板上的走線把名稱（end.name）排成方塊點陣（每個像素是一塊銅墊，電子經過就點亮），再印出標語與網址。
   原作 02_試做/廣告30風格 src/ads/ad17/Finale.tsx 讀寫死的 glyphs.json（4 個字）；這裡點陣由 timeline.py 依名稱即時產生（2～8 字）。 */
import React from 'react';
import {EIO, k} from './kit';
import {along, BUS_L, BUS_R, BUS_Y, CELL, GL, J, M, NAME_BOT, NAME_TOP, PE, ROUTE_FINAL, T} from './core';
import {PIX, SILK} from './fonts';

const N = T.d.name.grid;
const SL = T.d.slogan;

/** 階梯式掃出（像素印表機，一次跳一格，不是平滑） */
const stepWipe = (p: number, steps = 10) => Math.floor(p * steps) / steps;

const glowT = (txt: string, size: number, family: string, color: string, glow: string) => (
  <div style={{position: 'relative', fontFamily: family, fontSize: size, lineHeight: 1, whiteSpace: 'nowrap'}}>
    <div style={{position: 'absolute', inset: 0, color: glow, filter: 'blur(12px)', opacity: 0.9}}>{txt}</div>
    <div style={{position: 'relative', color}}>{txt}</div>
  </div>
);

export const Finale: React.FC<{f: number}> = ({f}) => {
  if (f < PE - 30) return null;
  const show = k(f, PE - 20, PE + 20, EIO);
  const litPath: string[] = [];
  const dimPath: string[] = [];
  const pad = Math.max(1, CELL * 0.13);
  GL.forEach((g, ci) => {
    const x0 = g.x - (g.cols * CELL) / 2;
    g.rows.forEach((row, r) => {
      const on = f >= J.nameCh[ci] + (N - 1 - r) * 0.55;
      for (let c = 0; c < row.length; c++) {
        if (row[c] !== '1') continue;
        const x = x0 + c * CELL, y = NAME_TOP + r * CELL;
        (on ? litPath : dimPath).push(`M${(x + pad).toFixed(1)},${(y + pad).toFixed(1)}h${(CELL - 2 * pad).toFixed(1)}v${(CELL - 2 * pad).toFixed(1)}h${(-(CELL - 2 * pad)).toFixed(1)}z`);
      }
    });
  });
  // 電子已走過的走線
  const pts: string[] = [];
  for (const w of ROUTE_FINAL) if (w[0] <= f) pts.push(`${w[1]},${w[2]}`);
  const cur = along(ROUTE_FINAL, f);
  if (f > ROUTE_FINAL[0][0]) pts.push(`${cur[0]},${cur[1]}`);
  const slL = stepWipe(k(f, M.slogan, M.slogan + 12));
  const slR = stepWipe(k(f, M.slogan + 7, M.slogan + 19));
  const web = stepWipe(k(f, M.web, M.web + 14), 14);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: show}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <filter id="f17glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={Math.max(5, CELL * 0.6)} />
          </filter>
        </defs>
        <rect x={170} y={140} width={1580} height={520} rx={18} fill="#0e3322" opacity={0.62} />
        <rect x={170} y={140} width={1580} height={520} rx={18} fill="none" stroke="#f1f5ee" strokeOpacity={0.55} strokeWidth={3} strokeDasharray="20 12" />
        {/* 靜態銅走線：從下方進來接到匯流排，每個字一根往上接到字底 */}
        <path
          d={`M830,905L830,880L700,880L700,${BUS_Y}M${BUS_L},${BUS_Y}L${BUS_R},${BUS_Y}M1220,905L1220,${BUS_Y}${GL.map((g) => `M${g.x},${BUS_Y}L${g.x},${NAME_BOT}`).join('')}`}
          stroke="#d9a24a"
          strokeWidth={8}
          fill="none"
        />
        {pts.length > 1 && <polyline points={pts.join(' ')} stroke="#7ff6ff" strokeWidth={6} fill="none" strokeLinejoin="round" />}
        <path d={dimPath.join('')} fill="#7a5a26" stroke="#d9a24a" strokeWidth={1.5} />
        <path d={litPath.join('')} fill="#ffc860" filter="url(#f17glow)" opacity={0.95} />
        <path d={litPath.join('')} fill="#fff4cf" />
      </svg>
      {SL.length === 2 ? (
        <>
          <div style={{position: 'absolute', top: 562, left: 0, width: 960, display: 'flex', justifyContent: 'center', clipPath: `inset(0 ${(1 - slL) * 100}% 0 0)`}}>
            {glowT(SL[0], T.d.sloganSize, PIX, '#ffffff', '#7ff6ff')}
          </div>
          <div style={{position: 'absolute', top: 562, left: 960, width: 960, display: 'flex', justifyContent: 'center', clipPath: `inset(0 ${(1 - slR) * 100}% 0 0)`}}>
            {glowT(SL[1], T.d.sloganSize, PIX, '#ffffff', '#ffc860')}
          </div>
        </>
      ) : SL.length === 1 ? (
        <div style={{position: 'absolute', top: 562, left: 0, width: 1920, display: 'flex', justifyContent: 'center', clipPath: `inset(0 ${(1 - stepWipe(k(f, M.slogan, M.slogan + 19), 14)) * 100}% 0 0)`}}>
          {glowT(SL[0], T.d.sloganSize, PIX, '#ffffff', '#7ff6ff')}
        </div>
      ) : null}
      {T.d.url && (
        <div style={{position: 'absolute', top: 58, left: 0, width: 1920, display: 'flex', justifyContent: 'center', clipPath: `inset(0 ${(1 - web) * 100}% 0 0)`}}>
          <div style={{background: 'rgba(10,40,28,0.7)', padding: '10px 26px', borderRadius: 8}}>{glowT(T.d.url, T.d.urlSize, SILK, '#eafff7', '#7ff6ff')}</div>
        </div>
      )}
    </div>
  );
};
