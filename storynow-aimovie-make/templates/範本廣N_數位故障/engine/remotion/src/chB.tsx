/* 廣N 章型（二）：errors 錯誤視窗彈出又修復、numbers 數字亂碼滾動鎖定、status 系統狀態列、logo 全畫面故障收斂。字全部讀 timeline.json 的章資料。 */
import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {MONO, TC} from './fonts';
import {
  B, Bar, CYN, ChP, DIM, Dec, EI, EO, GRN, HexBG, INK, LAB, MAG, Mosh, RED, RGB, Roller, Slices, Snow, WHT, Win, abs, b, clamp, hit, k, lerp, pulse, sp,
} from './kit';

/* ═══ errors：亮點以錯誤視窗彈出、亂碼，在拍上修復鎖定；左邊修復紀錄一條一條 [OK] ═══ */
type ErrItem = {lines: string[]; size: number; short: string; shortSize: number; file: string; at: number; dur: number};
export const ChErrors: React.FC<ChP> = ({t, f, c}) => {
  const HL = c.items as ErrItem[];
  let j = 0;
  while (j + 1 < HL.length && t >= b(HL[j + 1].at)) j++;
  const it = HL[j];
  const s = b(it.at);
  const u = t - s;
  const fixed = u >= B;
  const pop = sp(u, 0, 11, 260);
  const tc = fixed ? GRN : j % 2 ? MAG : RED;
  const corrupt = fixed ? 0 : 1;
  const sl = corrupt * (90 + 140 * pulse(u, 4, 0.5)) + 160 * hit(u - B, 5);
  const ox = [0, -30, 20, -10][j % 4];
  const oy = [0, 24, -18, 30][j % 4];
  return (
    <AbsoluteFill>
      {/* 桌面格線 */}
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.045) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.045) 2px, transparent 2px)', backgroundSize: '80px 80px'}} />
      {/* 左側修復紀錄 */}
      <div style={{...abs, left: 90, top: 150, width: 470}}>
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 30, color: INK, background: CYN, padding: '6px 16px', whiteSpace: 'nowrap'}}>{LAB.repairLog}</div>
        {HL.map((h, q) => {
          const at = b(h.at) + B;
          if (t < at) return null;
          const p = k(t, at, at + 6, EO);
          return (
            <div key={q} style={{display: 'flex', gap: 16, alignItems: 'center', height: 74, borderBottom: '2px solid rgba(255,255,255,0.12)', transform: `translateX(${(1 - p) * -60}px)`, opacity: p}}>
              <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 28, color: GRN}}>[OK]</span>
              <span style={{fontFamily: TC, fontWeight: 700, fontSize: h.shortSize, color: WHT, whiteSpace: 'nowrap'}}>{h.short}</span>
            </div>
          );
        })}
      </div>
      {/* 主錯誤視窗 */}
      <div style={{...abs, inset: 0, transform: `translate(${ox}px,${oy}px) scale(${lerp(0.55, 1, pop)})`, transformOrigin: '1210px 450px', opacity: Math.min(1, pop * 2)}}>
        <Slices n={12} amt={sl} seed={`e${f}`} style={{...abs, inset: 0}}>
          <Win x={640} y={190} w={1160} tc={tc} title={fixed ? `${LAB.repaired} · ${it.file}.dat` : `${LAB.error} 0x0${j + 1} · ${LAB.corrupted}`}>
            <div style={{fontFamily: MONO, fontSize: 28, color: DIM, marginBottom: 14, whiteSpace: 'nowrap'}}>
              {fixed ? LAB.restoredMsg : `${LAB.repairing} ${it.file}.dat`}
            </div>
            <RGB s={fixed ? 2 + 26 * hit(u - B, 8) : 18 + 14 * pulse(u, 3, 0.6)} style={{fontFamily: TC, fontWeight: 900, fontSize: it.size, lineHeight: 1.22}}>
              {it.lines.map((ln, q) => (
                <div key={q} style={{whiteSpace: 'nowrap'}}>
                  <Dec text={ln} t={u} start={0} locks={Array.from(ln).map((_, ci) => B + q * 2 + ci * 0.35)} pre={1} seed={`h${j}${q}`} col={j % 2 ? MAG : RED} rate={3} />
                </div>
              ))}
            </RGB>
            <div style={{display: 'flex', alignItems: 'center', gap: 20, marginTop: 20}}>
              <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 28, color: tc, whiteSpace: 'nowrap', width: 170}}>{fixed ? LAB.restored : LAB.fixing}</span>
              <Bar p={fixed ? 1 : k(u, 2, B, (x) => x)} c={tc} w={760} />
            </div>
          </Win>
        </Slices>
      </div>
      <Mosh f={f} n={20} amt={fixed ? 0.08 : 0.45} seed="m4" />
    </AbsoluteFill>
  );
};

