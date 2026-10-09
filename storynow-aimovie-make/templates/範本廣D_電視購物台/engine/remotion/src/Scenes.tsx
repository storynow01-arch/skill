/* 廣D 各商品區的內容（世界座標：每區寬 1920，畫面在該區時左上＝(0,0)）。
   每區讀自己的事件格（ev，timeline.py 依內容算）與內容（d，storyboard）；字全部來自 storyboard。原作：02_試做/廣告30風格 第 19 支 */
import React from 'react';
import {interpolate} from 'remotion';
import {clamp, EI, EO, k, lerp, rnd, rnd01, sp, Roller} from './kit';
import {ANTON, At, BLUE, Burst, GOLD, GRN, Ghosts, INK, NOTO, Pop, RED, REG, Sparkle, WHITE, Y} from './parts';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ZP = {f: number; ev: any; d: any};
const Pill: React.FC<{bg: string; fg?: string; size?: number; children: React.ReactNode; bd?: string; font?: string; pad?: string}> = ({bg, fg = WHITE, size = 44, children, bd = INK, font = NOTO, pad = '6px 30px'}) => (
  <div style={{background: bg, color: fg, border: `6px solid ${bd}`, borderRadius: 999, padding: pad, fontFamily: font, fontWeight: 900, fontSize: size, lineHeight: 1.2, whiteSpace: 'nowrap', boxShadow: `6px 8px 0 ${INK}`}}>
    {children}
  </div>
);
/** 數字字串的字寬（em）估算：數字 0.5、其他 1（給字級縮放用） */
const emOf = (s: string) => Array.from(String(s)).reduce((a, c) => a + (/[0-9]/.test(c) ? 0.5 : /[.:/\-,]/.test(c) ? 0.3 : 1), 0);
const fitTo = (s: string, size: number, maxw: number) => Math.min(size, maxw / Math.max(0.1, emOf(s)));

