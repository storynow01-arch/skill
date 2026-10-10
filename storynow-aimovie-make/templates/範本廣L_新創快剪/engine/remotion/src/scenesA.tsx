/* 廣L 前半：輸入框打字 → Hero 價值主張 → build-up 一拍一個硬切 → 鑽進游標點 → DROP（a ＋ b ＋ c） */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {EO, k, lerp} from './kit';
import T from './timeline.json';
import {AFTER_DROP, Arrow, C, CharsUp, D, GE, Ghosted, MK, TC, Tag, punch, shotX} from './theme';

const BR = D.brand;
const BrandTag: React.FC<{sep?: string; color?: string; dot?: boolean}> = ({sep = '/', color, dot = true}) => (
  <Tag color={color}>
    {dot && <span style={{color: C.brand}}>●　</span>}
    {BR.mark}
    {BR.name ? `　${sep}　${BR.name}` : ''}
  </Tag>
);

/* ───── A：輸入框 ───── */
export const SceneInput: React.FC<{f: number}> = ({f}) => {
  const I = D.input;
  const typeAt = T.typeAt;
  const typed = typeAt.filter((t) => t <= f).length;
  const text = Array.from(I.prompt).slice(0, typed).join('');
  const typing = f >= typeAt[0] && f < typeAt[typeAt.length - 1] + 6;
  const caretOn = typing || Math.floor(f / 8) % 2 === 0;
  const pressed = k(f, MK.enter, MK.enter + 3) * (1 - k(f, MK.enter + 3, MK.enter + 9));
  const sent = f >= MK.enter;
  const appear = k(f, 0, 14);
  const s = lerp(0.94, 1.04, k(f, 0, MK.enter, (x) => x));
  const up = (g: number) => k(g, MK.enter + 1, MK.enter + 10, (x) => x * x * x);
  const y = -up(f) * 700;
  const vy = -700 * (up(f) - up(f - 1));
  return (
    <Ghosted x={0} v={0} y={y} vy={vy}>
      <AbsoluteFill style={{transform: `scale(${s})`, alignItems: 'center', justifyContent: 'center', opacity: appear}}>
        <div style={{position: 'relative', width: 1240, transform: `translateY(${(1 - appear) * 40}px)`}}>
          <div style={{marginBottom: 34, marginLeft: 8}}>
            <BrandTag />
          </div>
          <div
            style={{
              height: 136, borderRadius: 68, background: 'rgba(255,255,255,0.82)', border: `1.5px solid ${C.line2}`,
              boxShadow: '0 30px 80px rgba(13,14,18,0.09), 0 2px 0 rgba(255,255,255,0.9) inset',
              display: 'flex', alignItems: 'center', padding: '0 26px 0 52px',
            }}
          >
            <div style={{flex: 1, fontFamily: TC, fontWeight: 300, fontSize: I.size, color: C.ink, display: 'flex', alignItems: 'center', letterSpacing: '0.02em', whiteSpace: 'pre'}}>
              {text.length === 0 && I.placeholder && <span style={{color: '#A3A6AE'}}>{I.placeholder}</span>}
              <span>{text}</span>
              <span style={{display: 'inline-block', width: 4, height: I.size * 1.14, background: C.brand, marginLeft: 6, opacity: caretOn && !sent ? 1 : 0}} />
            </div>
            <div
              style={{
                width: 88, height: 88, borderRadius: 44, background: sent ? C.brand : C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: `scale(${1 - pressed * 0.14})`,
              }}
            >
              <Arrow dir="up" size={44} color="#fff" />
            </div>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 30, padding: '0 12px'}}>
            <Tag>{I.hint}</Tag>
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <Tag>{I.enter}</Tag>
              <Arrow dir="enter" size={30} color={C.gray} />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Ghosted>
  );
};