/* ═══ numbers：大數字亂碼滾動、一位一位在拍上鎖定（1～2 個），最後一個可帶 1～2 張小數字卡 ═══ */
type NumItem = {value: string; unit: string; size: number; head: string; headSize: number; badge: string; note: string; noteSize: number; addr: string; locks: number[]; at: number; dur: number};
type Card = {value: string; unit: string; label: string; labelSize: number; at: number; lock: number[]};
const NC = [GRN, MAG];
export const ChNumbers: React.FC<ChP> = ({t, f, c}) => {
  const IT = c.items as NumItem[];
  const CA = c.cards as Card[];
  let ringAll = 0;
  const views = IT.map((it, q) => {
    const S = b(it.at);
    const nx = IT[q + 1];
    const aOut = nx ? k(t, b(nx.at) - 3, b(nx.at) + 1, EI) : 0;
    if (t < S - 1 || aOut >= 1) return null;
    const locks = it.locks.map((x) => S + b(x));
    const ring = locks.reduce((m, L) => Math.max(m, hit(t - L, 6)), 0);
    ringAll = Math.max(ringAll, ring * (1 - aOut));
    const last = q === IT.length - 1;
    const hasCards = last && CA.length > 0;
    const col = NC[q % 2];
    const amt = (q > 0 ? 240 * hit(t - S + 1, 7) : 0) + 300 * aOut + 60 * ring;
    return (
      <Slices key={q} n={16} amt={amt} seed={`na${q}${f}`} style={{...abs, inset: 0, opacity: 1 - aOut * 0.7}}>
        <AbsoluteFill style={{alignItems: 'center'}}>
          {(it.head !== '' || it.badge !== '') && (
            <div style={{marginTop: hasCards ? 70 : 150, display: 'flex', alignItems: 'baseline', gap: 28, whiteSpace: 'nowrap'}}>
              {it.head !== '' && (
                <RGB s={3 + 18 * hit(t - S - 2, 8)} style={{fontFamily: TC, fontWeight: 900, fontSize: it.headSize, lineHeight: 1.2}}>
                  <Dec text={it.head} t={t} start={S} step={2} pre={2} seed={`fa${q}`} />
                </RGB>
              )}
              {it.badge !== '' && <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 32, color: INK, background: col, padding: '4px 14px'}}>{it.badge}</div>}
            </div>
          )}
          <div style={{marginTop: it.head !== '' || it.badge !== '' ? 20 : hasCards ? 160 : 230, display: 'flex', alignItems: 'flex-end', gap: 20, whiteSpace: 'nowrap'}}>
            <RGB s={5 + 34 * ring} ang={q % 2 ? -0.15 : 0.1} color={col} style={{fontFamily: MONO, fontWeight: 700, fontSize: it.size, lineHeight: 1}}>
              <Roller value={it.value} t={t} start={S} lock={locks} laps={2} />
            </RGB>
            {it.unit !== '' && (
              <RGB s={3 + 24 * hit(t - locks[locks.length - 1], 8)} style={{fontFamily: TC, fontWeight: 900, fontSize: it.size / 2, lineHeight: 1.1, paddingBottom: it.size * 0.1}}>{it.unit}</RGB>
            )}
          </div>
          <div style={{marginTop: hasCards ? 24 : 40, display: 'flex', alignItems: 'center', gap: 30, whiteSpace: 'nowrap'}}>
            {it.note !== '' && <span style={{fontFamily: TC, fontWeight: 700, fontSize: it.noteSize, color: WHT, opacity: k(t, locks[0], locks[0] + 6)}}>{it.note}</span>}
            <span style={{fontFamily: MONO, fontSize: 32, color: CYN}}>
              <Dec text={`ADDR 0x${it.addr} // ${LAB.locked}`} t={t} start={locks[locks.length - 1]} step={0.8} pre={2} seed={`ad${q}`} col={MAG} />
            </span>
          </div>
        </AbsoluteFill>
        {hasCards && CA.map((cd, i) => {
          const at = S + b(cd.at);
          if (t < at) return null;
          const p = k(t, at, at + 6, EO);
          const cc = [GRN, CYN][i % 2];
          const x = CA.length === 1 ? 670 : [330, 1010][i];
          return (
            <div key={i} style={{...abs, left: x, top: 700, width: 580, height: 170, border: `3px solid ${cc}`, background: 'rgba(39,43,60,0.9)', padding: '14px 26px', transform: `scaleX(${p})`, transformOrigin: 'left'}}>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 10, color: cc, whiteSpace: 'nowrap'}}>
                <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 84, lineHeight: 1}}><Roller value={cd.value} t={t} start={at} lock={cd.lock.map((x) => S + b(x))} laps={1} /></span>
                <span style={{fontFamily: TC, fontWeight: 900, fontSize: 52}}>{cd.unit}</span>
              </div>
              <div style={{fontFamily: TC, fontWeight: 700, fontSize: cd.labelSize, color: WHT, marginTop: 8, whiteSpace: 'nowrap'}}>{cd.label}</div>
            </div>
          );
        })}
      </Slices>
    );
  });
  return (
    <AbsoluteFill>
      <HexBG t={t} seed="c5" o={0.08} color={MAG} />
      {views}
      <Mosh f={f} n={22} amt={0.1 + 0.4 * ringAll + 0.4 * k(t, b(c.nb - 1), b(c.nb), EI)} seed="m5" />
    </AbsoluteFill>
  );
};