/* ───────── price：原價 → 劃掉 → 新價格 ───────── */
export const ZonePrice: React.FC<ZP> = ({f, ev: m, d}) => {
  const enter = k(f, m.board, m.board + 12, EO);
  const shakeAmp = k(f, m.roll, m.zero, (x) => x * x) * 9 * (f < m.drop ? 1 : 0);
  const dropP = k(f, m.drop, m.drop + 14, EI);
  const boardPos = (ff: number) => {
    const e = k(ff, m.board, m.board + 12, EO);
    const dd = k(ff, m.drop, m.drop + 14, EI);
    return {x: 1180 + (1 - e) * 1500 + Math.sin(ff * 2.1) * shakeAmp, y: 440 + dd * 950, r: dd * 22 + Math.cos(ff * 2.7) * shakeAmp * 0.2};
  };
  const slash = k(f, m.slash, m.slash + 5, EO);
  const origS = f < m.orig ? 0 : interpolate(f - m.orig, [0, 5, 9], [2.6, 0.92, 1], clamp);
  const unit = d.unit ?? '元';
  const Board = (ff: number) => {
    const p = boardPos(ff);
    return (
      <At x={p.x} y={p.y} r={p.r}>
        <div style={{position: 'relative', width: 1080, height: 340}}>
          <div style={{position: 'absolute', inset: 0, background: Y, border: `9px solid ${INK}`, borderRadius: 36, boxShadow: `14px 18px 0 ${INK}`}} />
          <div style={{position: 'absolute', inset: 18, border: `5px dashed ${RED}`, borderRadius: 24}} />
          <div style={{position: 'absolute', left: 0, right: 0, top: -42, display: 'flex', justifyContent: 'center'}}>
            <Pill bg={RED} size={52}>{d.label}</Pill>
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 50, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 18}}>
            <Pop size={fitTo(String(d.orig), 240, 640)} font={ANTON} fill={RED} ext={INK} stroke={WHITE} depth={5} skew={6} sw={14}>
              <Roller value={String(d.orig)} t={ff} start={m.board} lock={m.lock} laps={2} cw={0.5} />
            </Pop>
            <div style={{marginBottom: 30}}>
              <Pop size={130} fill={RED} ext={INK} stroke={WHITE} depth={4}>{unit}</Pop>
            </div>
          </div>
          {slash > 0 && (
            <svg width={1080} height={340} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
              <path d="M-40,250 L1120,90" stroke={WHITE} strokeWidth={62} strokeLinecap="round" pathLength={1} strokeDasharray={`${slash} 2`} />
              <path d="M-40,250 L1120,90" stroke={RED} strokeWidth={40} strokeLinecap="round" pathLength={1} strokeDasharray={`${slash} 2`} />
            </svg>
          )}
          <At x={40} y={10} s={origS} r={-12}>
            <div style={{position: 'relative'}}>
              <Burst r={130} n={14} fill={BLUE} seed="orig" />
              <Pop size={88} fill={Y} ext={RED}>原價！</Pop>
            </div>
          </At>
        </div>
      </At>
    );
  };
  const z = f - m.zero;
  const zs = z < 0 ? 0 : sp(f, m.zero, 9, 200, 0.8);
  const freeS = f < m.free ? 0 : sp(f, m.free, 10, 220, 0.7);
  const tagS = f < m.free + 14 ? 0 : sp(f, m.free + 14, 10, 220, 0.7);
  return (
    <>
      {enter > 0 && dropP < 1 && <Ghosts f={f} on={(f >= m.board && f < m.board + 10) || (f >= m.drop + 2 && f < m.drop + 14)} render={Board} />}
      {zs > 0 && (
        <At x={1180} y={410} s={zs} r={(1 - zs) * -30 + Math.sin(z * 0.12) * 2}>
          <div style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <Burst r={380} n={20} fill={RED} fill2={Y} seed="zero" rot={z * 0.4} sw={12} />
            <div style={{marginBottom: -20}}>
              <Pop size={74} fill={WHITE} ext={BLUE}>{d.nowLabel ?? '現在只要'}</Pop>
            </div>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: 10}}>
              <Pop size={fitTo(String(d.now), 330, 520)} font={ANTON} fill={RED} ext={INK} stroke={WHITE} sw={16} depth={7} skew={7}>{d.now}</Pop>
              <div style={{marginBottom: 46}}>
                <Pop size={150} fill={RED} ext={INK} stroke={WHITE} depth={5}>{d.nowUnit ?? '元！'}</Pop>
              </div>
            </div>
          </div>
        </At>
      )}
      {d.tag && (
        <At x={1640} y={170} s={tagS} r={8}>
          <Pill bg={BLUE} size={40}>{d.tag}</Pill>
        </At>
      )}
      {freeS > 0 && (
        <At x={1180} y={705} s={freeS} r={-3}>
          <div style={{position: 'relative', padding: '14px 70px', background: RED, border: `9px solid ${INK}`, borderRadius: 18, boxShadow: `12px 14px 0 ${INK}`}}>
            <Pop size={104} fill={Y} ext={INK} stroke={INK} depth={4}>{d.banner}</Pop>
          </div>
        </At>
      )}
      {zs > 0 && [0, 1, 2, 3, 4, 5].map((i) => (
        <Sparkle key={i} x={1180 + Math.cos(i * 1.05 + 0.4) * 470} y={400 + Math.sin(i * 1.05 + 0.4) * 330} s={0.9 * Math.max(0, Math.sin((z - i * 5) * 0.16))} c={i % 2 ? Y : WHITE} />
      ))}
    </>
  );
};

/* ───────── bonus：再加碼金卡 ───────── */
export const ZoneBonus: React.FC<ZP> = ({f, ev: m, d}) => {
  const ps = f < m.plus ? 0 : sp(f, m.plus, 9, 220, 0.7);
  const cardPos = (ff: number) => k(ff, m.card, m.card + 12, EO);
  const shine = ((f - m.card) * 22) % 2600 - 600;
  const clang = f < m.card24 ? 0 : sp(f, m.card24, 8, 260, 0.6);
  const num = String(d.number);
  const nd = num.replace(/[^0-9]/g, '').length;
  return (
    <>
      <At x={1180} y={150} s={ps} r={-6}>
        <div style={{position: 'relative'}}>
          <Burst r={170} n={16} fill={GRN} seed="plus" rot={f * 0.6} />
          <Pop size={110} fill={Y} ext={RED}>{d.plus ?? '再加碼！'}</Pop>
        </div>
      </At>
      {f >= m.card && (
        <Ghosts
          f={f}
          on={f < m.card + 10}
          render={(ff) => {
            const p = cardPos(ff);
            return (
              <At x={1180 + (1 - p) * 1400} y={500} r={(1 - p) * 10}>
                <div style={{position: 'relative', width: 1060, height: 420, borderRadius: 44, border: `10px solid ${INK}`, background: `linear-gradient(160deg, #fff3a8 0%, ${GOLD} 45%, #ff9d00 100%)`, boxShadow: `16px 20px 0 ${INK}`, overflow: 'hidden'}}>
                  <div style={{position: 'absolute', top: -100, bottom: -100, left: shine, width: 120, background: 'rgba(255,255,255,0.55)', transform: 'rotate(18deg)'}} />
                  <div style={{position: 'absolute', left: 0, right: 0, top: 26, display: 'flex', justifyContent: 'center', gap: 20, alignItems: 'center'}}>
                    <span style={{fontFamily: NOTO, fontWeight: 900, fontSize: 56, color: INK, whiteSpace: 'nowrap'}}>{d.title}</span>
                    {d.pill && <Pill bg={RED} size={50}>{d.pill}</Pill>}
                  </div>
                  <div style={{position: 'absolute', left: 0, right: 0, top: 100, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16}}>
                    <Pop size={fitTo(num, 270, 520)} font={ANTON} fill={RED} ext={INK} stroke={WHITE} sw={15} depth={6} skew={7}>
                      <Roller value={num} t={ff} start={m.card} lock={Array.from({length: Math.max(1, nd)}, (_, i) => m.card24 - 10 * (nd - 1 - i))} laps={2} cw={0.52} />
                    </Pop>
                    <div style={{marginBottom: 34}}>
                      <Pop size={180} fill={RED} ext={INK} stroke={WHITE} depth={5}>{d.unit}</Pop>
                    </div>
                  </div>
                </div>
              </At>
            );
          }}
        />
      )}
      <At x={1650} y={290} s={clang} r={14}>
        <div style={{position: 'relative'}}>
          <Burst r={110} n={12} fill={Y} seed="clang" />
          <Pop size={70} fill={RED} ext={INK} stroke={WHITE} depth={3}>{d.clang ?? '鏘！'}</Pop>
        </div>
      </At>
    </>
  );
};