/* ───── B：Hero ───── */
export const SceneHero: React.FC<{f: number}> = ({f}) => {
  const H = D.hero;
  const S = H.size;
  const t0 = MK.enter + 10;
  const pin = k(f, t0, t0 + 12);
  const y = (1 - pin) * 320;
  const vy = (k(f, t0, t0 + 12) - k(f - 1, t0, t0 + 12)) * -320;
  const s = lerp(1, 1.06, k(f, t0, MK.b[0], (x) => x));
  const dx = -k(f, t0, MK.b[0], (x) => x) * 40;
  const n = H.lines.length;
  const lh = S * 1.14;
  const top0 = Math.round(540 - (n * lh + 120) / 2 + 30);
  const last = n - 1;
  const dot = k(f, (n > 1 ? MK.hero2 : MK.hero1) + 8, (n > 1 ? MK.hero2 : MK.hero1) + 16);
  return (
    <Ghosted x={0} v={0} y={y} vy={vy}>
      <AbsoluteFill style={{transform: `translateX(${dx}px) scale(${s})`, transformOrigin: '40% 50%'}}>
        <div style={{position: 'absolute', left: 230, top: top0 - 66, opacity: pin}}>
          <BrandTag sep="—" dot={false} />
        </div>
        {H.lines.map((ln, i) => {
          const brand = i === last; // 最後一行（只有一行時就是那一行）用品牌藍、粗一階
          return (
            <div key={i} style={{position: 'absolute', left: 216, top: top0 + i * lh, display: 'flex', alignItems: 'flex-end'}}>
              <CharsUp
                text={ln}
                f={f}
                at={i === 0 ? MK.hero1 : MK.hero2}
                stagger={2}
                color={brand ? C.brand : C.ink}
                style={{fontFamily: TC, fontWeight: brand ? 500 : 300, fontSize: S, letterSpacing: '-0.01em', lineHeight: 1.12}}
              />
              {i === last && <div style={{width: S * 0.19, height: S * 0.19, borderRadius: S, background: C.brand, marginLeft: S * 0.09, marginBottom: S * 0.2, transform: `scale(${dot})`}} />}
            </div>
          );
        })}
        {(H.sub || H.subEm) && (
          <div style={{position: 'absolute', left: 226, top: top0 + n * lh + 40, overflow: 'hidden'}}>
            <div style={{fontFamily: TC, fontWeight: 300, fontSize: H.subSize, color: C.gray, whiteSpace: 'nowrap', transform: `translateY(${(1 - k(f, MK.heroSub, MK.heroSub + 12)) * 110}%)`}}>
              {H.sub}
              {H.subEm && <span style={{color: C.ink, fontWeight: 500}}>{H.subEm}</span>}
            </div>
          </div>
        )}
        <div style={{position: 'absolute', right: 150, top: Math.max(130, top0 - 150), textAlign: 'right', opacity: k(f, MK.heroSub, MK.heroSub + 10)}}>
          <Tag>{H.kicker}</Tag>
          <div style={{fontFamily: GE, fontWeight: 300, fontSize: 56, color: C.ink, marginTop: 4, whiteSpace: 'nowrap'}}>{BR.mark}</div>
        </div>
      </AbsoluteFill>
    </Ghosted>
  );
};

/* ───── C：build-up 一拍一個硬切 ＋ 鑽進游標點 ───── */
export const SceneBuild: React.FC<{f: number}> = ({f}) => {
  const items = D.drop.items;
  if (f >= MK.dive) {
    const t = f - MK.dive;
    return (
      <AbsoluteFill>
        {[0, 1, 2].map((i) => {
          const p = k(t, i * 3, i * 3 + 12, EO);
          return (
            <div
              key={i}
              style={{
                position: 'absolute', left: 960, top: 540, width: 600, height: 600, marginLeft: -300, marginTop: -300, borderRadius: 300,
                border: `2px solid ${C.brand}`, transform: `scale(${0.05 + p * 1.6})`, opacity: (1 - p) * 0.7,
              }}
            />
          );
        })}
        <div style={{position: 'absolute', left: 0, right: 0, top: 800, display: 'flex', justifyContent: 'center', opacity: 1 - k(t, 4, 9)}}>
          <Tag color={C.ink}>{D.drop.line || items.map((it) => `${it.n}${it.unit ? ' ' + it.unit : ''}`).join('　')}</Tag>
        </div>
      </AbsoluteFill>
    );
  }
  let i = 0;
  MK.b.forEach((b, j) => {
    if (f >= b) i = j;
  });
  const it = items[i];
  const at = MK.b[i];
  const t = f - at;
  const sx = (g: number) => shotX(g, at, at + 15, 6, 4, 360);
  const x = sx(f) - t * 3;
  const v = sx(f) - sx(f - 1) - 3;
  const s = punch(f, [at], 0.08, 9);
  const N = items.length;
  return (
    <Ghosted x={x} v={v}>
      <AbsoluteFill style={{transform: `scale(${s})`}}>
        <div style={{position: 'absolute', left: 300, top: 0, height: 960, display: 'flex', alignItems: 'center', gap: 40}}>
          <div style={{fontFamily: GE, fontWeight: 300, fontSize: it.bigSize, lineHeight: 1, color: C.ink, letterSpacing: '-0.04em', whiteSpace: 'nowrap'}}>{it.n}</div>
          <div style={{marginTop: it.bigSize * 0.12}}>
            <Tag>{`0${i + 1} / 0${N}${it.en ? '　' + it.en : ''}`}</Tag>
            {/* 單位緊貼數字（大字），標籤另起一行、小一號、淡色 */}
            <div style={{fontFamily: GE, fontWeight: 300, fontSize: it.unit ? it.unitSize : 120, color: C.ink, marginTop: 16, display: 'flex', alignItems: 'flex-end', whiteSpace: 'nowrap'}}>
              {it.unit}
              <span style={{display: 'inline-block', width: 26, height: 26, borderRadius: 13, background: C.brand, marginLeft: it.unit ? 14 : 0, marginBottom: (it.unit ? it.unitSize : 120) * 0.25}} />
            </div>
            {it.label && <div style={{fontFamily: TC, fontWeight: 300, fontSize: it.labelSize, color: C.gray, marginTop: 14, whiteSpace: 'nowrap'}}>{it.label}</div>}
          </div>
        </div>
      </AbsoluteFill>
    </Ghosted>
  );
};

