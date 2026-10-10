/* 廣P 章型（二）：counter 計數器＋收據／settings 設定面板開關／stack 視窗堆疊→一鍵清空／end logo 大按鈕（原作第 6～10 章）。
   每章的字、字級、登場拍點全部讀 timeline.json（c＝這一章的資料，t＝章內格數）。 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ChP, EI, EO, LAB, LIN, Roller, k, lerp, nb, rnd, sp} from './kit';
import {Btn, Burst, C, Cursor, DotBg, MONO, SG, Sticker, TC, Tape, Toggle, Win, abs, bx, clicks, path, pop, slap, tap} from './ui';

/* ───── counter：大數字滾動、PRINT 印出收據、印章、小數字視窗 ───── */
export const ChCounter: React.FC<ChP> = ({t, c}) => {
  const printAt = nb(1);
  const cl = clicks(t, [printAt]);
  const [cx, cy] = path(t, [[0, 1990, 800], [printAt - 3, 1676, 108], [printAt + 5, 1676, 108], [nb(3), 1990, 760]]);
  let steps = 0;
  for (let s = 0; s < 8; s++) steps += k(t, nb(2) + s * 5.6, nb(2) + s * 5.6 + 4, EO);
  const RH: number = c.RH;
  const full = RH + 26;
  const len = full * (steps / 8);
  const zig = 'M0,0 ' + Array.from({length: 20}, (_, i) => `L${i * 32 + 16},22 L${i * 32 + 32},0`).join(' ') + ' Z';
  const rows = c.rows as {label: string; labelSize: number; value: string; valueSize: number}[];
  const TT = c.total as null | {label: string; labelSize: number; n: string; pre: string; unit: string; size: number};
  const dash = (m: string) => <div style={{borderTop: `4px dashed ${C.k}`, margin: m}} />;
  const receipt = (
    <div style={{...abs, left: 0, top: 0, width: 640}}>
      <div style={{height: RH, background: C.w, borderLeft: `6px solid ${C.k}`, borderRight: `6px solid ${C.k}`, boxSizing: 'border-box', padding: '26px 34px'}}>
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: c.rtitleSize, color: C.k, whiteSpace: 'nowrap'}}>{c.rtitle}</div>
        {dash('14px 0')}
        {rows.map((r, i) => (
          <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', height: 74, whiteSpace: 'nowrap'}}>
            <span style={{fontFamily: TC, fontWeight: 700, fontSize: r.labelSize, color: C.k}}>{r.label}</span>
            <span style={{fontFamily: TC, fontWeight: 900, fontSize: r.valueSize, color: C.k}}>{r.value}</span>
          </div>
        ))}
        {TT && (
          <>
            <div style={{fontFamily: TC, fontWeight: 700, fontSize: TT.labelSize, color: C.k, whiteSpace: 'nowrap'}}>{TT.label}</div>
            <div style={{display: 'flex', alignItems: 'baseline', marginTop: 6, fontFamily: SG, fontWeight: 700, color: C.k, whiteSpace: 'nowrap'}}>
              {TT.pre && <span style={{fontSize: TT.size * 0.43, marginRight: 12}}>{TT.pre}</span>}
              <span style={{fontSize: TT.size}}><Roller value={TT.n} t={t} start={nb(4)} lock={(c.totLocks as number[]).map(nb)} laps={1} /></span>
              {TT.unit && <span style={{fontFamily: TC, fontWeight: 900, fontSize: TT.size * 0.45, marginLeft: 10}}>{TT.unit}</span>}
            </div>
          </>
        )}
        {dash('18px 0 14px')}
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: c.thanksSize, color: C.k, whiteSpace: 'nowrap'}}>{c.thanks}</div>
      </div>
      <svg width={640} height={26} style={{display: 'block', marginTop: -1}}>
        <path d={zig} fill={C.w} stroke={C.k} strokeWidth={5} strokeLinejoin="miter" />
      </svg>
    </div>
  );
  const stamp = c.stamp ? k(t, nb(c.stampAt), nb(c.stampAt) + 5, EO) : 0;
  const stats = c.stats as {n: string; unit: string; size: number; label: string; labelSize: number; title: string}[];
  const SX = [{x: 100, w: 410, rot: -2, bar: C.m}, {x: 560, w: 420, rot: 2, bar: C.p}];
  return (
    <AbsoluteFill>
      <DotBg bg={C.y} />
      <Win x={100} y={70} w={880} h={560} title={c.app} bar={C.b} s={pop(t, 0)}>
        <div style={{...abs, inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          {c.head && <div style={{fontFamily: TC, fontWeight: 900, fontSize: c.headSize, color: C.k, ...bx(C.m, 6, 5), padding: '4px 24px', whiteSpace: 'nowrap'}}>{c.head}</div>}
          <div style={{display: 'flex', alignItems: 'baseline', marginTop: 10, color: C.k, whiteSpace: 'nowrap'}}>
            <span style={{fontFamily: SG, fontWeight: 700, fontSize: c.size, lineHeight: 1.05}}><Roller value={c.n} t={t} start={nb(1)} lock={(c.locks as number[]).map(nb)} laps={c.laps} /></span>
            {c.unit && <span style={{fontFamily: TC, fontWeight: 900, fontSize: c.size * 0.53, marginLeft: 10}}>{c.unit}</span>}
          </div>
        </div>
      </Win>
      {/* 收據紙（往下印出） */}
      <div style={{...abs, left: 1112, top: 162, width: 660, height: len + 40, overflow: 'hidden'}}>
        <div style={{...abs, left: 12, top: 12 - full + len, width: 640, height: RH - 10, background: C.k}} />
        <div style={{...abs, left: 0, top: -full + len}}>{receipt}</div>
      </div>
      {/* 印表機 */}
      <div style={{...abs, left: 1060, top: 50, width: 740, height: 116, ...bx(C.p, 12), display: 'flex', alignItems: 'center', padding: '0 26px'}}>
        <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 30, color: C.k}}>{LAB.printer}</span>
        <div style={{...abs, left: 46, right: 46, bottom: 12, height: 12, background: C.k}} />
      </div>
      <Btn x={1600} y={70} w={160} h={70} bg={C.y} press={tap(t, printAt)} sh={8}>
        <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 30, color: C.k}}>{LAB.print}</span>
      </Btn>
      {stamp > 0 && (
        <div style={{...abs, right: 110, top: 720, ...bx(C.p, 10), padding: '6px 26px', fontFamily: TC, fontWeight: 900, fontSize: c.stampSize, color: C.k, whiteSpace: 'nowrap',
          transform: `rotate(-12deg) scale(${lerp(2.4, 1, stamp)})`, opacity: Math.min(1, stamp * 3)}}>{c.stamp}</div>
      )}
      {stats.map((s, j) => (
        <Win key={j} x={SX[j].x} y={670} w={SX[j].w} h={220} title={s.title} bar={SX[j].bar} s={pop(t, nb(c.statAt[j]))} rot={SX[j].rot}>
          <div style={{...abs, inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{display: 'flex', alignItems: 'baseline', color: C.k, whiteSpace: 'nowrap'}}>
              <span style={{fontFamily: SG, fontWeight: 700, fontSize: s.size, lineHeight: 1}}><Roller value={s.n} t={t} start={nb(c.statAt[j])} lock={[nb(c.statAt[j] + 1), nb(c.statAt[j] + 1) + 3, nb(c.statAt[j] + 1) + 6]} /></span>
              {s.unit && <span style={{fontFamily: TC, fontWeight: 900, fontSize: s.size * 0.6, marginLeft: 6}}>{s.unit}</span>}
            </div>
            {s.label && <div style={{fontFamily: TC, fontWeight: 700, fontSize: s.labelSize, color: C.k, marginTop: 6, whiteSpace: 'nowrap'}}>{s.label}</div>}
          </div>
        </Win>
      ))}
      {t < nb(3) && <Cursor x={cx} y={cy} down={cl.down} click={cl.click} />}
    </AbsoluteFill>
  );
};

