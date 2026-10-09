/* 範本廣D「電視購物台」：熱鬧誇張的購物節目，一個橫向連續的攝影棚——主持人站在左邊，鏡頭沿著舞台往右甩到下一個「商品區」，
   背景比前景早幾格先動。商品區依 storyboard 排（price 與 call 必備，中間五區可省略）；字全部讀 storyboard，時間讀 timeline.json。
   原作：02_試做/廣告30風格 第 19 支（屏榮的就學方案，固定 60 秒）。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {EIO, EO, k, lerp, rnd, rnd01} from './kit';
import T from './timeline.json';
import {ANTON, At, BLUE, Burst, GOLD, Ghosts, GRN, INK, NOTO, Pop, RED, Y, WHITE, Bubble} from './parts';
import {Host, SAY} from './Host';
import {CoinRain, Confetti, Streamers, ZoneBonus, ZoneCall, ZoneChips, ZoneCount, ZoneGifts, ZonePrice, ZoneTags} from './Scenes';

/* eslint-disable @typescript-eslint/no-explicit-any */
const m = T.m as any;
const D = T.d as any;
const BF = T.beatFrames;
const ZONES = T.zones as any[];
const Z: Record<string, any> = Object.fromEntries(ZONES.map((z) => [z.type, z.ev]));
const ZW = 1920;
const PANS = T.pans as number[];
const PAN_LEN = 18;
const camX = (f: number) => PANS.reduce((s, p) => s + k(f, p, p + PAN_LEN, EIO) * ZW, 0);
const LEAD = 5; // 背景早 5 格先動
const COLORS: Record<string, [string, string]> = {
  price: ['#4f7bff', '#1430b8'], bonus: ['#ff4a5e', '#a5101f'], tags: ['#3f6dff', '#16249a'], gifts: ['#2fc46a', '#0b6b3a'],
  chips: ['#9b5cff', '#4a1aa8'], countdown: ['#ff6a3d', '#b0220f'], call: ['#4f7bff', '#1430b8'],
};
const ZC = ZONES.map((z) => COLORS[z.type]);
const mixHex = (a: string, b: string, p: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], p))).join(',')})`;
};
const HITS: [number, number][] = (() => {
  const p = Z.price;
  const h: [number, number][] = [[m.on, 1], [p.orig, 0.6], [p.slash, 0.5], [p.zero, 1.3], [p.free, 0.6], [m.end, 1.3]];
  if (p.more !== undefined) h.push([p.more, 0.9]);
  if (Z.bonus) h.push([Z.bonus.plus, 0.6], [Z.bonus.card24, 0.9]);
  if (Z.tags) (Z.tags.tags as number[]).forEach((t) => h.push([t + 8, 0.45]));
  if (Z.gifts) h.push([Z.gifts.early, 0.6], [Z.gifts.box1, 0.35], [Z.gifts.box2, 0.35], [Z.gifts.double, 1.2]);
  if (Z.chips) { h.push([Z.chips.spTitle, 0.5]); (Z.chips.chips as number[]).forEach((t) => h.push([t + 4, 0.3])); }
  if (Z.countdown) h.push([Z.countdown.act, 0.6]);
  h.push([Z.call.call, 0.8], [Z.call.num + 18, 0.6]);
  return h;
})();
const punch = (f: number) => {
  let s = 0, x = 0, y = 0;
  for (const [h, w] of HITS) {
    const t = f - h;
    if (t < 0 || t > 16) continue;
    const d = Math.exp(-t / 4.5) * w;
    s += d; x += Math.sin(t * 2.1 + h) * d * 16; y += Math.cos(t * 2.7 + h) * d * 11;
  }
  return {s, x, y};
};
const push = (f: number) => k(f, Z.price.roll, Z.price.zero - 1, EIO) * 0.1 * (f < Z.price.zero ? 1 : 0) +
  (Z.countdown ? k(f, Z.countdown.start + 20, Z.countdown.out, EIO) * 0.06 * (f < Z.countdown.out ? 1 : 0) : 0);
const TICKER: string = T.ticker;

const Backdrop: React.FC<{f: number}> = ({f}) => {
  const cx = camX(f + LEAD) / ZW;
  const i = Math.min(ZONES.length - 1, Math.floor(cx));
  const p = cx - i;
  const j = Math.min(ZONES.length - 1, i + 1);
  const c1 = mixHex(ZC[i][0], ZC[j][0], p), c2 = mixHex(ZC[i][1], ZC[j][1], p);
  const spin = f * 0.25 + cx * 70;
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 61% 42%, ${c1} 0%, ${c2} 78%)`}}>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <g transform={`translate(1180,420) rotate(${spin})`}>
          {Array.from({length: 16}, (_, n) => {
            const a0 = (n / 16) * Math.PI * 2, a1 = a0 + Math.PI / 16;
            return <path key={n} d={`M0,0 L${Math.cos(a0) * 2000},${Math.sin(a0) * 2000} L${Math.cos(a1) * 2000},${Math.sin(a1) * 2000}Z`} fill="rgba(255,255,255,0.11)" />;
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const Props: React.FC<{f: number}> = ({f}) => {
  const cam = camX(f + LEAD);
  const chase = Math.floor(f / (BF / 2));
  const n = ZONES.length;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: ZW * n, height: 1080, transform: `translateX(${-cam}px)`}}>
      <div style={{position: 'absolute', left: -200, width: ZW * n + 400, top: 770, height: 60, background: `linear-gradient(${RED}, #9a0c18)`, borderTop: `8px solid ${Y}`}} />
      <div style={{position: 'absolute', left: -200, width: ZW * n + 400, top: 800, height: 6, background: 'rgba(255,255,255,0.35)'}} />
      {ZONES.map((_, z) => {
        if (Math.abs(z * ZW - cam) > ZW * 1.2) return null;
        const X0 = z * ZW + 600, X1 = z * ZW + 1840, Y0 = 40, Y1 = 760;
        const bulbs: [number, number][] = [];
        for (let x = X0; x <= X1; x += 62) bulbs.push([x, Y0]);
        for (let y = Y0 + 62; y <= Y1 - 40; y += 62) { bulbs.push([X0, y]); bulbs.push([X1, y]); }
        return (
          <React.Fragment key={z}>
            <div style={{position: 'absolute', left: X0 - 22, top: Y0 - 22, width: X1 - X0 + 44, height: Y1 - Y0, border: `14px solid ${GOLD}`, borderBottom: 'none', borderRadius: '40px 40px 0 0', boxShadow: `inset 0 0 0 6px ${INK}`}} />
            <svg width={X1 - X0 + 60} height={Y1} style={{position: 'absolute', left: X0 - 30, top: 0, overflow: 'visible'}}>
              {bulbs.map(([x, y], i) => {
                const on = (i + chase) % 3 === 0;
                return <circle key={i} cx={x - X0 + 30} cy={y} r={on ? 11 : 9} fill={on ? '#fff6b0' : '#d98a00'} stroke={INK} strokeWidth={3} />;
              })}
            </svg>
            <div style={{position: 'absolute', left: z * ZW + 1890, top: 0, width: 60, height: 770, background: `repeating-linear-gradient(180deg, ${Y} 0 40px, ${RED} 40px 80px)`, border: `6px solid ${INK}`}} />
          </React.Fragment>
        );
      })}
    </div>
  );
};

