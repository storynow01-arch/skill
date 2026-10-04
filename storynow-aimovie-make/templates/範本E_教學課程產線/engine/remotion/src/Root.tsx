import {Composition} from 'remotion';
import {Section, SectionData} from './Section';
import fallback from './data/1-1.json';

const FPS = 30;

/** 單一 composition 渲染任意一節。
 *  以 --props=src/data/<id>.props.json 傳入該節資料，
 *  長度由 calculateMetadata 依最後一個場景的結束時間自動推導。 */
export const RemotionRoot: React.FC = () => (
  <Composition
    id="Section"
    component={Section as any}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={{data: fallback as unknown as SectionData} as any}
    calculateMetadata={({props}: any) => {
      const d: SectionData = props.data;
      const last = d.scenes[d.scenes.length - 1];
      return {durationInFrames: Math.round((last.startSec + last.durSec) * FPS)};
    }}
  />
);