/* ───── 預覽圖示（粗黑線＋原色，200×200） ───── */
export const Icon: React.FC<{k: string}> = ({k: kind}) => {
  const st = {stroke: C.k, strokeWidth: 9, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};
  const th = {...st, strokeWidth: 6};
  return (
    <svg width={200} height={200} viewBox="0 0 200 200">
      {kind === 'bus' && (<>
        <rect x={20} y={36} width={160} height={110} rx={14} fill={C.w} {...st} />
        <rect x={38} y={54} width={36} height={34} fill={C.m} {...th} /><rect x={82} y={54} width={36} height={34} fill={C.m} {...th} /><rect x={126} y={54} width={36} height={34} fill={C.m} {...th} />
        <circle cx={58} cy={150} r={20} fill={C.k} /><circle cx={142} cy={150} r={20} fill={C.k} />
      </>)}
      {kind === 'house' && (<>
        <path d="M100,22 L182,92 L182,180 L18,180 L18,92 Z" fill={C.w} {...st} />
        <rect x={80} y={120} width={40} height={60} fill={C.y} {...th} />
        <rect x={36} y={104} width={30} height={30} fill={C.m} {...th} /><rect x={134} y={104} width={30} height={30} fill={C.m} {...th} />
      </>)}
      {kind === 'book' && (<>
        <path d="M100,50 L20,34 L20,160 L100,176 Z" fill={C.w} {...st} />
        <path d="M100,50 L180,34 L180,160 L100,176 Z" fill={C.y} {...st} />
        <path d="M40,70 L82,78 M40,100 L82,108 M118,78 L160,70 M118,108 L160,100" {...th} />
      </>)}
      {kind === 'water' && (<>
        {[50, 100, 150].map((y) => <path key={y} d={`M14,${y} Q42,${y - 22} 70,${y} T126,${y} T182,${y}`} fill="none" stroke={C.w} strokeWidth={14} strokeLinecap="round" />)}
        {[50, 100, 150].map((y) => <path key={`k${y}`} d={`M14,${y} Q42,${y - 22} 70,${y} T126,${y} T182,${y}`} fill="none" stroke={C.k} strokeWidth={5} strokeLinecap="round" />)}
      </>)}
      {kind === 'star' && <path d="M100,16 L124,74 L186,78 L138,118 L154,180 L100,146 L46,180 L62,118 L14,78 L76,74 Z" fill={C.w} {...st} />}
      {kind === 'cup' && (<>
        <path d="M30,70 L150,70 L138,170 L42,170 Z" fill={C.w} {...st} />
        <path d="M148,92 Q186,92 182,122 Q178,148 142,146" fill="none" {...st} />
        <path d="M62,52 Q52,38 64,26 M92,52 Q82,38 94,26 M122,52 Q112,38 124,26" fill="none" {...th} />
        <rect x={44} y={100} width={92} height={18} fill={C.y} {...th} />
      </>)}
      {kind === 'cake' && (<>
        <rect x={26} y={96} width={148} height={80} fill={C.w} {...st} />
        <path d="M26,122 Q50,140 74,122 T122,122 T174,122" fill="none" {...th} />
        <rect x={92} y={54} width={16} height={42} fill={C.y} {...th} />
        <path d="M100,24 Q114,40 100,50 Q86,40 100,24 Z" fill={C.p} {...th} />
      </>)}
      {kind === 'clock' && (<>
        <circle cx={100} cy={100} r={80} fill={C.w} {...st} />
        <path d="M100,100 L100,50 M100,100 L140,118" {...st} />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={96} y={26} width={8} height={16} fill={C.k} transform={`rotate(${i * 90} 100 100)`} />)}
      </>)}
      {kind === 'pin' && (<>
        <path d="M100,184 L48,104 A60,60 0 1,1 152,104 Z" fill={C.w} {...st} />
        <circle cx={100} cy={78} r={24} fill={C.p} {...th} />
      </>)}
      {kind === 'laptop' && (<>
        <rect x={38} y={40} width={124} height={88} fill={C.w} {...st} />
        <rect x={54} y={56} width={92} height={56} fill={C.m} {...th} />
        <path d="M14,150 L186,150 L170,172 L30,172 Z" fill={C.y} {...st} />
      </>)}
      {kind === 'car' && (<>
        <path d="M18,128 L30,88 L62,62 L138,62 L170,88 L182,128 Z" fill={C.w} {...st} />
        <path d="M58,88 L72,74 L128,74 L142,88 Z" fill={C.m} {...th} />
        <circle cx={58} cy={140} r={20} fill={C.k} /><circle cx={142} cy={140} r={20} fill={C.k} />
      </>)}
      {kind === 'gift' && (<>
        <rect x={28} y={80} width={144} height={96} fill={C.w} {...st} />
        <rect x={20} y={58} width={160} height={30} fill={C.y} {...st} />
        <path d="M100,58 L100,176" {...st} />
        <path d="M100,58 Q70,20 56,40 Q48,58 100,58 Q130,20 144,40 Q152,58 100,58" fill={C.p} {...th} />
      </>)}
    </svg>
  );
};

