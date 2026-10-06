import {useCurrentFrame, useVideoConfig, AbsoluteFill} from 'remotion';
import {pushScale} from './fx';

/** ① 微推近（特效試作）：整個場景 1.0 → 1.025 緩慢放大，讓長時間停留的畫面也有細微的動，不搶戲 */
export const PushIn: React.FC<{durSec: number; children: React.ReactNode}> = ({durSec, children}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <AbsoluteFill style={{transform: `scale(${pushScale(f / fps, durSec)})`, transformOrigin: '50% 45%'}}>{children}</AbsoluteFill>;
};
