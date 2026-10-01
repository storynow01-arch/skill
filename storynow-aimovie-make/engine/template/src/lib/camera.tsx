/* 一鏡到底攝影機：在一張大畫布上用關鍵格移動、縮放、旋轉（來自「創客手稿」）。
   用法：
     const cam = useCamera([[0, 800, 500, 1.6, -2], [90, 2000, 600, 1.2, 1]]);
     <CameraStage cam={cam} width={5000} height={3000} background={...}>…大畫布內容…</CameraStage> */
import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';

/** [frame, 中心x, 中心y, 縮放, 旋轉(度)] */
export type CamKey = [number, number, number, number, number];
const io = Easing.inOut(Easing.cubic);

export const camAt = (keys: CamKey[], f: number, drift = 0): [number, number, number, number] => {
  if (f <= keys[0][0]) return keys[0].slice(1) as [number, number, number, number];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, ...a] = keys[i], [f1, ...b] = keys[i + 1];
    if (f >= f0 && f < f1) {
      const t = io((f - f0) / (f1 - f0));
      const v = a.map((x, k) => x + (b[k] - x) * t) as [number, number, number, number];
      v[0] += Math.sin(f / 50) * drift; v[1] += Math.cos(f / 60) * drift;
      return v;
    }
  }
  return keys[keys.length - 1].slice(1) as [number, number, number, number];
};

export const useCamera = (keys: CamKey[], drift = 4) => camAt(keys, useCurrentFrame(), drift);

export const CameraStage: React.FC<{cam: [number, number, number, number]; width: number; height: number; children: React.ReactNode;
  background?: string; viewW?: number; viewH?: number}> = ({cam, width, height, children, background = 'transparent', viewW = 1920, viewH = 1080}) => {
  const [cx, cy, z, rot] = cam;
  return (
    <AbsoluteFill style={{background, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width, height, transformOrigin: '0 0',
        transform: `translate(${viewW / 2}px, ${viewH / 2}px) rotate(${rot}deg) scale(${z}) translate(${-cx}px, ${-cy}px)`}}>
        {children}
      </div>
    </AbsoluteFill>
  );
};