/* ───── settings：開關一個個打開，右邊預覽跟著換 ───── */
const COL7 = [C.y, C.p, C.m, C.b];
export const ChSettings: React.FC<ChP> = ({t, c}) => {
  const IT = c.items as {label: string; labelSize: number; word: string; wordSize: number; sub: string; subSize: number; icon: string; on: number;
    num: null | {pre: string; n: string; unit: string; locks: number[]; start: number}}[];
  const on = (i: number) => nb(IT[i].on);
  const cl = clicks(t, IT.map((_, i) => on(i)));
  const keys: [number, number, number][] = [[0, 1990, 800]];
  IT.forEach((_, i) => {
    keys.push([on(i) - 6, 872, 212 + i * 150]);
    keys.push([on(i) + 3, 872, 212 + i * 150]);
  });
  const outAt = on(IT.length - 1) + nb(2.5);
  keys.push([outAt, 1990, 800]);
  const [cx, cy] = path(t, keys);
  let cur = -1;
  IT.forEach((_, i) => { if (t >= on(i) + 1) cur = i; });
  const ps = cur >= 0 ? sp(t, on(cur) + 1, 10, 280) : 0;
  const it = cur >= 0 ? IT[cur] : null;
  return (
    <AbsoluteFill>
      <DotBg bg={C.b} dot="rgba(17,17,17,0.32)" />
      <Win x={100} y={60} w={900} h={820} title={c.title} bar={C.m} s={pop(t, 0)}>
        {IT.map((r, i) => {
          const p = k(t, on(i) + 1, on(i) + 6, EO);
          const col = COL7[i % 4];
          return (
            <div key={i} style={{...abs, left: 36, top: 40 + i * 150, width: 816, height: 112, ...bx(p > 0.5 ? col : C.w, 6, 5), display: 'flex', alignItems: 'center', padding: '0 22px', gap: 20}}>
              <div style={{flex: 1, fontFamily: TC, fontWeight: 900, fontSize: r.labelSize, color: p > 0.5 && col === C.b ? C.w : C.k, whiteSpace: 'nowrap'}}>{r.label}</div>
              <Toggle p={p} on={C.k} />
            </div>
          );
        })}
        <Sticker x={260} y={40 + IT.length * 150 + 30} p={slap(t, nb(c.allAt))} rot={-3} bg={C.y} fs={44}>{LAB.allOn}</Sticker>
      </Win>
      <Win x={1080} y={60} w={740} h={820} title={LAB.preview} bar={C.y} s={pop(t, nb(1))}>
        {!it ? (
          <div style={{...abs, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 36, color: 'rgba(17,17,17,0.55)'}}>{LAB.waiting}</div>
        ) : (
          <div style={{...abs, inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 50, transform: `scale(${lerp(1.3, 1, ps)})`}}>
            <div style={{width: 300, height: 300, flex: '0 0 300px', ...bx(COL7[cur % 4], 14), display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon k={it.icon} /></div>
            <div style={{fontFamily: TC, fontWeight: 900, fontSize: it.wordSize, lineHeight: 1.2, color: C.k, marginTop: 26, whiteSpace: 'nowrap'}}>{it.word}</div>
            {it.sub && <div style={{fontFamily: TC, fontWeight: 700, fontSize: it.subSize, color: C.k, ...bx(C.m, 6, 5), padding: '4px 22px', whiteSpace: 'nowrap'}}>{it.sub}</div>}
            {it.num && (
              <div style={{display: 'flex', alignItems: 'baseline', marginTop: 16, color: C.k, whiteSpace: 'nowrap'}}>
                {it.num.pre && <span style={{fontFamily: TC, fontWeight: 700, fontSize: 34}}>{it.num.pre}</span>}
                <span style={{fontFamily: SG, fontWeight: 700, fontSize: 64, margin: '0 10px'}}><Roller value={it.num.n} t={t} start={nb(it.num.start)} lock={it.num.locks.map(nb)} /></span>
                {it.num.unit && <span style={{fontFamily: TC, fontWeight: 700, fontSize: 34}}>{it.num.unit}</span>}
              </div>
            )}
          </div>
        )}
      </Win>
      {t < outAt && <Cursor x={cx} y={cy} down={cl.down} click={cl.click} />}
    </AbsoluteFill>
  );
};

/* ───── stack：視窗一拍一個彈出疊成一大疊 → 游標按「一鍵清空」→ 全部甩出畫面 ───── */
const SCOL: [string, string, string][] = [[C.p, C.w, C.k], [C.y, C.b, C.w], [C.m, C.y, C.k], [C.y, C.m, C.k], [C.p, C.w, C.k], [C.b, C.y, C.k], [C.m, C.p, C.k],
  [C.y, C.w, C.k], [C.p, C.m, C.k], [C.b, C.y, C.k], [C.y, C.p, C.k], [C.m, C.w, C.k], [C.p, C.b, C.w]];
export const ChStack: React.FC<ChP> = ({t, c}) => {
  const WS = c.wins as {x: number; y: number; w: number; h: number; text: string; size: number; title: string; at: number}[];
  const m = WS.length;
  const press = nb(c.press);
  const cam = 1 + 0.1 * k(t, 0, press, LIN);
  const d = t - press;
  const jolt = d >= 0 && d < 20 ? 30 * Math.sin(d * 1.9) * Math.exp(-d / 5) : 0;
  const cl = clicks(t, [press], 6);
  const btnAt = nb(c.btnAt);
  const [cx, cy] = path(t, [[btnAt, 1990, 800], [press - 3, 1000, 806], [press + 6, 1000, 806], [press + nb(2), 1990, 800]]);
  const fly = (i: number) => press + 5 + (m - 1 - i) * 4.2;
  const btnOut = k(t, nb(c.outAt), nb(c.outAt) + 7, EI);
  const stOut = k(t, press + 2, press + 10, EI);
  return (
    <AbsoluteFill>
      <DotBg bg={C.w} />
      <AbsoluteFill style={{transform: `translateX(${jolt}px) scale(${cam})`, transformOrigin: '960px 470px'}}>
        {WS.map((q, i) => {
          const p = k(t, fly(i), fly(i) + 12, EI);
          if (p >= 1) return null;
          const big = q.w >= 1000;
          const col = big ? [C.y, C.w, C.k] : SCOL[i % SCOL.length];
          const dir = q.x + q.w / 2 < 960 ? -1 : 1;
          return (
            <Win key={i} x={q.x} y={q.y} w={q.w} h={q.h} title={q.title} bar={col[0]} bg={col[1]} s={pop(t, nb(q.at))}
              dx={dir * 2300 * p} dy={-260 * p * (0.5 + Math.abs(rnd(`fy${i}`)))} rot={rnd(`st${i}`) * 4 + dir * 34 * p}>
              <div style={{...abs, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TC, fontWeight: 900, fontSize: q.size, color: col[2], whiteSpace: 'nowrap'}}>{q.text}</div>
            </Win>
          );
        })}
        <Sticker x={1440} y={40} p={slap(t, nb(c.cntAt))} rot={8} bg={C.m} font={MONO} fs={c.countSize} style={{translate: `${2300 * stOut}px ${-200 * stOut}px`}}>{c.count}</Sticker>
        <Sticker x={90} y={30} p={slap(t, nb(c.shAt))} rot={-6} bg={C.y} fs={c.shoutSize} style={{translate: `${-2300 * stOut}px ${-200 * stOut}px`}}>{c.shout}</Sticker>
      </AbsoluteFill>
      <Btn x={610} y={730} w={700} h={140} bg={C.y} press={tap(t, press, 6)} s={pop(t, btnAt) * (1 - btnOut)}>
        <span style={{fontFamily: TC, fontWeight: 900, fontSize: c.btnSize, color: C.k, whiteSpace: 'nowrap'}}>{c.btn}</span>
      </Btn>
      <Win x={560} y={300} w={800} h={260} title={LAB.sysmsg} bar={C.m} s={pop(t, nb(c.msgAt))}>
        <div style={{...abs, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TC, fontWeight: 900, fontSize: c.msgSize, color: C.k, whiteSpace: 'nowrap'}}>{c.msg}</div>
      </Win>
      {c.after && <Sticker x={1250} y={250} p={slap(t, nb(c.afAt))} rot={7} bg={C.p} fs={c.afterSize}>{c.after}</Sticker>}
      {t > btnAt && t < press + nb(2) && <Cursor x={cx} y={cy} down={cl.down} click={cl.click} />}
    </AbsoluteFill>
  );
};

/* ───── end：標語大按鈕砸下、名稱小視窗、貼紙、游標按下大按鈕、網址列 ───── */
export const ChEnd: React.FC<ChP> = ({t, c}) => {
  const slam = sp(t, 0, 10, 240);
  const pressAt = nb(6);
  const cl = clicks(t, [pressAt], 9);
  const [cx, cy] = path(t, [[nb(4), 1990, 800], [pressAt - 3, 1180, 480], [pressAt + 12, 1180, 480], [nb(9), 1700, 780]]);
  return (
    <AbsoluteFill>
      <DotBg bg={C.w} />
      <Tape y={14} t={t} text={c.tape} bg={C.y} p={c.tape ? k(t, nb(9), nb(9) + 8, EO) : 0} />
      {c.name && (
        <Win x={260} y={110} w={620} h={190} title={c.ntitle} bar={C.y} s={pop(t, nb(1))} rot={-2}>
          <div style={{...abs, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TC, fontWeight: 900, fontSize: c.nameSize, color: C.k, whiteSpace: 'nowrap'}}>{c.name}</div>
        </Win>
      )}
      {c.en && <Sticker x={950} y={128} p={slap(t, nb(2))} rot={3} bg={C.b} color={C.w} font={MONO} fs={c.enSize}>{c.en}</Sticker>}
      {c.full && <Sticker x={1010} y={218} p={slap(t, nb(2.5))} rot={-3} bg={C.m} fs={c.fullSize}>{c.full}</Sticker>}
      <Btn x={260} y={340} w={1400} h={250} bg={C.p} press={tap(t, pressAt, 9)} sh={16} s={t < 0 ? 0 : lerp(1.4, 1, slam)}>
        <span style={{fontFamily: TC, fontWeight: 900, fontSize: c.sloganSize, color: C.k, whiteSpace: 'nowrap'}}>{c.slogan}</span>
      </Btn>
      <Burst t={t} at={0} cx={960} cy={465} seed="c10" n={22} dist={1000} />
      <Burst t={t} at={pressAt + 10} cx={960} cy={465} seed="c10b" n={12} dist={700} />
      {c.url && (
        <Win x={460} y={660} w={1000} h={150} title={c.browser} bar={C.m} s={pop(t, nb(7))}>
          <div style={{...abs, inset: 0, display: 'flex', alignItems: 'center', gap: 22, padding: '0 30px'}}>
            <div style={{width: 40, height: 40, flex: '0 0 40px', ...bx(C.y, 0, 5)}} />
            <div style={{flex: 1, height: 60, ...bx(C.w, 0, 5), display: 'flex', alignItems: 'center', padding: '0 18px', fontFamily: MONO, fontWeight: 700, fontSize: c.urlSize, color: C.k, whiteSpace: 'nowrap', overflow: 'hidden'}}>{c.url}</div>
          </div>
        </Win>
      )}
      {c.tel && <Sticker right={1880} y={694} p={slap(t, nb(8))} rot={5} bg={C.y} font={MONO} fs={c.telSize}>{c.tel}</Sticker>}
      {t > nb(4) && <Cursor x={cx} y={cy} down={cl.down} click={cl.click} />}
    </AbsoluteFill>
  );
};
