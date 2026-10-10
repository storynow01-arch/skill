/* 廣L 後半：產品線卡片軌道 → 指標牆（暗場）→ 功能區塊 → CTA */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {EIO, EO, Roller, k, lerp} from './kit';
import {AFTER_METRICS, AFTER_RAIL, Arrow, C, CharsUp, Cursor, D, GE, Ghosted, MK, TC, Tag, punch, shotX} from './theme';

/* ───── E：產品線卡片軌道（一張一張停在游標下） ───── */
const CARD_W = 470;
const PITCH = 500;
const X0 = 1000 - CARD_W / 2; // 第一張卡的中心對準 x=1000（游標所在）
const railX = (f: number) => {
  const rail = MK.rail as number;
  const focus = MK.focus as number[];
  let x = X0 - (f - rail) * 0.6;
  for (const at of focus.slice(1)) x -= PITCH * k(f, at - 6, at + 6, EIO);
  return x + (1 - k(f, rail, rail + 10)) * 600 - k(f, AFTER_RAIL - 6, AFTER_RAIL, (u) => u * u * u) * 500;
};
export const SceneRail: React.FC<{f: number}> = ({f}) => {
  const R = D.cards;
  const rail = MK.rail as number;
  const x = railX(f);
  const v = x - railX(f - 1);
  const head = k(f, rail + 2, rail + 12);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 120, top: 120, opacity: head, transform: `translateX(${(1 - head) * 120}px)`}}>
        <Tag>{`${R.tag}　·　× ${R.items.length}`}</Tag>
        {(R.title || R.titleEm) && (
          <div style={{fontFamily: TC, fontWeight: 300, fontSize: R.titleSize, color: C.ink, marginTop: 10, whiteSpace: 'nowrap'}}>
            {R.title}
            <span style={{fontWeight: 500}}>{R.titleEm}</span>
          </div>
        )}
      </div>
      <Ghosted x={x} v={Math.abs(v) > 50 ? v * 0.6 : 0}>
        <div style={{position: 'absolute', left: 0, top: 330, height: 530}}>
          {R.items.map((p, i) => {
            const cx = x + i * PITCH + CARD_W / 2;
            const h = Math.max(0, 1 - Math.abs(cx - 1000) / 320);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute', left: i * PITCH, top: -h * 16, width: CARD_W, height: 520, borderRadius: 28, boxSizing: 'border-box',
                  background: `rgba(255,255,255,${0.62 + h * 0.3})`, border: `${1.5 + h * 1.5}px solid ${h > 0.3 ? C.brand : C.line2}`,
                  padding: '34px 36px', display: 'flex', flexDirection: 'column',
                  boxShadow: `0 ${20 + h * 30}px 60px rgba(13,14,18,${0.05 + h * 0.08})`,
                }}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 46}}>
                  <div style={{fontFamily: GE, fontWeight: 500, fontSize: 32, color: C.ink}}>{String(i + 1).padStart(2, '0')}</div>
                  {p.tag && (
                    <div style={{fontFamily: TC, fontWeight: 500, fontSize: 28, color: h > 0.3 ? C.brand : C.gray, border: `1.5px solid ${h > 0.3 ? C.brand : C.line2}`, borderRadius: 30, padding: '4px 18px', whiteSpace: 'nowrap'}}>
                      {p.tag}
                    </div>
                  )}
                </div>
                <div style={{fontFamily: TC, fontWeight: 500, fontSize: p.size, color: C.ink, marginTop: 70, whiteSpace: 'nowrap'}}>{p.name}</div>
                {p.en && <div style={{fontFamily: GE, fontWeight: 400, fontSize: 28, letterSpacing: '0.06em', color: C.gray, marginTop: 8, lineHeight: 1.2, whiteSpace: 'nowrap'}}>{p.en}</div>}
                <div style={{fontFamily: TC, fontWeight: 300, fontSize: 34, color: C.ink, marginTop: 'auto', lineHeight: 1.35, whiteSpace: 'pre-line'}}>{p.desc}</div>
                {p.hook && (
                  <>
                    <div style={{height: 1.5, background: C.line2, margin: '22px 0 18px'}} />
                    <div style={{fontFamily: TC, fontWeight: 500, fontSize: 32, color: C.brand, whiteSpace: 'nowrap'}}>{p.hook}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Ghosted>
      <Cursor x={1100 + Math.sin((f - rail) / 14) * 30} y={560 + Math.cos((f - rail) / 18) * 20} />
    </AbsoluteFill>
  );
};

