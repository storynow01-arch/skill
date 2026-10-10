/* 廣N 章型（一）：open 開場解碼、layers 數字組合逐層解碼、channels 頻道切換。字全部讀 timeline.json 的章資料。 */
import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {GL, MONO, TC, VT} from './fonts';
import {
  B, Bar, CYN, ChP, DIM, Dec, EI, EIO, EO, GRN, HexBG, INK, LAB, MAG, Mosh, RED, RGB, Roller, Slices, Snow, WHT, Win, abs, b, clamp, hit, k, lerp, pulse, sp,
} from './kit';

/* ═══ open：SIGNAL LOST → 縮寫解碼（可省）→ 名稱解碼鎖定＋英文一行＋全名一行 ═══ */
export const ChOpen: React.FC<ChP> = ({t, f, c}) => {
  const A: number = c.A;
  const N0: number = c.N0;
  const nb: number = c.nb;
  const winP = sp(t, 1, 13, 200);
  const winOut = k(t, b(A) - 3, b(A) + 3, EI);
  const winJ = t < b(A) ? 60 * pulse(t, B, 0.22) + 160 * winOut : 0;
  const snowO = interpolate(t, [0, b(A), b(A + 4), b(A + 8)], [0.42, 0.16, 0.1, 0.06], clamp);
  // 縮寫
  const abbr: string = c.abbr;
  const prLocks = (c.locksA as number[]).map((x) => b(x));
  const toTop = k(t, b(N0) - 6, b(N0) + 6, EIO);
  const prS = t < b(N0) ? 6 + 34 * pulse(Math.max(0, t - b(A)), B, 0.3) : 3;
  const prSl = t >= b(A) && t < b(N0) ? 140 * pulse(t - b(A), B, 0.18) : 0;
  // 名稱
  const name: string = c.name;
  const zhLocks = Array.from(name).map((_, i) => b(N0) + i * c.zstep * B);
  const zhS = t >= b(N0) ? 4 + 30 * pulse(t - b(N0), B / 2, 0.35) * (t < b(N0 + 2) ? 1 : 0.3) : 0;
  const zhSl = t >= b(N0) - 2 ? 220 * hit(t - b(N0) + 2, 7) + 90 * hit(t - b(N0 + 4), 4) : 0;
  const push = k(t, b(nb - 4), b(nb), EI);
  const build = k(t, b(nb - 3), b(nb), EI);
  const ns: number = c.nameSize;
  return (
    <AbsoluteFill>
      <HexBG t={t} seed="c1" o={0.07 + 0.05 * build} />
      <Snow f={f} o={snowO} />
      {winOut < 1 && (
        <Slices n={14} amt={winJ} seed={`w${f}`} style={{...abs, left: 0, top: 0, width: 1920, height: 1080}}>
          <div style={{transform: `scale(${lerp(0.7, 1, winP)})`, transformOrigin: '960px 470px', opacity: Math.min(1, winP * 2) * (1 - winOut)}}>
            <Win x={460} y={230} w={1000} tc={RED} title={LAB.lostTitle}>
              <RGB s={8 + 20 * pulse(t, B, 0.25)} style={{fontFamily: GL, fontSize: 150, lineHeight: 1.1, textAlign: 'center', whiteSpace: 'nowrap'}}>{LAB.noSignal}</RGB>
              <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 22, fontFamily: MONO, fontSize: 32, color: GRN}}>
                <span style={{whiteSpace: 'nowrap', width: 250}}>{LAB.decoding}{'.'.repeat(1 + (Math.floor(t / 6) % 3))}</span>
                <Bar p={k(t, 6, b(A) - 4, (x) => x)} w={560} />
              </div>
              <div style={{fontFamily: TC, fontWeight: 700, fontSize: 32, color: DIM, marginTop: 14, whiteSpace: 'nowrap'}}>{LAB.lostMsg}</div>
            </Win>
          </div>
        </Slices>
      )}
      {t >= b(A) - 2 && (
        <AbsoluteFill style={{transform: `scale(${1 + 0.22 * push})`, transformOrigin: '960px 500px'}}>
          {abbr !== '' && (
            <>
              <div style={{...abs, left: 0, right: 0, top: 250, display: 'flex', justifyContent: 'center',
                transform: `translateY(${lerp(0, -150, toTop)}px) scale(${lerp(1, 0.42, toTop)})`, transformOrigin: '960px 0px'}}>
                <Slices n={10} amt={prSl} seed={`p${f}`}>
                  <RGB s={prS} ang={0.2} style={{fontFamily: GL, fontSize: 340, lineHeight: 1, whiteSpace: 'nowrap'}}>
                    <Dec text={abbr} t={t} start={b(A)} pre={2} locks={prLocks} seed="abbr" cell={0.82} col={GRN} />
                  </RGB>
                </Slices>
              </div>
              <div style={{...abs, left: 0, right: 0, top: 170, textAlign: 'center', fontFamily: MONO, fontSize: 32, color: GRN, opacity: 1 - toTop}}>
                <Dec text={`${LAB.source} 0x${c.hex}`} t={t} start={b(A)} step={0.7} pre={2} seed="src" col={MAG} />
              </div>
            </>
          )}
          {t >= b(N0) - 2 && (
            <>
              <div style={{...abs, left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center'}}>
                <Slices n={12} amt={zhSl} seed={`z${f}`}>
                  <RGB s={zhS} style={{fontFamily: TC, fontWeight: 900, fontSize: ns, lineHeight: 1.1, letterSpacing: ns * 0.072, whiteSpace: 'nowrap'}}>
                    <Dec text={name} t={t} start={b(N0)} pre={2} locks={zhLocks} seed="zh" col={GRN} />
                  </RGB>
                </Slices>
              </div>
              {c.en !== '' && (
                <div style={{...abs, left: 0, right: 0, top: 640, textAlign: 'center', fontFamily: MONO, fontWeight: 700, fontSize: c.enSize, letterSpacing: '0.3em', color: CYN, whiteSpace: 'nowrap'}}>
                  <Dec text={c.en} t={t} start={b(N0 + 2)} step={1.1} pre={1} seed="en" col={MAG} />
                </div>
              )}
              <div style={{...abs, left: 0, right: 0, top: 740, display: 'flex', justifyContent: 'center', gap: 28, alignItems: 'center'}}>
                {c.full !== '' && (
                  <div style={{fontFamily: TC, fontWeight: 700, fontSize: c.fullSize, color: WHT, whiteSpace: 'nowrap'}}>
                    <Dec text={c.full} t={t} start={b(N0 + 4)} step={1.4} pre={1} seed="full" />
                  </div>
                )}
                <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 28, color: INK, background: GRN, padding: '4px 14px', whiteSpace: 'nowrap', opacity: k(t, b(N0 + 4), b(N0 + 4) + 3)}}>{LAB.acquired}</div>
              </div>
            </>
          )}
        </AbsoluteFill>
      )}
      <Mosh f={f} n={26} amt={0.12 + 0.3 * pulse(t, B, 0.2) + 0.5 * build} seed="m1" />
    </AbsoluteFill>
  );
};