/** 背景藍色圓：鑽進游標點時的半徑 */
export const diveR = (f: number) => {
  if (f < MK.dive) return 0;
  const p = k(f, MK.dive, MK.drop, (x) => x * x * x);
  return 14 + p * 1250;
};

/* ───── D：DROP（a ＋ b ＋ c 一拍砸一個，下方總結一行） ───── */
export const SceneDrop: React.FC<{f: number}> = ({f}) => {
  const Dr = D.drop;
  const S = Dr.size;
  const ns = MK.n;
  const s = punch(f, ns, 0.06, 10);
  const sx = (g: number) => shotX(g, MK.drop, AFTER_DROP, 1, 6);
  const x = sx(f) - (f - MK.drop) * 1.2;
  const v = sx(f) - sx(f - 1) - 1.2;
  const lastN = ns[ns.length - 1];
  const formal = k(f, lastN + 3, lastN + 12);
  const top = 200 + (340 - S) * 0.45;
  return (
    <Ghosted x={x} v={v}>
      <AbsoluteFill style={{transform: `scale(${s})`, color: C.white}}>
        <div style={{position: 'absolute', left: 160, top: 120}}>
          <Tag color="rgba(255,255,255,0.75)">{Dr.tag}</Tag>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 30}}>
          {Dr.items.map((it, i) => {
            const p = k(f, ns[i], ns[i] + 8);
            const vis = f >= ns[i];
            return (
              <React.Fragment key={i}>
                {i > 0 && <div style={{fontFamily: GE, fontWeight: 300, fontSize: S * 0.53, lineHeight: `${S}px`, opacity: vis ? 0.6 : 0, width: 140, textAlign: 'center'}}>+</div>}
                <div style={{width: it.w, textAlign: 'center', opacity: vis ? 1 : 0}}>
                  <div style={{display: 'flex', justifyContent: 'center', alignItems: 'baseline', whiteSpace: 'nowrap', transform: `scale(${lerp(1.5, 1, p)})`, opacity: Math.min(1, p * 2)}}>
                    <span style={{fontFamily: GE, fontWeight: 300, fontSize: S, lineHeight: 1, letterSpacing: '-0.04em'}}>{it.n}</span>
                    {it.unit && <span style={{fontFamily: GE, fontWeight: 300, fontSize: S * 0.3, marginLeft: S * 0.04}}>{it.unit}</span>}
                  </div>
                  {it.label && <div style={{fontFamily: TC, fontWeight: 300, fontSize: 44, marginTop: 22, whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.7)', opacity: k(f, ns[i] + 3, ns[i] + 10)}}>{it.label}</div>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        {Dr.line && (
          <>
            <div style={{position: 'absolute', left: 0, right: 0, top: 690, display: 'flex', justifyContent: 'center'}}>
              <div style={{width: 1200 * formal, height: 1.5, background: 'rgba(255,255,255,0.6)'}} />
            </div>
            <div style={{position: 'absolute', left: 0, right: 0, top: 730, display: 'flex', justifyContent: 'center'}}>
              <CharsUp text={Dr.line} f={f} at={lastN + 3} stagger={1} dur={7} style={{fontFamily: TC, fontWeight: 500, fontSize: Dr.lineSize, color: C.white}} />
            </div>
          </>
        )}
      </AbsoluteFill>
    </Ghosted>
  );
};
