import {spring, interpolate} from 'remotion';
import {ENTER} from './theme';

/** 標準進場：上浮 24px + 淡入 */
export const rise = (frame: number, fps: number, delaySec = 0) => {
  const f = frame - delaySec * fps;
  const s = spring({frame: f, fps, config: ENTER});
  return {opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateY(${(1 - s) * 24}px)`};
};

/** 自左向右擦出（關鍵詞高亮用） */
export const wipe = (frame: number, fps: number, delaySec: number, durSec = 0.3) => {
  const p = interpolate(frame, [delaySec * fps, (delaySec + durSec) * fps], [0, 100],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return {clipPath: `inset(0 ${100 - p}% 0 0)`};
};

/** 焦點：非當前項降透明度 */
export const focus = (active: boolean) => ({
  opacity: active ? 1 : 0.4,
  transition: 'opacity 0.3s',
});
