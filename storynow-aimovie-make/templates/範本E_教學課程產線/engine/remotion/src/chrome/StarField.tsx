import {useCurrentFrame, useVideoConfig, AbsoluteFill} from 'remotion';
import {C} from '../theme';

/**
 * 緩慢飄移的星點場。
 *
 * 來源：拉片時在 Gary Chen 的標題卡畫面看到的細微星點背景。
 * 作用不只是裝飾 —— 它讓標題／結語這類「元素少、停留久」的場景在整個時長內
 * 持續有像素變化，落實「畫面絕不靜止超過 4 秒」。
 * 細微的光暈脈動人眼看不出來，也量不到；飄移的點才是真的在動。
 */
const SEED = 20260924;

function rnd(i: number) {
  const x = Math.sin(i * 12.9898 + SEED) * 43758.5453;
  return x - Math.floor(x);
}

export const StarField: React.FC<{count?: number; opacity?: number}> =
({count = 46, opacity = 0.5}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;

  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      {Array.from({length: count}, (_, i) => {
        const x0 = rnd(i * 3 + 1) * width;
        const y0 = rnd(i * 3 + 2) * height;
        // 實測：1.5~4px 的點縮到 480x270 只剩 0.4~1px，會被平均掉。放大一倍才看得見。
        const size = 3.5 + rnd(i * 3 + 3) * 5.5;
        // 每顆速度不同，整體極慢（8~22 px/秒），不搶焦點
        const vx = (rnd(i * 5 + 7) - 0.5) * 64;
        const vy = -20 - rnd(i * 5 + 9) * 30;
        const x = ((x0 + vx * t) % (width + 40) + width + 40) % (width + 40) - 20;
        const y = ((y0 + vy * t) % (height + 40) + height + 40) % (height + 40) - 20;
        // 每顆有自己的閃爍週期
        const tw = 0.55 + 0.45 * Math.sin(t * (0.6 + rnd(i * 7 + 11) * 0.9) + i);
        const warm = rnd(i * 11 + 5) > 0.82;
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: y,
            width: size, height: size, borderRadius: '50%',
            background: warm ? C.primary : '#FFFFFF',
            opacity: opacity * tw * (warm ? 0.7 : 0.38),
            boxShadow: warm ? `0 0 ${size * 3}px ${C.glow}` : 'none',
          }} />
        );
      })}
    </AbsoluteFill>
  );
};