/* ───── F：指標牆（暗場，鏡頭往下捲） ───── */
const Ring: React.FC<{p: number}> = ({p}) => {
  const r = 230, cx = 260, cy = 260;
  const a = -Math.PI / 2 + p * Math.PI * 2;
  const L = 2 * Math.PI * r;
  return (
    <svg width="520" height="520" style={{overflow: 'visible'}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
      {Array.from({length: 40}, (_, i) => {
        const b = (i / 40) * Math.PI * 2;
        return <line key={i} x1={cx + Math.cos(b) * (r - 24)} y1={cy + Math.sin(b) * (r - 24)} x2={cx + Math.cos(b) * (r - 14)} y2={cy + Math.sin(b) * (r - 14)} stroke="rgba(255,255,255,0.18)" strokeWidth="2" />;
      })}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.brandLt} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${L * p} ${L}`} transform={`rotate(-90 ${cx} ${cy})`} />
      <circle cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r="40" fill="url(#adLglow)" />
      <circle cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r="13" fill="#fff" />
      <defs>
        <radialGradient id="adLglow">
          <stop offset="0" stopColor={C.brandLt} stopOpacity="0.8" />
          <stop offset="1" stopColor={C.brandLt} stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};
const big: React.CSSProperties = {fontFamily: GE, fontWeight: 300, color: C.white, lineHeight: 1, letterSpacing: '-0.03em', whiteSpace: 'nowrap'};
const camY = (f: number) => {
  let y = 0;
  for (const m of (MK.m as number[]).slice(1)) y -= 1080 * k(f, m - 7, m + 7, EIO);
  return y;
};
export const SceneMetrics: React.FC<{f: number}> = ({f}) => {
  const ms = MK.m as number[];
  const zeros = MK.zero as (number | null)[];
  const locks = MK.locks as number[][];
  const items = D.metrics.items;
  const y = camY(f);
  const vy = y - camY(f - 1);
  const sx = (g: number) => shotX(g, ms[0], AFTER_METRICS, 9, 6);
  const xin = sx(f);
  const v = xin - sx(f - 1);
  const s = punch(f, [ms[0], ...(zeros.filter((z) => z !== null) as number[])], 0.05, 10);
  let idx = 0;
  ms.forEach((m, i) => {
    if (f >= m - 7) idx = i;
  });
  const N = items.length;
  return (
    <AbsoluteFill style={{transform: `scale(${s})`}}>
      <div style={{position: 'absolute', left: 120, top: 100, display: 'flex', gap: 40, transform: `translateX(${xin}px)`}}>
        <Tag color="rgba(255,255,255,0.6)">{D.metrics.tag}</Tag>
        <Tag color={C.brandLt}>{`0${idx + 1} / 0${N}`}</Tag>
      </div>
      <Ghosted x={xin} v={v} y={y} vy={vy}>
        {items.map((m, i) => {
          const m0 = ms[i];
          const L = locks[i];
          if (m.kind === 'swap') {
            const z = zeros[i] as number;
            const zp = k(f, z, z + 9);
            const strike = k(f, z - 8, z - 1);
            return (
              <AbsoluteFill key={i} style={{transform: `translateY(${1080 * i}px)`}}>
                <div style={{position: 'absolute', left: 150, top: 220}}>
                  <Tag color={C.brandLt}>{m.tag}</Tag>
                  <div style={{position: 'relative', marginTop: 40, display: 'inline-block', transform: `translateY(${zp * 30}px)`, opacity: 1 - zp * 0.6}}>
                    <div style={{...big, fontSize: m.fromSize, color: 'rgba(255,255,255,0.85)'}}>
                      <Roller value={m.from} t={f} start={m0 + 2} lock={L} cw={0.6} />
                    </div>
                    <div style={{position: 'absolute', left: -20, top: '52%', height: 10, borderRadius: 5, width: `calc(${strike * 100}% + 40px)`, background: C.brandLt}} />
                  </div>
                  {m.label && <div style={{fontFamily: TC, fontWeight: 300, fontSize: m.labelSize, color: C.white, marginTop: 70, whiteSpace: 'nowrap'}}>{m.label}</div>}
                  {m.note && <div style={{fontFamily: TC, fontWeight: 300, fontSize: m.noteSize, color: 'rgba(255,255,255,0.62)', marginTop: 16, whiteSpace: 'nowrap'}}>{m.note}</div>}
                </div>
                <div style={{position: 'absolute', left: 1180, top: 540 - m.size * 0.66, display: 'flex', alignItems: 'flex-end', opacity: Math.min(1, zp * 2), transform: `scale(${lerp(1.6, 1, zp)})`, transformOrigin: '30% 70%'}}>
                  <div style={{...big, fontSize: m.size, color: C.brandLt}}>{m.value}</div>
                  {m.unit && <div style={{fontFamily: GE, fontWeight: 300, fontSize: m.size * 0.2, color: C.white, marginBottom: m.size * 0.11, marginLeft: 16, whiteSpace: 'nowrap'}}>{m.unit}</div>}
                </div>
              </AbsoluteFill>
            );
          }
          const ringP = k(f, m0 + 2, L[L.length - 1], EO) * m.pct;
          return (
            <AbsoluteFill key={i} style={{transform: `translateY(${1080 * i}px)`}}>
              <div style={{position: 'absolute', left: 150, top: 220}}>
                <Tag color={C.brandLt}>{m.tag}</Tag>
                <div style={{display: 'flex', alignItems: 'flex-end', marginTop: 20}}>
                  {m.prefix && <div style={{fontFamily: TC, fontWeight: 300, fontSize: 64, color: C.white, marginBottom: m.size * 0.13, marginRight: 20, whiteSpace: 'nowrap'}}>{m.prefix}</div>}
                  <div style={{...big, fontSize: m.size}}>
                    <Roller value={m.value} t={f} start={m0 + 2} lock={L} cw={0.6} />
                  </div>
                  {m.unit && (
                    <div style={{fontFamily: GE, fontWeight: 300, fontSize: m.size * 0.4, color: C.brandLt, marginBottom: m.size * 0.08, marginLeft: 10, whiteSpace: 'nowrap'}}>{m.unit}</div>
                  )}
                </div>
                {m.label && <div style={{fontFamily: TC, fontWeight: 300, fontSize: m.labelSize, color: C.white, marginTop: 10, whiteSpace: 'nowrap'}}>{m.label}</div>}
                {m.note && <div style={{fontFamily: TC, fontWeight: 300, fontSize: m.noteSize, color: 'rgba(255,255,255,0.62)', marginTop: 16, whiteSpace: 'nowrap'}}>{m.note}</div>}
              </div>
              <div style={{position: 'absolute', left: 1180, top: 250}}>
                <Ring p={ringP} />
              </div>
            </AbsoluteFill>
          );
        })}
      </Ghosted>
    </AbsoluteFill>
  );
};

/* ───── G：功能區塊（每個功能一個畫面，鏡頭往左甩） ───── */
const featCam = (f: number) => {
  const fs = MK.f as number[];
  let x = shotX(f, fs[0], MK.cta, 9, 6);
  for (const at of fs.slice(1)) x -= 1920 * k(f, at - 5, at + 6, EIO);
  return x;
};
const Chip: React.FC<{t: number; icon: string}> = ({t, icon}) => (
  <svg width="600" height="460" viewBox="0 0 600 460">
    {[0, 1, 2, 3, 4].map((i) => {
      const w = [300, 220, 360, 180, 260][i] * k(t, 3 + i * 2, 12 + i * 2);
      return <rect key={i} x={40} y={50 + i * 40} width={w} height={14} rx={7} fill={i === 2 ? C.brand : 'rgba(13,14,18,0.16)'} />;
    })}
    <g transform="translate(410 270)">
      <rect x={-90} y={-90} width={180} height={180} rx={18} fill={C.ink} />
      <rect x={-50} y={-50} width={100} height={100} rx={8} fill="none" stroke={C.brandLt} strokeWidth={3} />
      {Array.from({length: 6}, (_, i) => {
        const o = -75 + i * 30;
        const p = k(t, 6 + i, 14 + i);
        return (
          <g key={i} stroke={C.ink} strokeWidth={4}>
            <line x1={o} y1={-90} x2={o} y2={-90 - 30 * p} />
            <line x1={o} y1={90} x2={o} y2={90 + 30 * p} />
            <line x1={-90} y1={o} x2={-90 - 30 * p} y2={o} />
            <line x1={90} y1={o} x2={90 + 30 * p} y2={o} />
          </g>
        );
      })}
      <text x={0} y={12} textAnchor="middle" fontFamily={GE} fontWeight={500} fontSize={34} fill="#fff">{icon}</text>
    </g>
  </svg>
);
const Route: React.FC<{t: number; labels: string[]}> = ({t, labels}) => {
  const p = k(t, 2, 22, EO);
  const P0 = [90, 380], P1 = [300, 40], P2 = [510, 150];
  const q = (u: number) => [
    (1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0],
    (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1],
  ];
  const d = `M${P0[0]},${P0[1]} Q${P1[0]},${P1[1]} ${P2[0]},${P2[1]}`;
  const [dx, dy] = q(p);
  return (
    <svg width="600" height="460" viewBox="0 0 600 460">
      <path d={d} fill="none" stroke="rgba(13,14,18,0.15)" strokeWidth={3} strokeDasharray="6 10" />
      <path d={d} fill="none" stroke={C.brand} strokeWidth={4} pathLength={1} strokeDasharray={`${p} 1`} />
      <circle cx={P0[0]} cy={P0[1]} r={10} fill={C.ink} />
      <circle cx={P2[0]} cy={P2[1]} r={10} fill={p > 0.97 ? C.brand : 'rgba(13,14,18,0.3)'} />
      <circle cx={dx} cy={dy} r={16} fill={C.brand} />
      {labels[0] && <text x={P0[0]} y={P0[1] + 56} textAnchor="middle" fontFamily={TC} fontWeight={500} fontSize={32} fill={C.ink}>{labels[0]}</text>}
      {labels[1] && <text x={P2[0]} y={P2[1] + 56} textAnchor="middle" fontFamily={TC} fontWeight={500} fontSize={32} fill={C.ink}>{labels[1]}</text>}
    </svg>
  );
};
const Cube: React.FC<{t: number; f: number}> = ({t, f}) => {
  const a = f * 0.05, b = 0.55;
  const V = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z])));
  const P = V.map(([x, y, z]) => {
    const x1 = x * Math.cos(a) - z * Math.sin(a);
    const z1 = x * Math.sin(a) + z * Math.cos(a);
    const y1 = y * Math.cos(b) - z1 * Math.sin(b);
    return [300 + x1 * 120, 220 + y1 * 120];
  });
  const E: [number, number][] = [];
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if ([0, 1, 2].filter((d) => V[i][d] !== V[j][d]).length === 1) E.push([i, j]);
  const layers = Math.floor(k(t, 2, 20) * 8);
  return (
    <svg width="600" height="460" viewBox="0 0 600 460">
      {Array.from({length: 8}, (_, i) => (
        <rect key={i} x={150} y={410 - i * 12} width={300} height={6} rx={3} fill={i < layers ? C.brand : 'rgba(13,14,18,0.1)'} />
      ))}
      {E.map(([i, j], n) => (
        <line key={n} x1={P[i][0]} y1={P[i][1]} x2={P[j][0]} y2={P[j][1]} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      ))}
      {P.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={6} fill={C.brand} />)}
    </svg>
  );
};
const Check: React.FC<{t: number; tag: string; items: string[]}> = ({t, tag, items}) => (
  <div style={{width: 560, padding: '40px 44px', borderRadius: 24, background: '#fff', border: `1.5px solid ${C.line2}`, boxSizing: 'border-box'}}>
    {tag && <Tag>{tag}</Tag>}
    {(items.length ? items : ['', '']).map((s, i) => {
      const p = k(t, 4 + i * 6, 12 + i * 6);
      return (
        <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 38, fontFamily: TC, fontWeight: 500, fontSize: 40, color: C.ink, whiteSpace: 'nowrap'}}>
          {s ? <span>{s}</span> : <div style={{width: 300 * p, height: 14, borderRadius: 7, background: 'rgba(13,14,18,0.16)'}} />}
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx={28} cy={28} r={26} fill={p > 0 ? C.brand : 'none'} stroke={C.brand} strokeWidth={2} opacity={0.2 + p * 0.8} />
            <path d="M16 29 L25 38 L41 19" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p} 1`} />
          </svg>
        </div>
      );
    })}
  </div>
);
export const SceneFeatures: React.FC<{f: number}> = ({f}) => {
  const fs = MK.f as number[];
  const x = featCam(f);
  const v = x - featCam(f - 1);
  return (
    <Ghosted x={x} v={v}>
      {D.features.items.map((ft, i) => {
        const t = f - fs[i];
        const end = (i + 1 < fs.length ? fs[i + 1] : MK.cta) - fs[i];
        if (t < -10 || t > end + 12) return null;
        return (
          <AbsoluteFill key={i} style={{left: i * 1920, width: 1920}}>
            <div style={{position: 'absolute', left: 150, top: 300, width: 900}}>
              <Tag>
                <span style={{color: C.brand}}>{`${D.features.label} 0${i + 1}`}</span>
                {ft.tag ? `　·　${ft.tag}` : ''}
              </Tag>
              <div style={{fontFamily: TC, fontWeight: 500, fontSize: ft.titleSize, color: C.ink, marginTop: 26, lineHeight: 1.15, whiteSpace: 'nowrap'}}>{ft.title}</div>
              {ft.sub && <div style={{fontFamily: TC, fontWeight: 300, fontSize: ft.subSize, color: C.gray, marginTop: 26, whiteSpace: 'nowrap'}}>{ft.sub}</div>}
            </div>
            <div
              style={{
                position: 'absolute', left: 1110, top: 230, width: 680, height: 580, borderRadius: 32, background: 'rgba(255,255,255,0.7)',
                border: `1.5px solid ${C.line2}`, boxShadow: '0 30px 80px rgba(13,14,18,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{position: 'absolute', left: 28, top: 22, display: 'flex', gap: 10}}>
                {[0, 1, 2].map((d) => <div key={d} style={{width: 14, height: 14, borderRadius: 7, background: 'rgba(13,14,18,0.14)'}} />)}
              </div>
              {ft.vis === 'chip' && <Chip t={t} icon={ft.icon} />}
              {ft.vis === 'route' && <Route t={t} labels={ft.route} />}
              {ft.vis === 'cube' && <Cube t={t} f={f} />}
              {ft.vis === 'check' && <Check t={t} tag={ft.tag} items={ft.checks} />}
            </div>
          </AbsoluteFill>
        );
      })}
    </Ghosted>
  );
};

/* ───── H：CTA ───── */
export const SceneCTA: React.FC<{f: number}> = ({f}) => {
  const A = D.cta;
  const cta = MK.cta, click = MK.click;
  const t = f - cta;
  const sx = (g: number) => shotX(g, cta, 99999, 10, 1);
  const xin = sx(f);
  const v = xin - sx(f - 1);
  const s = punch(f, [cta, click], 0.04, 10) * lerp(1.0, 1.03, k(f, cta, MK.end, (u) => u));
  const btn = k(f, cta + 10, cta + 20);
  const press = k(f, click, click + 3) * (1 - k(f, click + 4, click + 10));
  const clicked = f >= click;
  const cp = k(f, cta + 12, click - 2, EO);
  const cx = lerp(1700, 1010, cp), cy = lerp(800, 735, cp);
  const rip = k(f, click, click + 22);
  const url = k(f, MK.url, MK.url + 10);
  const nameTop = 250 + (190 - A.nameSize) * 0.5;
  return (
    <Ghosted x={xin} v={v}>
      <AbsoluteFill style={{transform: `scale(${s})`}}>
        <AbsoluteFill style={{background: `radial-gradient(circle at 50% 46%, rgba(43,75,255,${0.16 * k(t, 0, 20)}) 0%, rgba(43,75,255,0) 45%)`}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 180, display: 'flex', justifyContent: 'center'}}>
          <Tag>
            <span style={{color: C.brand}}>●</span>　{D.brand.mark}
            {D.brand.name ? `　/　${D.brand.name}` : ''}
          </Tag>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: nameTop, display: 'flex', justifyContent: 'center'}}>
          <CharsUp text={A.name} f={f} at={cta} stagger={2} style={{fontFamily: TC, fontWeight: 500, fontSize: A.nameSize, color: C.ink, letterSpacing: '0.02em'}} />
        </div>
        {A.slogan && (
          <div style={{position: 'absolute', left: 0, right: 0, top: 500, display: 'flex', justifyContent: 'center'}}>
            <CharsUp text={A.slogan} f={f} at={cta + 6} stagger={1} style={{fontFamily: TC, fontWeight: 300, fontSize: A.sloganSize, color: C.gray, letterSpacing: '0.08em'}} />
          </div>
        )}
        <div style={{position: 'absolute', left: 0, right: 0, top: 650, display: 'flex', justifyContent: 'center', opacity: btn}}>
          <div style={{position: 'relative', transform: `translateY(${(1 - btn) * 30}px) scale(${1 - press * 0.06})`}}>
            <div
              style={{
                position: 'absolute', inset: 0, borderRadius: 60, border: `2px solid ${C.brand}`,
                transform: `scale(${1 + rip * 0.35}, ${1 + rip * 0.8})`, opacity: clicked ? 1 - rip : 0,
              }}
            />
            <div
              style={{
                height: 116, padding: '0 64px', borderRadius: 60, background: clicked ? C.brand : C.ink, color: '#fff', display: 'flex', alignItems: 'center', gap: 26,
                fontFamily: TC, fontWeight: 500, fontSize: A.buttonSize, letterSpacing: '0.06em', whiteSpace: 'nowrap',
              }}
            >
              {A.button}
              <div style={{transform: `translateX(${clicked ? k(f, click, click + 8) * 8 : 0}px)`}}>
                <Arrow dir="right" size={A.buttonSize} color="#fff" stroke={1.6} />
              </div>
            </div>
          </div>
        </div>
        {A.url && (
          <div style={{position: 'absolute', left: 0, right: 0, top: 808, display: 'flex', justifyContent: 'center', opacity: url, transform: `translateY(${(1 - url) * 16}px)`}}>
            <div style={{fontFamily: GE, fontWeight: 400, fontSize: A.urlSize, color: C.ink, letterSpacing: '0.04em', whiteSpace: 'nowrap'}}>{A.url}</div>
          </div>
        )}
        {f >= cta + 12 && <Cursor x={cx} y={cy} press={press} />}
      </AbsoluteFill>
    </Ghosted>
  );
};
