import {AbsoluteFill, Img, staticFile} from 'remotion';
import {L} from '../theme';

/** 課程 LOGO — 常駐右上角。
 *  實測：LOGO 內黑色筆畫皆帶白色描邊，在 #181818 上完全清晰，不加底板。 */
export const Logo: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <Img
      src={staticFile('logo.png')}
      style={{position: 'absolute', top: L.logo.y, right: L.logo.x, width: L.logo.w}}
    />
  </AbsoluteFill>
);