/* ═══ status：系統狀態列逐列上線，最後 ALL SYSTEMS ONLINE ═══ */
type Row = {label: string; labelSize: number; desc: string; descSize: number; state: string; stateSize: number; at: number};
const RC = [GRN, CYN, GRN, MAG, GRN, CYN];
const SPIN = ['|', '/', '-', '\\'];
export const ChStatus: React.FC<ChP> = ({t, f, c}) => {
  const open = k(t, 0, 8, EO);
  const R = c.rows as Row[];
  const allOk = t >= b(c.allOk);
  return (
    <AbsoluteFill>
      <HexBG t={t} seed="c6" o={0.05} />
      <Slices n={10} amt={200 * hit(t, 6) + 40 * hit(t - b(c.allOk), 5)} seed={`sy${f}`} style={{...abs, inset: 0}}>
        <div style={{...abs, left: 200, top: 110, width: 1520, height: 760, border: `3px solid ${allOk ? GRN : CYN}`, background: 'rgba(36,39,56,0.92)', transform: `scaleY(${open})`, transformOrigin: 'top'}}>
          <div style={{height: 66, background: allOk ? GRN : CYN, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px', color: INK, whiteSpace: 'nowrap'}}>
            <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 32}}>{LAB.status}</span>
            <span style={{fontFamily: TC, fontWeight: 900, fontSize: c.titleSize}}>{c.title}</span>
          </div>
          {R.map((r, q) => {
            const st = b(r.at);
            if (t < st - 1) return null;
            const p = k(t, st - 1, st + 4, EO);
            const ok = t >= st + B;
            const rc = RC[q % RC.length];
            return (
              <div key={q} style={{display: 'flex', alignItems: 'center', height: 92, padding: '0 30px', borderBottom: '2px solid rgba(255,255,255,0.10)', opacity: p, transform: `translateX(${(1 - p) * 80}px)`}}>
                <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 30, color: DIM, width: 70, flexShrink: 0}}>0{q + 1}</span>
                <span style={{fontFamily: TC, fontWeight: 900, fontSize: r.labelSize, color: WHT, width: 230, flexShrink: 0, whiteSpace: 'nowrap'}}>
                  <Dec text={r.label} t={t} start={st} step={2} pre={1} seed={`l${q}`} col={rc} />
                </span>
                <span style={{fontFamily: TC, fontWeight: 700, fontSize: r.descSize, color: DIM, whiteSpace: 'nowrap'}}>{r.desc}</span>
                <span style={{flex: 1, minWidth: 30, margin: '0 26px', borderBottom: '4px dotted rgba(255,255,255,0.22)'}} />
                <span style={{fontFamily: MONO, fontWeight: 700, fontSize: r.stateSize, minWidth: 250, textAlign: 'center', padding: '4px 16px', border: `3px solid ${ok ? rc : 'rgba(255,255,255,0.3)'}`, color: ok ? INK : WHT, background: ok ? rc : 'transparent', whiteSpace: 'nowrap', flexShrink: 0}}>
                  {ok ? r.state : `[ ${SPIN[Math.floor(t / 3) % 4]} ]`}
                </span>
              </div>
            );
          })}
          {allOk && (
            <div style={{display: 'flex', alignItems: 'center', gap: 26, padding: '20px 30px', whiteSpace: 'nowrap'}}>
              <RGB s={2 + 22 * hit(t - b(c.allOk), 8)} color={GRN} style={{fontFamily: MONO, fontWeight: 700, fontSize: 40}}>{LAB.allOk}</RGB>
              {c.welcome !== '' && (
                <span style={{fontFamily: TC, fontWeight: 900, fontSize: c.welcomeSize, color: WHT}}>
                  <Dec text={c.welcome} t={t} start={b(c.allOk) + 3} step={2} pre={1} seed="wel" />
                </span>
              )}
            </div>
          )}
        </div>
      </Slices>
      <Mosh f={f} n={16} amt={0.06 + 0.25 * pulse(t, B * 2, 0.12) + 0.4 * k(t, b(c.nb - 1), b(c.nb), EI)} seed="m6" />
    </AbsoluteFill>
  );
};