/* ───────── tags：1～3 張吊牌落下 ───────── */
const TAG_STYLE = [{bg: Y, ink: INK}, {bg: GRN, ink: INK}, {bg: BLUE, ink: WHITE}];
export const ZoneTags: React.FC<ZP> = ({f, ev: m, d}) => {
  const tags = d as any[];
  const xs = tags.length === 1 ? [1205] : tags.length === 2 ? [990, 1420] : [795, 1205, 1615];
  return (
    <>
      <div style={{position: 'absolute', left: xs[0] - 205, width: xs[xs.length - 1] - xs[0] + 410, top: 78, height: 22, borderRadius: 11, background: GOLD, border: `6px solid ${INK}`}} />
      {tags.map((tg, j) => {
        const at = m.tags[j];
        const st = TAG_STYLE[j];
        if (f < at - 1) return null;
        const amt = String(tg.amount);
        return (
          <Ghosts
            key={j}
            f={f}
            on={f < at + 8}
            render={(ff) => {
              const s = sp(ff, at, 9, 160, 0.9);
              const t = ff - at;
              const swing = t < 0 ? 0 : 13 * Math.exp(-t / 16) * Math.sin(t * 0.42);
              const yy = lerp(-760, 0, s);
              return (
                <div style={{position: 'absolute', left: xs[j] - 190, top: 96 + yy, width: 380, height: 600, transform: `rotate(${swing}deg)`, transformOrigin: '190px 0px'}}>
                  <svg width={380} height={600} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
                    <path d="M190,0 L190,58" stroke={INK} strokeWidth={6} />
                    <path d="M60,60 L320,60 L370,120 L370,590 L10,590 L10,120Z" fill={INK} transform="translate(12,14)" />
                    <path d="M60,60 L320,60 L370,120 L370,590 L10,590 L10,120Z" fill={st.bg} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
                    <circle cx={190} cy={92} r={16} fill={WHITE} stroke={INK} strokeWidth={6} />
                  </svg>
                  <div style={{position: 'absolute', left: 10, width: 360, top: 124, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
                    <Pill bg={RED} size={40} font={REG} pad="2px 26px">加碼 {j + 1}</Pill>
                    <div style={{fontFamily: NOTO, fontWeight: 900, fontSize: 50, color: st.ink, marginTop: 6, whiteSpace: 'nowrap'}}>{tg.title}</div>
                    <div style={{fontFamily: NOTO, fontWeight: 900, fontSize: 38, color: st.ink, height: 46, whiteSpace: 'nowrap'}}>{tg.sub ?? ''}</div>
                    <Pop size={fitTo(amt, 150, 320)} font={ANTON} weight={400} fill={RED} ext={INK} stroke={WHITE} depth={4} skew={6} sw={9}>{amt}</Pop>
                    <div style={{fontFamily: REG, fontSize: 60, color: st.ink, marginTop: -4, whiteSpace: 'nowrap'}}>{tg.unit}</div>
                  </div>
                </div>
              );
            }}
          />
        );
      })}
    </>
  );
};

/* ───────── gifts：小鳥銜牌＋兩個禮盒＋雙重好禮 ───────── */
const Bird: React.FC<{f: number}> = ({f}) => {
  const flap = Math.sin(f * 1.3) * 28;
  return (
    <svg width={260} height={220} viewBox="-130 -110 260 220" style={{overflow: 'visible', display: 'block'}}>
      <ellipse cx={-30} cy={-10} rx={60} ry={30} fill={Y} stroke={INK} strokeWidth={6} transform={`rotate(${-20 - flap},-10,-10)`} />
      <circle cx={0} cy={10} r={78} fill={Y} stroke={INK} strokeWidth={7} />
      <ellipse cx={30} cy={40} rx={34} ry={22} fill="#fff7b0" />
      <path d="M-74,0 L-108,-16 L-100,14Z" fill={GOLD} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      <path d="M70,8 L112,22 L70,36Z" fill="#ff8a00" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <circle cx={40} cy={-6} r={13} fill={INK} />
      <circle cx={44} cy={-10} r={4} fill={WHITE} />
      <ellipse cx={52} cy={20} rx={10} ry={6} fill="#ff7a8a" />
      <ellipse cx={-18} cy={34} rx={52} ry={24} fill={Y} stroke={INK} strokeWidth={6} transform={`rotate(${-14 + flap},-50,30)`} />
      <path d="M-6,-62 Q4,-90 18,-66 Q26,-92 34,-62" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
    </svg>
  );
};
const Gift: React.FC<{color: string; lid: number; lines: string[]}> = ({color, lid, lines}) => (
  <div style={{position: 'relative', width: 340, height: 280}}>
    <div style={{position: 'absolute', left: 12, top: 70, width: 316, height: 210, background: color, border: `8px solid ${INK}`, borderRadius: 14, boxShadow: `12px 14px 0 ${INK}`}} />
    <div style={{position: 'absolute', left: 150, top: 70, width: 40, height: 210, background: Y, borderLeft: `6px solid ${INK}`, borderRight: `6px solid ${INK}`}} />
    <div style={{position: 'absolute', left: 0, top: 30 - lid * 40, width: 340, height: 54, background: color, border: `8px solid ${INK}`, borderRadius: 12, transform: `rotate(${-lid * 8}deg)`}} />
    <svg width={140} height={70} style={{position: 'absolute', left: 100, top: -26 - lid * 40, overflow: 'visible'}}>
      <path d="M70,60 Q20,0 6,30 Q0,62 70,60 Q120,0 134,30 Q140,62 70,60Z" fill={Y} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    </svg>
    <div style={{position: 'absolute', left: 12, width: 316, top: lines.length > 1 ? 104 : 136, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      {lines.map((l, i) => (
        <div key={i} style={{fontFamily: NOTO, fontWeight: 900, fontSize: Math.min(52, 290 / Math.max(1, Array.from(l).length)), lineHeight: 1.18, position: 'relative', whiteSpace: 'nowrap'}}>
          <span style={{position: 'absolute', left: 0, top: 0, WebkitTextStroke: `12px ${INK}`, color: INK}}>{l}</span>
          <span style={{position: 'relative', color: WHITE}}>{l}</span>
        </div>
      ))}
    </div>
  </div>
);
export const ZoneGifts: React.FC<ZP> = ({f, ev: m, d}) => {
  const fly = (ff: number) => k(ff, m.bird, m.early, EO);
  const p = fly(f);
  const bx = (ff: number) => lerp(2200, 1180, fly(ff));
  const by = (ff: number) => 128 + Math.sin(ff * 0.18) * 12 - (1 - fly(ff)) * 120;
  const sign = f < m.early ? 0 : sp(f, m.early, 9, 220, 0.7);
  const g1 = f < m.box1 ? 0 : sp(f, m.box1, 8, 200, 0.7);
  const g2 = f < m.box2 ? 0 : sp(f, m.box2, 8, 200, 0.7);
  const plus = f < m.box2 + 6 ? 0 : sp(f, m.box2 + 6, 9, 260, 0.6);
  const both = f < m.both ? 0 : sp(f, m.both, 9, 240, 0.7);
  const dbl = f < m.double ? 0 : sp(f, m.double, 8, 210, 0.8);
  const lid1 = Math.max(0, Math.sin(Math.min(Math.PI, (f - m.box1) * 0.2))) * (f >= m.box1 ? 1 : 0);
  const lid2 = Math.max(0, Math.sin(Math.min(Math.PI, (f - m.box2) * 0.2))) * (f >= m.box2 ? 1 : 0);
  const dl: string[] = d.double ?? ['雙重', '優惠！'];
  return (
    <>
      {f >= m.bird - 2 && (
        <Ghosts f={f} on={p < 0.92} step={1.6} render={(ff) => (
          <div style={{position: 'absolute', left: bx(ff) - 130, top: by(ff) - 110}}>
            <Bird f={ff} />
          </div>
        )} />
      )}
      {sign > 0 && (
        <div style={{position: 'absolute', left: bx(f) - 360, top: by(f) + 96, width: 720, transformOrigin: '360px 0px', transform: `scaleY(${sign}) rotate(${Math.sin(f * 0.18 + 1) * 2}deg)`}}>
          <svg width={720} height={60} style={{position: 'absolute', top: -40, left: 0, overflow: 'visible'}}>
            <path d="M250,0 L190,52 M470,0 L530,52" stroke={INK} strokeWidth={5} />
          </svg>
          <div style={{marginTop: 10, background: BLUE, border: `9px solid ${INK}`, borderRadius: 24, boxShadow: `12px 14px 0 ${INK}`, display: 'flex', justifyContent: 'center', padding: '6px 0 14px'}}>
            <Pop size={110} fill={Y} ext={RED}>{d.sign}</Pop>
          </div>
        </div>
      )}
      <At x={1180} y={440} s={both * (1 - k(f, m.double - 2, m.double + 4))}>
        <Pill bg={WHITE} fg={INK} size={44}>{d.both ?? '可同時申請'}</Pill>
      </At>
      <At x={790} y={600} s={g1} r={(1 - g1) * -20}>
        <div style={{position: 'relative'}}>
          <Gift color={RED} lid={lid1} lines={d.a} />
          {d.aBadge && (
            <div style={{position: 'absolute', left: -40, top: -50, transform: 'rotate(-12deg)'}}>
              <Pill bg={Y} fg={INK} size={36} pad="2px 20px">{d.aBadge}</Pill>
            </div>
          )}
        </div>
      </At>
      {d.aNote && (
        <At x={790} y={772} s={g1}>
          <div style={{fontFamily: NOTO, fontWeight: 900, fontSize: 30, color: WHITE, background: 'rgba(20,16,60,0.85)', borderRadius: 999, padding: '2px 22px', whiteSpace: 'nowrap'}}>{d.aNote}</div>
        </At>
      )}
      <At x={1570} y={600} s={g2} r={(1 - g2) * 20}>
        <Gift color={BLUE} lid={lid2} lines={d.b} />
      </At>
      <At x={1180} y={600} s={plus * (1 - k(f, m.double - 2, m.double + 4))}>
        <Pop size={180} font={ANTON} fill={Y} ext={RED}>＋</Pop>
      </At>
      {dbl > 0 && (
        <At x={1180} y={560} s={dbl} r={(1 - dbl) * 40 - 4}>
          <div style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <Burst r={250} n={18} fill={Y} fill2={RED} seed="dbl" rot={(f - m.double) * 0.8} />
            {dl.map((l, i) => <Pop key={i} size={100} fill={Y} ext={INK} stroke={INK} depth={4}>{l}</Pop>)}
            <div style={{position: 'absolute', right: -150, top: -90, transform: 'rotate(14deg)'}}>
              <Pop size={110} font={ANTON} fill={WHITE} ext={BLUE} depth={4}>×2</Pop>
            </div>
          </div>
        </At>
      )}
    </>
  );
};

/* ───────── chips：標題＋打勾膠囊 ───────── */
const CHIP_BG = [Y, GRN, WHITE];
export const ZoneChips: React.FC<ZP> = ({f, ev: m, d}) => {
  const ts = f < m.spTitle ? 0 : sp(f, m.spTitle, 9, 220, 0.7);
  return (
    <>
      <At x={1120} y={200} s={ts} r={-3}>
        <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
          <Pop size={112} fill={WHITE} ext={BLUE}>{d.title}</Pop>
          {d.burst && (
            <div style={{position: 'relative'}}>
              <Burst r={128} n={14} fill={RED} seed="sp" rot={f * 0.5} />
              <Pop size={100} fill={Y} ext={INK} stroke={INK} depth={4}>{d.burst}</Pop>
            </div>
          )}
        </div>
      </At>
      {(d.items as string[]).map((c, j) => {
        const at = m.chips[j];
        if (f < at - 1) return null;
        return (
          <Ghosts key={j} f={f} on={f < at + 8} render={(ff) => {
            const p = k(ff, at, at + 10, EO);
            const s = ff < at ? 0 : sp(ff, at, 8, 240, 0.6);
            return (
              <At x={1200 + (1 - p) * 1100} y={370 + j * 132} r={(1 - p) * 8 + (j - 1) * 1.5} s={0.85 + 0.15 * s}>
                <div style={{display: 'flex', alignItems: 'center', gap: 18, background: CHIP_BG[j], border: `8px solid ${INK}`, borderRadius: 999, padding: '10px 46px 10px 18px', boxShadow: `12px 12px 0 ${INK}`}}>
                  <svg width={74} height={74} style={{flex: 'none'}}>
                    <circle cx={37} cy={37} r={32} fill={RED} stroke={INK} strokeWidth={6} />
                    <path d="M20,38 L33,51 L55,24" stroke={WHITE} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{fontFamily: NOTO, fontWeight: 900, fontSize: 64, color: INK, whiteSpace: 'nowrap'}}>{c}</span>
                </div>
              </At>
            );
          }} />
        );
      })}
    </>
  );
};

/* ───────── countdown：限時倒數（綜藝效果） ───────── */
const DownDigit: React.FC<{cur: number; next: number; p: number}> = ({cur, next, p}) => {
  const cell: React.CSSProperties = {position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center'};
  if (cur === next || p <= 0) return <span style={{display: 'inline-block', width: '0.52em', textAlign: 'center'}}>{cur}</span>;
  return (
    <span style={{position: 'relative', display: 'inline-block', width: '0.52em', height: '1.1em', overflow: 'hidden', verticalAlign: 'top'}}>
      <span style={{...cell, transform: `translateY(${p * 1.05}em)`, opacity: 1 - p}}>{cur}</span>
      <span style={{...cell, transform: `translateY(${(p - 1) * 1.05}em)`, opacity: p}}>{next}</span>
    </span>
  );
};
export const ZoneCount: React.FC<ZP> = ({f, ev: m, d}) => {
  let n = 0;
  for (const t of m.ticks) if (f >= t) n++;
  const lastT = n > 0 ? m.ticks[n - 1] : 0;
  const p = n > 0 ? k(f, lastT, lastT + 5, EO) : 1;
  const [mm, ss] = String(d.from ?? '10:00').split(':').map(Number);
  const S0 = mm * 60 + ss + 1;
  const cur = Math.max(0, S0 - n + 1), nxt = Math.max(0, S0 - n);
  const digs = (s: number) => [Math.floor(s / 600) % 10, Math.floor(s / 60) % 10, Math.floor((s % 60) / 10), s % 10];
  const a = digs(cur), b = digs(nxt);
  const act = f < m.act ? 0 : sp(f, m.act, 9, 220, 0.7);
  const ringR = Math.sin(f * 1.9) * (f % 26 < 10 ? 10 : 0);
  return (
    <>
      <At x={1200} y={150} r={-3}>
        <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
          <svg width={130} height={130} viewBox="-65 -65 130 130" style={{transform: `rotate(${ringR}deg)`}}>
            <circle cx={-36} cy={-44} r={18} fill={Y} stroke={INK} strokeWidth={5} />
            <circle cx={36} cy={-44} r={18} fill={Y} stroke={INK} strokeWidth={5} />
            <circle cx={0} cy={6} r={52} fill={RED} stroke={INK} strokeWidth={7} />
            <circle cx={0} cy={6} r={38} fill={WHITE} stroke={INK} strokeWidth={4} />
            <path d={`M0,6 L0,-22 M0,6 L${Math.cos(f * 0.5) * 22},${6 + Math.sin(f * 0.5) * 22}`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
          </svg>
          <Pop size={118} fill={Y} ext={RED}>{d.title ?? '限時倒數'}</Pop>
        </div>
      </At>
      <At x={1200} y={430}>
        <div style={{position: 'relative', width: 860, height: 300, background: '#13206e', border: `10px solid ${INK}`, borderRadius: 40, boxShadow: `16px 18px 0 ${INK}`, overflow: 'hidden'}}>
          <div style={{position: 'absolute', inset: 14, border: `6px solid ${RED}`, borderRadius: 28}} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 6, textAlign: 'center', fontFamily: ANTON, fontSize: 240, lineHeight: 1.1, color: '#ff4040', letterSpacing: 6}}>
            <DownDigit cur={a[0]} next={b[0]} p={p} />
            <DownDigit cur={a[1]} next={b[1]} p={p} />
            <span style={{display: 'inline-block', width: '0.32em', color: Y}}>:</span>
            <DownDigit cur={a[2]} next={b[2]} p={p} />
            <DownDigit cur={a[3]} next={b[3]} p={p} />
          </div>
        </div>
      </At>
      <At x={1200} y={680} s={act} r={-4}>
        <div style={{position: 'relative', padding: '8px 56px', background: RED, border: `9px solid ${INK}`, borderRadius: 18, boxShadow: `12px 14px 0 ${INK}`}}>
          <Pop size={92} fill={Y} ext={INK} stroke={INK} depth={4}>{d.action}</Pop>
        </div>
      </At>
    </>
  );
};

/* ───────── call：立即撥打 → 收尾大貼圖 ───────── */
const Phone: React.FC<{f: number; ring: boolean}> = ({f, ring}) => {
  const j = ring ? Math.sin(f * 2.4) : 0;
  const hop = ring ? Math.abs(Math.sin(f * 1.2)) * 26 : 0;
  return (
    <svg width={320} height={300} viewBox="-160 -150 320 300" style={{overflow: 'visible', display: 'block', transform: `rotate(${j * 5}deg)`}}>
      {ring && [0, 1, 2].map((i) => (
        <g key={i} opacity={0.5 + 0.5 * Math.sin(f * 0.9 - i)}>
          <path d={`M${-150 - i * 26},${-70 - i * 16} Q${-176 - i * 30},0 ${-150 - i * 26},${70 + i * 16}`} stroke={Y} strokeWidth={9} fill="none" strokeLinecap="round" />
          <path d={`M${150 + i * 26},${-70 - i * 16} Q${176 + i * 30},0 ${150 + i * 26},${70 + i * 16}`} stroke={Y} strokeWidth={9} fill="none" strokeLinecap="round" />
        </g>
      ))}
      <path d="M-120,130 L-90,-10 L90,-10 L120,130Z" fill={RED} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <circle cx={0} cy={60} r={52} fill={WHITE} stroke={INK} strokeWidth={6} />
      {Array.from({length: 8}, (_, i) => (
        <circle key={i} cx={Math.cos(i * 0.72 - 2.4) * 34} cy={60 + Math.sin(i * 0.72 - 2.4) * 34} r={7} fill={INK} />
      ))}
      <g transform={`translate(0,${-hop}) rotate(${j * 8})`}>
        <path d="M-130,-40 Q-140,-100 -80,-100 L80,-100 Q140,-100 130,-40 L90,-40 Q86,-66 60,-66 L-60,-66 Q-86,-66 -90,-40Z" fill={RED} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      </g>
    </svg>
  );
};
export const ZoneCall: React.FC<ZP & {end: number; endD: any}> = ({f, ev: m, d, end, endD}) => {
  const out = k(f, end - 8, end + 2, EI);
  const call = f < m.call ? 0 : sp(f, m.call, 9, 220, 0.7);
  const web = f < m.web ? 0 : sp(f, m.web, 9, 220, 0.7);
  const ring = (f >= m.start && f < m.start + 40) || (f >= m.start + 52 && f < m.start + 92);
  const num = String(d.number);
  const numSize = fitTo(num, 168, 1060);
  const endS = f < end ? 0 : sp(f, end, 9, 170, 0.9);
  const e = f - end;
  const lines: string[] = endD.lines;
  return (
    <>
      {out < 1 && (
        <div style={{position: 'absolute', inset: 0, transform: `scale(${1 - out * 0.6})`, transformOrigin: '1180px 420px', opacity: 1 - out}}>
          <div style={{position: 'absolute', left: 530, top: 300}}>
            <Phone f={f} ring={ring} />
          </div>
          <At x={1320} y={150} s={call} r={-4}>
            <Pop size={130} fill={Y} ext={RED}>{d.call ?? '立即撥打！'}</Pop>
          </At>
          {d.pill && (
            <At x={1320} y={290} s={call}>
              <Pill bg={BLUE} size={46}>{d.pill}</Pill>
            </At>
          )}
          <div style={{position: 'absolute', left: 1370, top: 440, transform: 'translate(-50%,-50%)', display: 'flex'}}>
            {num.split('').map((c, i) => {
              const at = m.num + i * 2;
              const s = f < at ? 0 : sp(f, at, 8, 260, 0.6);
              return (
                <div key={i} style={{transform: `translateY(${(1 - s) * -90}px) scale(${0.4 + 0.6 * s})`, opacity: Math.min(1, s * 1.4)}}>
                  <Pop size={numSize} font={ANTON} fill={Y} ext={RED} depth={6} skew={7} sw={12}>{c}</Pop>
                </div>
              );
            })}
          </div>
          {d.web && (
            <At x={1320} y={620} s={web} r={-2}>
              <Pop size={fitTo(d.web, 76, 1000)} font={ANTON} fill={WHITE} ext={BLUE} depth={4} skew={6} sw={9}>{d.web}</Pop>
            </At>
          )}
        </div>
      )}
      {endS > 0 && (
        <At x={1180} y={410} s={endS} r={(1 - endS) * -40}>
          <div style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <Burst r={400} n={22} fill={RED} fill2={Y} seed="end" rot={e * 0.35} sw={12} />
            {lines.map((l, i) => (
              <Pop key={i} size={Math.min(150, 1300 / Math.max(1, Array.from(l).length))} fill={i ? BLUE : RED} ext={INK} stroke={WHITE} depth={6} sw={13}>{l}</Pop>
            ))}
          </div>
        </At>
      )}
      <At x={1180} y={735} s={f < end + 10 ? 0 : sp(f, end + 10, 9, 220, 0.7)} r={-2}>
        <div style={{position: 'relative', padding: '8px 70px', background: BLUE, border: `9px solid ${INK}`, borderRadius: 18, boxShadow: `12px 14px 0 ${INK}`}}>
          <Pop size={Math.min(78, 1000 / Math.max(1, Array.from(String(endD.name)).length))} fill={WHITE} ext={INK} stroke={INK} depth={3}>{endD.name}</Pop>
        </div>
      </At>
      {endS > 0 && [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Sparkle key={i} x={1180 + Math.cos(i * 0.785) * 520} y={410 + Math.sin(i * 0.785) * 360} s={Math.max(0, Math.sin((e - i * 3) * 0.2))} c={i % 2 ? Y : WHITE} />
      ))}
    </>
  );
};

/* 撒彩紙、錢幣雨、金色彩帶（畫面座標） */
export const Confetti: React.FC<{f: number; at: number; cx: number; cy: number; n: number; seed: string}> = ({f, at, cx, cy, n, seed}) => {
  const t = f - at;
  if (at === undefined || t < 0 || t > 90) return null;
  const cols = [Y, RED, BLUE, GRN, GOLD, WHITE];
  return (
    <>
      {Array.from({length: n}, (_, i) => {
        const vx = rnd(seed + 'x' + i) * 26;
        const vy = -10 - rnd01(seed + 'y' + i) * 26;
        const x = cx + vx * t * 0.96 ** t;
        const y = cy + vy * t + 0.55 * t * t * 0.9;
        const rot = t * (8 + rnd(seed + 'r' + i) * 14);
        const o = 1 - Math.max(0, (t - 70) / 20);
        if (y > 900) return null;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: 22, height: 12, background: cols[i % cols.length], border: `2px solid ${INK}`, transform: `rotate(${rot}deg) scaleY(${Math.cos(rot * 0.05)})`, opacity: o}} />;
      })}
    </>
  );
};
export const CoinRain: React.FC<{f: number; at: number; n: number}> = ({f, at, n}) => {
  const t = f - at;
  if (at === undefined || t < 0 || t > 80) return null;
  return (
    <>
      {Array.from({length: n}, (_, i) => {
        const x = 640 + rnd01('cx' + i) * 1240;
        const y = -80 - rnd01('cy' + i) * 360 + t * (16 + rnd01('cv' + i) * 10);
        if (y > 860 || y < -80) return null;
        const sx = Math.cos(t * 0.3 + i);
        return (
          <div key={i} style={{position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: '50%', background: GOLD, border: `6px solid ${INK}`, transform: `scaleX(${0.25 + 0.75 * Math.abs(sx)})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ANTON, fontSize: 34, color: '#b86b00'}}>
            $
          </div>
        );
      })}
    </>
  );
};
export const Streamers: React.FC<{f: number; at: number}> = ({f, at}) => {
  const t = f - at;
  if (t < 0) return null;
  return (
    <svg width={1920} height={900} style={{position: 'absolute', left: 0, top: 0, overflow: 'hidden'}}>
      {Array.from({length: 18}, (_, i) => {
        const x0 = 560 + (i / 17) * 1340 + rnd('sx' + i) * 40;
        const y0 = -260 + t * (7 + rnd01('sv' + i) * 5) - rnd01('sd' + i) * 200;
        let dd = `M${x0},${y0}`;
        for (let s = 1; s <= 10; s++) dd += ` L${(x0 + Math.sin(s * 0.9 + t * 0.25 + i) * 22).toFixed(1)},${(y0 + s * 24).toFixed(1)}`;
        return <path key={i} d={dd} stroke={i % 3 === 0 ? RED : GOLD} strokeWidth={12} fill="none" strokeLinecap="round" />;
      })}
    </svg>
  );
};
