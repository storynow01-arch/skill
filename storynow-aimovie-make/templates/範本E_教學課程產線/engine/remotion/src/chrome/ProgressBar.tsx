import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {C, L} from '../theme';

/** 頂部橘色進度條，實測 y0-4 */
export const ProgressBar: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const w = interpolate(f, [0, durationInFrames], [0, 100], {extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', top: 0, left: 0, height: L.progressH,
                 width: `${w}%`, background: C.primary}} />
  );
};
