import {useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill} from 'remotion';

/** 場景出場淡出。與下一個場景的進場重疊，形成交叉溶接。
 *  規格：garychen-dark.yaml → motion.transition_duration_seconds = 0.4 */
export const SceneFade: React.FC<{holdSec: number; fadeSec?: number; children: React.ReactNode}> =
({holdSec, fadeSec = 0.4, children}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = interpolate(
    f,
    [(holdSec - fadeSec) * fps, holdSec * fps],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};
