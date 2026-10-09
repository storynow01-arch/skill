/* 範本廣C「機密檔案」——俯拍深色木桌，一個機密檔案袋被推進來、蓋章、撕封條、翻開，文件一張張攤開成偵探牆，
   最後一份通知被蓋上「核准」章、文件收回、檔案闔上，封面蓋上名稱章。主角是一支紅桿鋼筆：畫圈、畫航線、寫字、打勾都是它，最後躺在名稱章旁。
   地圖、線索、清單可省略（scene.ts 自動跳過）；時間全部讀 timeline.json。原作：02_試做/廣告30風格 第 12 支。 */
import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {clamp, EIO, EO, k, lerp, rnd, rnd01} from './kit';
import {Sheet, Pin, PAPER, RED, KRAFT, STICKY} from './parts';
import {Doc1, MapDoc, Polaroid, StickyDoc, CheckDoc, LetterDoc, CoverFront} from './docs';
import {DOCS, E, HAS, FOLDER, camAt, docById, docState, toWorld, penAt, ROUTE, type Doc} from './scene';

const WOOD: React.CSSProperties = {
  position: 'absolute', left: -3000, top: -2200, width: 9000, height: 6000,
  background: [
    'repeating-linear-gradient(90deg, rgba(20,8,0,0.35) 0 3px, transparent 3px 260px)',
    'repeating-linear-gradient(90deg, rgba(255,214,160,0.05) 0 2px, transparent 2px 11px, rgba(30,12,0,0.07) 11px 14px, transparent 14px 31px)',
    'repeating-linear-gradient(88deg, transparent 0 57px, rgba(30,12,0,0.08) 57px 61px, transparent 61px 97px)',
    'repeating-linear-gradient(90deg, #7a5536 0 260px, #6f4b2e 260px 520px, #825b3a 520px 780px, #74502f 780px 1040px)',
  ].join(','),
};

const DocBody: React.FC<{d: Doc; f: number}> = ({d, f}) => {
  switch (d.id) {
    case 'doc1': return <Doc1 f={f} />;
    case 'map': return <MapDoc f={f} />;
    case 'pol1': return <Polaroid f={f} which={1} />;
    case 'pol2': return <Polaroid f={f} which={2} />;
    case 'sticky': return <StickyDoc f={f} />;
    case 'check': return <CheckDoc f={f} />;
    default: return <LetterDoc f={f} />;
  }
};
const bgOf = (id: string) => (id === 'sticky' ? STICKY : id.startsWith('pol') ? '#f7f5ef' : id === 'map' ? '#efe8d6' : PAPER);

/** 一份文件＋移動快時的殘影（4 層逐漸透明的紙片，不用 blur） */
const PlacedDoc: React.FC<{d: Doc; f: number}> = ({d, f}) => {
  const st = docState(d, f);
  if (!st.visible) return null;
  const ghosts = [1, 2, 3, 4].map((i) => docState(d, f - i)).filter((g) => g.visible);
  const speed = ghosts.length ? Math.hypot(st.x - ghosts[0].x, st.y - ghosts[0].y) : 0;
  return (
    <>
      {speed > 14 && ghosts.map((g, i) => (
        <div key={i} style={{position: 'absolute', left: g.x, top: g.y, transform: `rotate(${g.r}deg) scale(${g.s})`, opacity: 0.32 * (1 - i / 4)}}>
          <div style={{position: 'absolute', left: -d.w / 2, top: -d.h / 2, width: d.w, height: d.h, background: bgOf(d.id)}} />
        </div>
      ))}
      <div style={{position: 'absolute', left: st.x, top: st.y, transform: `rotate(${st.r}deg) scale(${st.s})`}}>
        <Sheet w={d.w} h={d.h} bg={bgOf(d.id)} lift={st.lift}>
          <DocBody d={d} f={f} />
        </Sheet>
      </div>
    </>
  );
};

