/* 廣R 章型（二）：cat 數字查詢／status systemctl 狀態／end sudo join → ACCESS GRANTED／logo 視窗內容（原作第 5～8 章）。
   每章的字、每一行在第幾拍出現，全部讀 timeline.json 的章資料 c；b(n)＝章內第 n 拍的格數。 */
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {B, Chap, EO, LAB, LIN, Roller, b, clamp, k, pulse, rnd01, sp} from './kit';
import {Ascii, Bar, Box, C, Cmd, Cursor, D, KAI, KaiScan, LH, MONO, Stack, abs, base, slideIn, typed} from './ui';

type P = {t: number; c: Chap};

/* ───── cat：cat 檔案 → 1～2 個大數字框滾動停住 → 0～3 列小數字／百分比條 ───── */
type BoxD = {n: string; unit: string; size: number; label: string; pre: string; preSize: number; note: string; noteSize: number; at: number; lock: number[]; laps: number; w: number; x: number};
type RowD = {label: string; labelSize: number; n: string; unit: string; pct: number; note: string; noteSize: number; at: number; lock: number[]};
export const ChCat: React.FC<P> = ({t, c}) => {
  const boxes = c.boxes as BoxD[];
  const rows = c.rows as RowD[];
  const COL = [C.a, C.c];
  return (
    <div style={base}>
      <Cmd t={t} s={c.cmd} t0={b(0.05)} enter={b(c.E)} style={{...abs, left: 44, top: 24}} />
      {boxes.map((x, j) => {
        if (t < b(x.at)) return null;
        const p = k(t, b(x.at), b(x.at + 1), EO);
        const col = COL[j % 2];
        return (
          <Box key={j} x={x.x} y={110} w={x.w} h={380} label={x.label} color={col} style={{opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}>
            {x.pre && <div style={{...abs, left: 36, top: 34, fontFamily: KAI, fontSize: x.preSize, color: C.w, whiteSpace: 'nowrap'}}>{x.pre}</div>}
            <div style={{...abs, left: 30, top: 92 + (230 - x.size) / 2, height: x.size, display: 'flex', alignItems: 'flex-end', whiteSpace: 'nowrap'}}>
              <span style={{fontFamily: MONO, fontWeight: 700, fontSize: x.size, lineHeight: 1, color: col, textShadow: `0 0 30px ${col}55`}}>
                <Roller value={x.n} t={t} start={b(x.at)} lock={x.lock.map(b)} laps={x.laps} />
              </span>
              {x.unit && <span style={{fontFamily: KAI, fontWeight: 700, fontSize: x.size * 0.46, color: C.w, marginLeft: x.size * 0.08, marginBottom: x.size * 0.04}}>{x.unit}</span>}
            </div>
            {x.note && <div style={{...abs, left: 36, top: 330, fontSize: x.noteSize, color: C.dim, whiteSpace: 'nowrap', fontFamily: MONO}}>{x.note}</div>}
          </Box>
        );
      })}
      {rows.map((r, i) =>
        t >= b(r.at) ? (
          <div key={i} style={{...abs, left: 44, top: 530 + i * 64, height: 60, lineHeight: '60px', whiteSpace: 'nowrap', ...slideIn(t, b(r.at))}}>
            <span style={{display: 'inline-block', width: 660, fontFamily: KAI, fontSize: r.labelSize, color: C.w}}>{r.label}</span>
            {r.pct >= 0 ? (
              <>
                <Bar p={r.pct * k(t, b(r.at), b(r.at + 1.5), EO)} n={30} color={i % 2 ? C.c : C.g} cw={22} />
                <span style={{color: i % 2 ? C.c : C.g, fontWeight: 700, marginLeft: 16}}>
                  <Roller value={r.n} t={t} start={b(r.at)} lock={r.lock.map(b)} />%
                </span>
              </>
            ) : r.n ? (
              <span style={{color: C.a, fontWeight: 700, fontSize: 40}}>
                <Roller value={r.n} t={t} start={b(r.at)} lock={r.lock.map(b)} />
                {r.unit && <span style={{fontFamily: KAI, marginLeft: 10}}>{r.unit}</span>}
              </span>
            ) : null}
            {r.note && <span style={{color: C.dim, fontSize: r.noteSize, fontFamily: KAI}}>　{r.note}</span>}
          </div>
        ) : null,
      )}
    </div>
  );
};

/* ───── status：systemctl status → 服務一個個亮起＋右側監控面板＋ping ───── */
type SvcD = {name: string; desc: string; hs: number; state: string; stateSize: number; note: string; noteSize: number; at: number; h: number};
const Spark: React.FC<{w: number; h: number; seed: string; color: string}> = ({w, h, seed, color}) => {
  const f = useCurrentFrame();
  const step = 24;
  const shift = (f * 1.6) % step;
  const i0 = Math.floor((f * 1.6) / step);
  const n = Math.ceil(w / step) + 2;
  const pts = Array.from({length: n}, (_, j) => {
    const v = 0.25 + 0.6 * rnd01(`${seed}${i0 + j}`);
    return `${(j * step - shift).toFixed(1)},${(h - v * h).toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{display: 'block'}}>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke="#2a4537" strokeWidth={1} />)}
      <polyline points={`${pts} ${w + step},${h} -${step},${h}`} fill="rgba(61,255,138,0.12)" stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={3} />
    </svg>
  );
};
export const ChStatus: React.FC<P> = ({t, c}) => {
  const L = 46;
  const items = c.items as SvcD[];
  const mon = c.monitor as string[];
  const mo = k(t, b(c.E), b(c.E + 0.6), EO);
  const ping = (c.pings as number[]).map((at, i) => ({
    at: b(at),
    h: 44,
    el: (
      <span style={{fontSize: 28}}>
        <span style={{color: C.dim}}>{LAB.reply} </span>{c.replyTo}: seq={i + 1} <span style={{color: C.g}}>ok</span>
      </span>
    ),
  }));
  const mh = mon.length * 48;
  return (
    <div style={base}>
      <Cmd t={t} s={c.cmd} t0={b(0.1)} enter={b(c.E)} style={{...abs, left: 44, top: 24}} />
      <div style={{...abs, left: 44, top: 100}}>
        {items.map((s, i) => {
          const at = b(s.at);
          if (t < at) return <div key={i} style={{height: s.h}} />;
          const dot = 1 - 0.5 * pulse(t - at, B, 0.5);
          return (
            <div key={i} style={{height: s.h, ...slideIn(t, at, 50), display: 'block'}}>
              <div style={{height: L, lineHeight: `${L}px`, whiteSpace: 'nowrap'}}>
                <span style={{color: C.g, opacity: dot}}>● </span>
                <span style={{fontFamily: KAI, fontWeight: 700, fontSize: 36 * s.hs}}>{s.name}</span>
                {s.desc && (
                  <>
                    <span style={{color: C.dim}}> — </span>
                    <span style={{color: C.a, fontFamily: KAI, fontSize: 32 * s.hs}}>{s.desc}</span>
                  </>
                )}
              </div>
              <div style={{height: L, lineHeight: `${L}px`, paddingLeft: 52, whiteSpace: 'nowrap', fontSize: 30}}>
                Active: <span style={{color: C.g, fontWeight: 700, fontSize: s.stateSize, fontFamily: KAI}}>{s.state}</span>
              </div>
              {s.note && <div style={{height: L, lineHeight: `${L}px`, paddingLeft: 52, whiteSpace: 'nowrap', fontSize: s.noteSize, color: C.dim, fontFamily: KAI}}>{s.note}</div>}
            </div>
          );
        })}
      </div>
      {t >= b(c.E) && (
        <div style={{opacity: mo, transform: `translateX(${(1 - mo) * 60}px)`}}>
          <Box x={1196} y={70} w={632} h={c.ping ? 400 : 730} label={LAB.monitor} color={C.c}>
            {mon.map((n, i) => {
              const pv = Math.min(1, 0.45 + 0.25 * rnd01(`m${i}`) + 0.22 * pulse(t + i * 3, B, 0.6));
              return (
                <div key={i} style={{...abs, left: 26, top: 36 + i * 48, fontSize: 28, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center'}}>
                  <span style={{fontFamily: KAI, color: C.w, display: 'inline-block', width: 150}}>{n}</span>
                  <Bar p={pv} n={18} cw={17} color={i % 2 ? C.c : C.g} />
                </div>
              );
            })}
            <div style={{...abs, left: 26, top: 46 + mh, fontSize: 28, color: C.dim}}>{LAB.load}</div>
            <div style={{...abs, left: 110, top: 44 + mh, width: 490, height: (c.ping ? 340 : 670) - mh, overflow: 'hidden', border: '1px solid #2a4537'}}>
              <Spark w={490} h={(c.ping ? 340 : 670) - mh} seed="ld" color={C.g} />
            </div>
          </Box>
          {c.ping && (
            <Box x={1196} y={500} w={632} h={300} label={LAB.ping} color={C.line}>
              {t >= b(c.E + 0.5) && <Cmd t={t} s={c.pingCmd} t0={b(c.E + 0.5)} enter={b(c.PE)} short style={{...abs, left: 22, top: 26, fontSize: 28}} />}
              <Stack t={t} items={ping} maxH={204} style={{left: 22, top: 80, width: 590}} />
            </Box>
          )}
        </div>
      )}
    </div>
  );
};

/* ───── end（前半）：sudo join → 密碼 ●●● → 驗證 → ACCESS GRANTED ───── */
export const ChEnd: React.FC<P> = ({t, c}) => {
  const dots = (c.dots as number[]).filter((d) => t >= b(d)).length;
  const verify = k(t, b(c.V0), b(c.V1), LIN);
  const G = b(c.G);
  const g = sp(t, G, 13, 200, 0.9);
  const inv = t >= G && t < G + 4; // 一次反白（小面積）
  const checks = c.checks as string[];
  return (
    <div style={base}>
      <Cmd t={t} s={c.cmd} t0={b(0.1)} enter={b(c.E)} style={{...abs, left: 44, top: 24}} />
      {t >= b(c.E) && (
        <div style={{...abs, left: 44, top: 24 + LH, lineHeight: `${LH}px`, whiteSpace: 'nowrap', color: C.w}}>
          <span style={{color: C.a}}>[sudo]</span> {LAB.pwFor} {D.user}:
        </div>
      )}
      {t >= b(c.box) && t < G && (
        <div style={{...abs, left: 360, top: 210, width: 1150, height: 150, border: `3px solid ${t < b(c.V0) ? C.a : C.g}`, background: 'rgba(255,184,77,0.06)'}}>
          <div style={{...abs, left: 30, top: -24, padding: '0 12px', background: C.bg, fontSize: 30, lineHeight: '44px', color: t < b(c.V0) ? C.a : C.g}}>{LAB.password}</div>
          <div style={{...abs, left: 50, top: 0, height: 150, lineHeight: '150px', fontSize: 84, letterSpacing: 26, color: C.w, whiteSpace: 'nowrap'}}>
            {'●'.repeat(dots)}
            {t < b(c.V0) && <Cursor color={C.a} w={0.45} />}
          </div>
        </div>
      )}
      {t >= b(c.V0) && t < G && (
        <div style={{...abs, left: 360, top: 400, whiteSpace: 'nowrap'}}>
          <span style={{color: C.dim, fontFamily: KAI}}>{LAB.verify} </span>
          <Bar p={verify} n={30} cw={22} />
          {checks.map((s, i) =>
            t >= b(c.ck[i]) ? (
              <div key={i} style={{height: 50, lineHeight: '50px', marginTop: i === 0 ? 14 : 0, fontFamily: KAI, ...slideIn(t, b(c.ck[i])), display: 'block'}}>
                <span style={{color: C.g, fontWeight: 700}}>✓ </span>{s}
              </div>
            ) : null,
          )}
        </div>
      )}
      {t >= G && (
        <div style={{...abs, left: 286, top: 170, width: 1300, height: 420, border: `4px solid ${C.g}`, background: inv ? C.g : 'rgba(61,255,138,0.08)',
          transform: `scale(${interpolate(g, [0, 1], [1.25, 1])})`, opacity: Math.min(1, g * 2), boxShadow: '0 0 60px rgba(61,255,138,0.35)'}}>
          <div style={{...abs, left: 0, right: 0, top: 50, textAlign: 'center', fontWeight: 700, fontSize: 140, lineHeight: 1, color: inv ? C.ink : C.g, letterSpacing: 6, whiteSpace: 'nowrap', textShadow: inv ? 'none' : '0 0 30px rgba(61,255,138,0.5)'}}>{LAB.granted}</div>
          <div style={{...abs, left: 0, right: 0, top: 230, textAlign: 'center', fontFamily: KAI, fontWeight: 700, fontSize: c.welcomeSize, color: inv ? C.ink : C.w, whiteSpace: 'nowrap'}}>{c.welcome}</div>
          {c.sub && (
            <div style={{...abs, left: 0, right: 0, top: 330, textAlign: 'center', fontFamily: KAI, fontSize: c.subSize, color: inv ? C.ink : C.a, whiteSpace: 'nowrap', opacity: interpolate(t, [b(c.subAt), b(c.subAt + 0.5)], [0, 1], clamp)}}>
              {c.sub}
            </div>
          )}
        </div>
      )}
      {t >= b(c.rootAt) && (
        <div style={{...abs, left: 44, top: 690, lineHeight: `${LH}px`, color: C.g, whiteSpace: 'nowrap', ...slideIn(t, b(c.rootAt))}}>
          {c.root}<span style={{color: C.w, fontSize: c.rootSize}}>{c.rootTail}</span>
        </div>
      )}
    </div>
  );
};

/* ───── end（後半）：logo 視窗內容（視窗 1240 × 700 的內容區）；t＝縮成視窗那一刻起的格數 ───── */
export const LOGO_IN = {w: 1236, h: 646};
const splitSlogan = (s: string): [string, string] => {
  for (const sep of ['，', '　', '、', '；', '：']) {
    const i = s.indexOf(sep);
    if (i > 0 && i < s.length - 1) return [s.slice(0, i + 1), s.slice(i + 1)];
  }
  return [s, ''];
};
export const Logo: React.FC<{t: number; c: Chap}> = ({t, c}) => {
  const A = c.ascii as {text: string; cols: number; cw: number; ch: number} | null;
  const lg = c.lg as Record<string, number>;
  const topH = A ? 8 * A.ch : c.nameSize * 1.25;
  const slH = c.sloganSize * 1.2;
  const fH = c.full ? c.fullSize * 1.3 + 14 : 0;
  const uH = c.url ? 64 : 0;
  const total = topH + 36 + slH + 16 + fH + uH;
  const y0 = Math.max(20, (LOGO_IN.h - total) / 2);
  const ySl = y0 + topH + 36;
  const yF = ySl + slH + 16;
  const yU = yF + fH;
  const sl = sp(t, b(lg.sl), 14, 180, 0.9);
  const [s1, s2] = splitSlogan(c.slogan);
  const scan = k(t, 4, b(lg.scan1), LIN);
  return (
    <div style={{...base, background: C.bg}}>
      <div style={{...abs, left: 0, width: LOGO_IN.w, top: y0, display: 'flex', justifyContent: 'center'}}>
        {A ? <Ascii word={A.text} cw={A.cw} ch={A.ch} scan={scan} t={t} dots={false} /> : <KaiScan s={c.name} size={c.nameSize} scan={scan} t={t} />}
      </div>
      <div style={{...abs, left: 0, width: LOGO_IN.w, top: ySl, textAlign: 'center', fontFamily: KAI, fontWeight: 700, fontSize: c.sloganSize, lineHeight: `${slH}px`, color: C.w, whiteSpace: 'nowrap',
        opacity: Math.min(1, sl * 1.5), transform: `translateY(${(1 - sl) * 40}px)`, textShadow: '0 0 28px rgba(61,255,138,0.35)'}}>
        <span style={{color: C.g}}>{s1}</span><span style={{color: C.w}}>{s2}</span>
      </div>
      {c.full && (
        <div style={{...abs, left: 0, width: LOGO_IN.w, top: yF, textAlign: 'center', fontFamily: KAI, fontSize: c.fullSize, color: C.dim, whiteSpace: 'nowrap', opacity: interpolate(t, [b(lg.full), b(lg.full + 0.5)], [0, 1], clamp)}}>
          {c.full}
        </div>
      )}
      {c.url && t >= b(lg.open) && (
        <div style={{...abs, left: 0, width: LOGO_IN.w, top: yU, textAlign: 'center', whiteSpace: 'nowrap', fontSize: c.urlSize, lineHeight: '50px'}}>
          <span style={{color: C.g, fontWeight: 700}}>$ </span>
          <span style={{color: C.w}}>{LAB.open} </span>
          <span style={{color: C.c, textDecoration: 'underline', textUnderlineOffset: 6}}>{typed(c.url, t, b(lg.open + 0.3), b(c.u1))}</span>
          <Cursor solid={t < b(c.u1)} />
        </div>
      )}
    </div>
  );
};