/* ═══ logo：全畫面故障慢慢收斂成名稱、標語、一行小字、網址 ═══ */
export const ChLogo: React.FC<ChP> = ({t, f, c}) => {
  const nb: number = c.nb;
  const g = 1 - k(t, 0, b(6), EO); // 故障強度 1→0
  const tick = hit(t - b(nb - 4), 4) * 0.5; // 收尾前一個小故障點
  const pull = lerp(1.35, 1, k(t, 0, b(5), EO));
  const sl = c.slogan as string[];
  const n0 = Array.from(sl[0] || '').length;
  const locks = Array.from(sl.join('')).map((_, i) => b(1) + i * 0.45 * B);
  return (
    <AbsoluteFill>
      <HexBG t={t} seed="c7" o={0.04 + 0.1 * g} />
      <Snow f={f} o={0.08 + 0.32 * g} />
      <Mosh f={f} n={40} amt={0.9 * g + 0.25 * tick} seed="m7" />
      <AbsoluteFill style={{transform: `scale(${pull})`, transformOrigin: '960px 470px'}}>
        <Slices n={22} amt={420 * g * g + 30 * g + 60 * tick} seed={`lg${f}`} style={{...abs, inset: 0}}>
          <AbsoluteFill style={{alignItems: 'center'}}>
            <div style={{marginTop: 245, display: 'flex', alignItems: 'center', gap: 26, whiteSpace: 'nowrap'}}>
              {c.badge !== '' && <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 40, color: INK, background: GRN, padding: '2px 16px'}}>{c.badge}</div>}
              <div style={{fontFamily: TC, fontWeight: 900, fontSize: c.nameSize, color: WHT, letterSpacing: c.nameSize / 6}}>
                <Dec text={c.name} t={t} start={0} step={3} pre={1} seed="nm" />
              </div>
            </div>
            <RGB s={1.5 + 46 * g + 18 * tick} ang={0.15} style={{marginTop: 40, fontFamily: TC, fontWeight: 900, fontSize: c.sloganSize, lineHeight: 1.2, whiteSpace: 'nowrap'}}>
              <Dec text={sl[0]} t={t} start={0} locks={locks.slice(0, n0)} pre={1} seed="s1" col={MAG} />
              {sl.length > 1 && (
                <>
                  <span>　</span>
                  <span style={{color: GRN}}>
                    <Dec text={sl[1]} t={t} start={0} locks={locks.slice(n0)} pre={1} seed="s2" col={CYN} />
                  </span>
                </>
              )}
            </RGB>
            <div style={{marginTop: 26, height: 4, width: lerp(0, 1100, k(t, b(4), b(6), EO)), background: `linear-gradient(90deg, ${MAG}, ${CYN}, ${GRN})`}} />
            {c.line !== '' && (
              <div style={{marginTop: 34, fontFamily: TC, fontWeight: 700, fontSize: c.lineSize, color: WHT, whiteSpace: 'nowrap'}}>
                <Dec text={c.line} t={t} start={b(4)} step={1.6} pre={1} seed="s3" col={GRN} />
              </div>
            )}
            {c.url !== '' && (
              <div style={{marginTop: 26, fontFamily: MONO, fontWeight: 700, fontSize: c.urlSize, color: CYN, letterSpacing: '0.04em', whiteSpace: 'nowrap'}}>
                <Dec text={c.url} t={t} start={b(5)} step={0.9} pre={1} seed="web" col={MAG} />
              </div>
            )}
          </AbsoluteFill>
        </Slices>
      </AbsoluteFill>
      <div style={{...abs, left: 0, right: 0, top: 170, textAlign: 'center', fontFamily: MONO, fontSize: 30, color: GRN, opacity: interpolate(t, [b(5), b(6)], [0, 0.9], clamp)}}>
        {LAB.signalRestored}
      </div>
    </AbsoluteFill>
  );
};