/** 主角鋼筆（俯視）：筆尖在 (x,y)，筆身往右上；抬起時影子拉開、筆身略大 */
const Pen: React.FC<{f: number}> = ({f}) => {
  const p = penAt(f), q = penAt(f - 1);
  const vx = p.x - q.x;
  const ang = -52 + Math.max(-10, Math.min(10, vx * 0.4)) + (f > E.closed ? 70 * k(f, E.closed + 4, E.closed + 30, EIO) : 0);
  const sc = 1 + p.up * 0.07;
  const so = 14 + p.up * 46;
  const body = (shadow: boolean) => (
    <div style={{position: 'absolute', left: 0, top: -17, width: 560, height: 34, transformOrigin: '0 50%',
      transform: `rotate(${ang}deg) scale(${sc})`, ...(shadow ? {opacity: 0.38 - p.up * 0.12} : {})}}>
      {shadow ? (
        <div style={{position: 'absolute', left: 20, top: 2, width: 540, height: 30, borderRadius: 16, background: '#000'}} />
      ) : (
        <>
          <div style={{position: 'absolute', left: 0, top: 9, width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '46px solid #d9b55a'}} />
          <div style={{position: 'absolute', left: 44, top: 4, width: 70, height: 26, borderRadius: '8px 4px 4px 8px', background: 'linear-gradient(180deg,#3a3a3a,#111 60%,#2a2a2a)'}} />
          <div style={{position: 'absolute', left: 112, top: 0, width: 448, height: 34, borderRadius: '6px 17px 17px 6px', background: 'linear-gradient(180deg,#e0565b 0%,#a3161c 45%,#5e0a0e 100%)'}} />
          <div style={{position: 'absolute', left: 300, top: 0, width: 14, height: 34, background: 'linear-gradient(180deg,#f6dd8f,#b38a2c)'}} />
          <div style={{position: 'absolute', left: 340, top: -4, width: 170, height: 10, borderRadius: 5, background: 'linear-gradient(180deg,#f6dd8f,#b38a2c)'}} />
        </>
      )}
    </div>
  );
  return (
    <>
      <div style={{position: 'absolute', left: p.x + so * 0.7, top: p.y + so}}>{body(true)}</div>
      <div style={{position: 'absolute', left: p.x, top: p.y}}>{body(false)}</div>
    </>
  );
};

/** 偵探牆：地圖上的目的地圖釘拉紅線到各張線索（沒有地圖時只有圖釘） */
const CLUE_PINS: [string, number, number][] = ([['pol1', 220, 26], ['pol2', 60, 30], ['sticky', 170, 24]] as [string, number, number][]).filter(([id]) => HAS[id]);
const Strings: React.FC<{f: number}> = ({f}) => {
  const fade = interpolate(f, [E.sweep, E.sweep + 10], [1, 0], clamp);
  if (fade <= 0) return null;
  const jp = HAS.map ? toWorld(docById('map'), ROUTE.x1, ROUTE.y1) : null;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity: fade}}>
      {jp && (
        <svg width={10} height={10} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          {CLUE_PINS.map(([id, lx, ly]) => {
            const at = E['pin_' + id];
            const [x, y] = toWorld(docById(id), lx, ly);
            const p = k(f, at, at + 22, EO);
            if (p <= 0) return null;
            const mx = (jp[0] + x) / 2, my = (jp[1] + y) / 2 + 60;
            return <path key={id} d={`M${jp[0]},${jp[1]} Q${mx},${my} ${x},${y}`} fill="none" stroke={RED} strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />;
          })}
        </svg>
      )}
      {jp && <Pin f={f} at={E.pinJP} x={jp[0]} y={jp[1]} />}
      {CLUE_PINS.map(([id, lx, ly]) => { const [x, y] = toWorld(docById(id), lx, ly); return <Pin key={id} f={f} at={E['pin_' + id]} x={x} y={y} />; })}
    </div>
  );
};

/** 迴紋針（夾在第二張拍立得上緣） */
const Clip: React.FC<{f: number}> = ({f}) => {
  if (!HAS.pol2) return null;
  const st = docState(docById('pol2'), f);
  if (f < E.clip - 5 || !st.visible) return null;
  const p = k(f, E.clip - 5, E.clip, EO);
  return (
    <div style={{position: 'absolute', left: st.x, top: st.y, transform: `rotate(${st.r}deg) scale(${st.s})`}}>
      <svg width={80} height={170} style={{position: 'absolute', left: 120, top: -330 - (1 - p) * 40, opacity: Math.min(1, p * 2)}}>
        <path d="M22,150 L22,30 Q22,10 40,10 Q58,10 58,30 L58,130 Q58,146 46,146 Q34,146 34,130 L34,44" fill="none" stroke="#9aa3ab" strokeWidth={7} strokeLinecap="round" />
        <path d="M22,150 L22,30 Q22,10 40,10 Q58,10 58,30 L58,130" fill="none" stroke="#e8edf0" strokeWidth={2.5} strokeLinecap="round" />
      </svg>
    </div>
  );
};