const SpeedLines: React.FC<{f: number}> = ({f}) => {
  const p = PANS.find((q) => f >= q - 3 && f < q + PAN_LEN + 2);
  if (p === undefined) return null;
  const t = (f - p + 3) / (PAN_LEN + 5);
  const o = Math.sin(Math.PI * t);
  return (
    <svg width={1920} height={900} style={{position: 'absolute', left: 0, top: 0, opacity: o * 0.85}}>
      {Array.from({length: 16}, (_, i) => {
        const y = 60 + rnd01('sl' + i) * 700;
        const len = 300 + rnd01('sll' + i) * 600;
        const x = 1920 - ((t * 2600 + rnd01('slx' + i) * 1900) % 2600);
        return <rect key={i} x={x} y={y} width={len} height={6 + rnd01('slh' + i) * 8} rx={6} fill="rgba(255,255,255,0.8)" />;
      })}
    </svg>
  );
};

const Bars: React.FC<{f: number}> = ({f}) => {
  if (f >= m.on + 2) return null;
  const cols = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
  return (
    <AbsoluteFill>
      {f < m.on - 2 && (
        <div style={{position: 'absolute', inset: 0, display: 'flex'}}>
          {cols.map((c) => <div key={c} style={{flex: 1, background: c}} />)}
          <div style={{position: 'absolute', left: 0, right: 0, top: 640, height: 120, display: 'flex'}}>
            {['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'].map((c, i) => <div key={i} style={{flex: 1, background: c}} />)}
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center'}}>
            <span style={{fontFamily: NOTO, fontWeight: 900, fontSize: 64, color: WHITE, background: 'rgba(0,0,0,0.6)', padding: '8px 40px', borderRadius: 12, whiteSpace: 'nowrap'}}>{D.channel.standby}</span>
          </div>
        </div>
      )}
      {f >= m.on - 3 && (
        <div style={{position: 'absolute', inset: 0}}>
          {Array.from({length: 30}, (_, i) => (
            <div key={i} style={{position: 'absolute', left: 0, right: 0, top: i * 30, height: 30, background: `rgb(${Array(3).fill(Math.round(120 + rnd01(`nz${f}-${i}`) * 110)).join(',')})`, transform: `translateX(${rnd(`nx${f}-${i}`) * 60}px)`}} />
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};

const Logo: React.FC<{f: number}> = ({f}) => {
  if (f < m.on) return null;
  const name: string = D.channel.name;
  const size = Math.min(150, 1100 / Math.max(1, Array.from(name).length));
  const pos = (ff: number) => {
    const fly = k(ff, m.logoFly, m.logoFly + 16, EIO);
    const slam = k(ff, m.on, m.on + 8, EO);
    return {x: lerp(1060, 222, fly), y: lerp(400, 72, fly), s: lerp(lerp(2.6, 1, slam), 0.36 * (150 / size) * Math.min(1, 5 / Math.max(1, Array.from(name).length)), fly), fly, r: lerp(-8, -3, fly)};
  };
  return (
    <Ghosts f={f} on={f >= m.logoFly + 1 && f < m.logoFly + 14} render={(ff) => {
      const p = pos(ff);
      return (
        <At x={p.x} y={p.y} s={p.s} r={p.r}>
          <div style={{position: 'relative', padding: '10px 50px 22px', borderRadius: 40, background: `rgba(30,77,255,${p.fly})`, border: `${12 * p.fly}px solid ${INK}`}}>
            {p.fly < 0.99 && (
              <div style={{position: 'absolute', inset: 0, opacity: 1 - p.fly}}>
                <Burst r={360} n={18} fill={Y} fill2={RED} seed="logo" rot={ff * 0.5} />
              </div>
            )}
            <Pop size={size} fill={WHITE} ext={RED} depth={6}>{name}</Pop>
          </div>
        </At>
      );
    }} />
  );
};

const Chrome: React.FC<{f: number}> = ({f}) => {
  const tick = f >= m.on;
  const live = Math.floor(f / 26) % 2 === 0;
  const B = D.bar;
  return (
    <>
      {tick && (
        <div style={{position: 'absolute', right: 40, top: 34, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14, background: RED, border: `6px solid ${INK}`, borderRadius: 14, padding: '4px 22px', boxShadow: `6px 6px 0 ${INK}`}}>
            <div style={{width: 26, height: 26, borderRadius: '50%', background: live ? WHITE : '#ff9a9a', border: `4px solid ${INK}`}} />
            <span style={{fontFamily: ANTON, fontSize: 50, color: WHITE, letterSpacing: 3}}>LIVE</span>
          </div>
          <span style={{fontFamily: NOTO, fontWeight: 900, fontSize: 30, color: WHITE, background: INK, padding: '0 14px', borderRadius: 8}}>現場直播</span>
        </div>
      )}
      {tick && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 826, height: 70, background: `linear-gradient(${RED}, #c4001a)`, borderTop: `5px solid ${INK}`, borderBottom: `5px solid ${INK}`, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 280 - (f - m.on) * 5, top: 6, whiteSpace: 'nowrap', fontFamily: NOTO, fontWeight: 900, fontSize: 42, color: WHITE, lineHeight: 1.2}}>
            {TICKER.repeat(8)}
          </div>
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 260, background: Y, borderRight: `6px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: NOTO, fontWeight: 900, fontSize: 42, color: INK, whiteSpace: 'nowrap'}}>
            {D.channel.tickerLabel ?? '最新優惠'}
          </div>
        </div>
      )}
      {/* 最下面 180 像素：靜止的專線列 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 900, height: 180, background: `linear-gradient(${BLUE}, #0f2a9e)`, borderTop: `8px solid ${Y}`, display: 'flex', alignItems: 'center', padding: '0 60px', gap: 34}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', background: Y, border: `6px solid ${INK}`, borderRadius: 18, padding: '4px 22px'}}>
          <span style={{fontFamily: NOTO, fontWeight: 900, fontSize: 40, color: INK, lineHeight: 1.15, whiteSpace: 'nowrap'}}>{B.label ?? '訂購專線'}</span>
          {B.sub && <span style={{fontFamily: NOTO, fontWeight: 900, fontSize: 28, color: RED, lineHeight: 1.15, whiteSpace: 'nowrap'}}>{B.sub}</span>}
        </div>
        <svg width={70} height={70} viewBox="0 0 70 70">
          <circle cx={35} cy={35} r={32} fill={GRN} stroke={INK} strokeWidth={5} />
          <path d="M22,18 Q16,22 18,30 Q24,46 40,52 Q48,54 52,48 L46,40 L39,43 Q30,38 27,31 L30,24Z" fill={INK} />
        </svg>
        <span style={{fontFamily: ANTON, fontSize: 104, color: Y, letterSpacing: 4, lineHeight: 1, whiteSpace: 'nowrap'}}>{B.tel}</span>
        <div style={{flex: 1}} />
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
          {B.web && <span style={{fontFamily: ANTON, fontSize: 52, color: WHITE, lineHeight: 1.1, whiteSpace: 'nowrap'}}>{B.web}</span>}
          {B.full && <span style={{fontFamily: NOTO, fontWeight: 900, fontSize: 36, color: Y, lineHeight: 1.3, whiteSpace: 'nowrap'}}>{B.full}</span>}
        </div>
      </div>
    </>
  );
};

const ZoneOf: React.FC<{z: any; f: number}> = ({z, f}) => {
  switch (z.type) {
    case 'price': return <ZonePrice f={f} ev={z.ev} d={z.d} />;
    case 'bonus': return <ZoneBonus f={f} ev={z.ev} d={z.d} />;
    case 'tags': return <ZoneTags f={f} ev={z.ev} d={z.d} />;
    case 'gifts': return <ZoneGifts f={f} ev={z.ev} d={z.d} />;
    case 'chips': return <ZoneChips f={f} ev={z.ev} d={z.d} />;
    case 'countdown': return <ZoneCount f={f} ev={z.ev} d={z.d} />;
    default: return <ZoneCall f={f} ev={z.ev} d={z.d} end={m.end} endD={D.end} />;
  }
};

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camX(f);
  const pu = punch(f);
  const sc = 1 + pu.s * 0.045 + push(f);
  const say = SAY.find(([a, b]) => f >= a && f < b);
  const sayS = say ? k(f, say[0], say[0] + 6, EO) * (1 - k(f, say[1] - 5, say[1], EIO)) : 0;
  const more = Z.price.more;
  const moreRender = (ff: number) => {
    if (more === undefined || ff < more || ff > Z.price.out + 20) return null;
    const pin = k(ff, more, more + 8, EO);
    const pout = k(ff, Z.price.out + 4, Z.price.out + 16, EIO);
    return (
      <At x={1180 + (1 - pin) * 1300 - pout * 2200} y={400} r={-7} s={1 + 0.15 * (1 - pin)}>
        <div style={{position: 'relative'}}>
          <Burst r={300} n={18} fill={RED} fill2={Y} seed="more" rot={ff * 0.7} />
          <Pop size={190} fill={WHITE} ext={BLUE} depth={7}>{ZONES[0].d.more ?? '還沒完！'}</Pop>
        </div>
      </At>
    );
  };
  return (
    <AbsoluteFill style={{background: '#1430b8', overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <AbsoluteFill style={{transform: `translate(${pu.x}px,${pu.y}px) scale(${sc})`, transformOrigin: '1060px 430px'}}>
        <Backdrop f={f} />
        <Props f={f} />
        <SpeedLines f={f} />
        <Streamers f={f} at={m.end} />
        <div style={{position: 'absolute', left: 0, top: 0, width: ZW * ZONES.length, height: 1080, transform: `translateX(${-cam}px)`}}>
          {ZONES.map((z, i) => {
            if (Math.abs(i * ZW - cam) > ZW * 1.05) return null;
            return (
              <div key={i} style={{position: 'absolute', left: i * ZW, top: 0, width: ZW, height: 1080}}>
                <ZoneOf z={z} f={f} />
              </div>
            );
          })}
        </div>
        <Host f={f} />
        {say && sayS > 0 && (
          <At x={330} y={196} s={sayS}>
            <Bubble text={say[2]} />
          </At>
        )}
        {more !== undefined && <Ghosts f={f} on={(f >= more && f < more + 7) || (f >= Z.price.out + 4 && f < Z.price.out + 16)} render={moreRender} />}
        <Confetti f={f} at={Z.price.zero} cx={1180} cy={420} n={70} seed="z" />
        {Z.gifts && <Confetti f={f} at={Z.gifts.double} cx={1180} cy={540} n={60} seed="d" />}
        <Confetti f={f} at={m.end} cx={1180} cy={420} n={80} seed="e" />
        {Z.bonus && <CoinRain f={f} at={Z.bonus.card24} n={34} />}
      </AbsoluteFill>
      <Bars f={f} />
      <Logo f={f} />
      <Chrome f={f} />
    </AbsoluteFill>
  );
};