/* ═══ layers：1～3 個面板逐層解碼（數字＋單位＋名單），最後合成一行 ═══ */
const PC = [GRN, CYN, MAG];
export const ChLayers: React.FC<ChP> = ({t, f, c}) => {
  const fin: number = c.fin;
  const P = c.panels as {n: string; unit: string; scale: number; names: string[]; namesSize: number; at: number}[];
  const pw: number = c.pw;
  const x0 = (1920 - (P.length * pw + (P.length - 1) * 60)) / 2;
  const out = k(t, b(fin) - 3, b(fin) + 3, EI);
  const isFin = t >= b(fin) - 1;
  const fs: number = c.finScale;
  return (
    <AbsoluteFill>
      <HexBG t={t} seed="c2" o={0.07} color={CYN} />
      {out < 1 && (
        <Slices n={18} amt={260 * out + 30 * pulse(t, B, 0.15)} seed={`pp${f}`} style={{...abs, inset: 0, opacity: 1 - out * 0.8}}>
          <AbsoluteFill>
            {P.map((p, j) => {
              const s = b(p.at);
              if (t < s - 1) return null;
              const u = t - s;
              const frame = k(u, 0, 7, EO);
              const ok = u >= B;
              const col = PC[j % 3];
              const sc = p.scale;
              return (
                <div key={j} style={{...abs, left: x0 + j * (pw + 60), top: 140, width: pw, height: 690}}>
                  <div style={{...abs, inset: 0, border: `3px solid ${col}`, background: 'rgba(39,43,60,0.85)', transform: `scaleY(${frame})`, transformOrigin: 'top'}} />
                  {frame > 0.6 && (
                    <>
                      <div style={{...abs, left: 0, right: 0, top: 0, height: 56, background: col, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 18px', fontFamily: MONO, fontWeight: 700, fontSize: 28, color: INK, whiteSpace: 'nowrap'}}>
                        <span>{LAB.layer} 0{j + 1}/0{P.length}</span>
                        <span>{ok ? LAB.ok : LAB.decoding}</span>
                      </div>
                      <div style={{...abs, left: 30, top: 80, display: 'flex', alignItems: 'flex-end', gap: 16, whiteSpace: 'nowrap'}}>
                        <RGB s={4 + 26 * hit(u - B, 6) + 14 * hit(u, 5)} color={col} style={{fontFamily: MONO, fontWeight: 700, fontSize: 240 * sc, lineHeight: 1}}>
                          <Roller value={p.n} t={u} start={0} lock={[B]} laps={2} />
                        </RGB>
                        {p.unit !== '' && (
                          <RGB s={3 + 20 * hit(u - B * 0.75, 5)} style={{fontFamily: TC, fontWeight: 900, fontSize: 120 * sc, lineHeight: 1.15, paddingBottom: 18 * sc}}>
                            <Dec text={p.unit} t={u} start={2} locks={[B * 0.75, B]} pre={2} seed={`u${j}`} col={col} />
                          </RGB>
                        )}
                      </div>
                      <div style={{...abs, left: 34, top: 120 + 240 * sc, fontFamily: TC, fontWeight: 700, fontSize: p.namesSize, lineHeight: 1.45, color: WHT}}>
                        {p.names.map((nm, q) => {
                          const st = B + q * B * 0.4;
                          return (
                            <div key={q} style={{whiteSpace: 'nowrap', opacity: u >= st - 2 ? 1 : 0}}>
                              <span style={{fontFamily: MONO, color: col}}>{'>'} </span>
                              <Dec text={nm} t={u} start={st} step={1.6} pre={2} seed={`n${j}${q}`} col={col} />
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </AbsoluteFill>
        </Slices>
      )}
      {isFin && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
          <Slices n={14} amt={200 * hit(t - b(fin), 6) + 80 * hit(t - b(fin + 2), 4)} seed={`fn${f}`}>
            <RGB s={4 + 36 * hit(t - b(fin), 10) + 16 * hit(t - b(fin + 2), 6)} style={{display: 'flex', alignItems: 'baseline', gap: 26 * fs, lineHeight: 1.15, whiteSpace: 'nowrap'}}>
              {P.map((p, j) => (
                <React.Fragment key={j}>
                  <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 220 * fs, color: PC[j % 3]}}>{p.n}</span>
                  <span style={{fontFamily: TC, fontWeight: 900, fontSize: 160 * fs, marginRight: j < P.length - 1 ? 30 * fs : 0}}>{p.unit}</span>
                </React.Fragment>
              ))}
            </RGB>
          </Slices>
          {c.sub !== '' && (
            <div style={{fontFamily: MONO, fontWeight: 700, fontSize: c.subSize, letterSpacing: '0.12em', color: CYN, marginTop: 30, whiteSpace: 'nowrap'}}>
              <Dec text={c.sub} t={t} start={b(fin) + 4} step={0.6} pre={2} seed="sub" col={MAG} />
            </div>
          )}
        </AbsoluteFill>
      )}
      <Mosh f={f} n={22} amt={0.1 + 0.35 * pulse(t, B * 4, 0.12) + 0.4 * k(t, b(c.nb - 1), b(c.nb), EI)} seed="m2" />
    </AbsoluteFill>
  );
};

/* ═══ channels：每個項目像頻道一樣切過去（CH01…） ═══ */
const ACC = [GRN, MAG, CYN];
type ChItem = {tag: string; tagSize: number; name: string; nameSize: number; en: string; enSize: number; line: string; lineSize: number; hook: string; hookSize: number; at: number; slot: number};
export const ChChannels: React.FC<ChP> = ({t, f, c}) => {
  const IT = c.items as ChItem[];
  let j = 0;
  while (j + 1 < IT.length && t >= b(IT[j + 1].at)) j++;
  const P = IT[j];
  const s = b(P.at);
  const u = t - s;
  const col = ACC[j % 3];
  const snowO = u < 6 ? lerp(0.75, 0.1, u / 6) : 0.1;
  const roll = u < 7 ? (1 - k(u, 0, 7, EO)) * -380 : 0;
  const sl = u < 6 ? 280 * (1 - u / 6) : 26 * hit(u - Math.round(B), 3);
  return (
    <AbsoluteFill>
      {/* 頻道底：彩條測試圖淡淡墊底 */}
      <AbsoluteFill style={{display: 'flex', flexDirection: 'row', opacity: 0.06}}>
        {[WHT, '#ffe14d', CYN, GRN, MAG, RED, '#3a5bff'].map((cc, i) => <div key={i} style={{flex: 1, background: cc}} />)}
      </AbsoluteFill>
      <Slices n={16} amt={sl} seed={`ch${f}`} style={{...abs, inset: 0}}>
        <AbsoluteFill style={{transform: `translateY(${roll}px)`}}>
          <div style={{...abs, left: 160, top: 250}}>
            {P.tag !== '' && <div style={{display: 'inline-block', fontFamily: TC, fontWeight: 900, fontSize: P.tagSize, color: INK, background: col, padding: '2px 22px', whiteSpace: 'nowrap'}}>{P.tag}</div>}
            <RGB s={3 + 22 * hit(u - 4, 8)} style={{fontFamily: TC, fontWeight: 900, fontSize: P.nameSize, lineHeight: 1.2, marginTop: 12, whiteSpace: 'nowrap'}}>
              <Dec text={P.name} t={u} start={3} step={1.2} pre={3} seed={`pg${j}`} col={col} />
            </RGB>
            {P.en !== '' && (
              <div style={{fontFamily: MONO, fontWeight: 700, fontSize: P.enSize, letterSpacing: '0.2em', color: col, marginTop: 6, whiteSpace: 'nowrap'}}>
                <Dec text={P.en} t={u} start={6} step={0.5} pre={2} seed={`pe${j}`} col={WHT} />
              </div>
            )}
            {P.line !== '' && <div style={{fontFamily: TC, fontWeight: 700, fontSize: P.lineSize, color: WHT, marginTop: 22, opacity: k(u, 8, 12), whiteSpace: 'nowrap'}}>{P.line}</div>}
            {P.hook !== '' && (
              <div style={{display: 'inline-block', marginTop: 20, fontFamily: TC, fontWeight: 700, fontSize: P.hookSize, color: col, border: `2px solid ${col}`, padding: '4px 20px', opacity: k(u, 11, 14), whiteSpace: 'nowrap'}}>
                <span style={{fontFamily: MONO}}>{'>> '}</span>{P.hook}
              </div>
            )}
          </div>
        </AbsoluteFill>
      </Slices>
      {/* 螢幕 OSD：頻道號 */}
      <div style={{...abs, right: 110, top: 70, textAlign: 'right', fontFamily: VT, fontSize: 150, lineHeight: 1, color: GRN, textShadow: `0 0 18px ${GRN}88, 5px 0 0 ${MAG}aa, -5px 0 0 ${CYN}aa`}}>
        CH{String(j + 1).padStart(2, '0')}
      </div>
      <div style={{...abs, right: 110, top: 230, display: 'flex', gap: 8}}>
        {IT.map((_, q) => <div key={q} style={{width: 26, height: 34, background: q <= j ? GRN : 'rgba(255,255,255,0.12)'}} />)}
      </div>
      <div style={{...abs, right: 110, top: 290, fontFamily: VT, fontSize: 48, color: WHT, opacity: 0.85}}>{u < 8 ? LAB.tuning : LAB.play}</div>
      <Snow f={f} o={snowO} />
      {u < 6 && <div style={{...abs, left: 0, right: 0, top: (u * 170) % 820, height: 90, background: 'rgba(255,255,255,0.10)'}} />}
      <Mosh f={f} n={14} amt={u < 5 ? 0.6 : 0.08} seed="m3" />
    </AbsoluteFill>
  );
};