const FolderBack: React.FC<{f: number}> = ({f}) => {
  if (f < E.folderIn) return null;
  const p = k(f, E.folderIn, E.folderLand, EO);
  const x = lerp(-900, FOLDER.x, p), r = lerp(-14, 0, p);
  return (
    <div style={{position: 'absolute', left: x, top: FOLDER.y, transform: `rotate(${r}deg)`}}>
      <div style={{position: 'absolute', left: -FOLDER.w / 2 - 6, top: -FOLDER.h / 2 - 6, width: FOLDER.w + 12, height: FOLDER.h + 12, background: '#a9824f',
        boxShadow: '0 16px 40px rgba(20,8,0,0.55)'}} />
      {f >= E.flap && f < E.closed && [0, 1].map((i) => (
        <div key={i} style={{position: 'absolute', left: -FOLDER.w / 2 + 40 + i * 14, top: -FOLDER.h / 2 + 34 + i * 10, width: FOLDER.w - 90, height: FOLDER.h - 80,
          background: i ? '#ebe2cc' : '#e2d7bd', boxShadow: '0 2px 4px rgba(0,0,0,0.25)', transform: `rotate(${i ? 0.8 : -0.6}deg)`}} />
      ))}
    </div>
  );
};
const FolderCover: React.FC<{f: number}> = ({f}) => {
  if (f < E.folderIn) return null;
  const p = k(f, E.folderIn, E.folderLand, EO);
  const x = lerp(-900, FOLDER.x, p), r = lerp(-14, 0, p);
  const open = k(f, E.flap, E.flap + 30, EIO) - k(f, E.close, E.closed, EIO);
  const ang = -178 * open;
  const face: React.CSSProperties = {position: 'absolute', inset: 0, backfaceVisibility: 'hidden'};
  return (
    <div style={{position: 'absolute', left: x, top: FOLDER.y, transform: `rotate(${r}deg)`}}>
      <div style={{position: 'absolute', left: -FOLDER.w / 2, top: -FOLDER.h / 2, width: FOLDER.w, height: FOLDER.h, perspective: 3200, perspectiveOrigin: '0% 50%'}}>
        <div style={{position: 'absolute', inset: 0, transformOrigin: '0 50%', transform: `rotateY(${ang}deg)`, transformStyle: 'preserve-3d'}}>
          <div style={{...face, background: `linear-gradient(160deg, #d3ae75, ${KRAFT} 45%, #bd965e)`,
            boxShadow: open > 0.02 && open < 0.98 ? 'none' : '0 10px 26px rgba(20,8,0,0.45)'}}>
            <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(17deg, rgba(90,60,20,0.05) 0 2px, transparent 2px 9px)'}} />
            <CoverFront f={f} />
          </div>
          <div style={{...face, transform: 'rotateY(180deg)', background: 'linear-gradient(200deg, #dcbb86, #cfa96f)', boxShadow: '0 10px 26px rgba(20,8,0,0.4)'}}>
            <div style={{position: 'absolute', left: 40, right: 40, bottom: 40, height: 260, background: '#c49d63', clipPath: 'polygon(0 30%, 100% 0, 100% 100%, 0 100%)'}} />
          </div>
        </div>
      </div>
    </div>
  );
};

/** 燈光下的浮塵（螢幕座標，慢慢飄；不進畫面最下面 200 像素） */
const Dust: React.FC<{f: number}> = ({f}) => (
  <>
    {Array.from({length: 26}, (_, i) => {
      const x = (rnd01(`dx${i}`) * 1920 + f * (0.3 + rnd01(`dv${i}`) * 0.6)) % 1920;
      const y = (rnd01(`dy${i}`) * 1080 - f * (0.15 + rnd01(`dw${i}`) * 0.3) + 2160) % 1080;
      const r = 2 + rnd01(`dr${i}`) * 3;
      return <div key={i} style={{position: 'absolute', left: x, top: Math.min(y, 880), width: r, height: r, borderRadius: '50%', background: '#fff3d6',
        opacity: 0.12 + 0.12 * Math.sin(f * 0.05 + i) + 0.04 * rnd(`do${i}`)}} />;
    })}
  </>
);

const LATE = ['check', 'letter'];
export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const lamp = interpolate(f, [E.lamp, E.lamp + 3], [0.5, 0], clamp);
  return (
    <AbsoluteFill style={{background: '#4a3320', overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(960px,540px) scale(${cam.s}) translate(${-cam.x}px,${-cam.y}px)`}}>
        <div style={WOOD} />
        <FolderBack f={f} />
        {DOCS.filter((d) => !LATE.includes(d.id)).map((d) => <PlacedDoc key={d.id} d={d} f={f} />)}
        <Clip f={f} />
        <Strings f={f} />
        {DOCS.filter((d) => LATE.includes(d.id)).map((d) => <PlacedDoc key={d.id} d={d} f={f} />)}
        <FolderCover f={f} />
        <Pen f={f} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 70% 75% at 50% 46%, rgba(255,226,170,0.10) 0%, rgba(255,210,150,0) 45%, rgba(18,8,0,0.38) 80%, rgba(10,4,0,0.62) 100%)'}} />
      <Dust f={f} />
      {lamp > 0 && <AbsoluteFill style={{background: `rgba(0,0,0,${lamp})`}} />}
    </AbsoluteFill>
  );
};
