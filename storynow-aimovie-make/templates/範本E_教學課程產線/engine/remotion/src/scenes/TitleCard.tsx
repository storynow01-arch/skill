import {useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill} from 'remotion';
import {C, T, FONT} from '../theme';
import {rise} from '../anim';
import {StarField} from '../chrome/StarField';
import {useSweep} from '../chrome/Shimmer';

/** 節標題卡。進場動畫跑完後固定（2026-10-03 起取消每 3.5 秒整塊沉降與循環光掃）。 */
export const TitleCard: React.FC<{
  title: string; subtitleEn?: string; eyebrow?: string; durSec?: number;
}> = ({title, subtitleEn, eyebrow, durSec = 9}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const t = f/fps;
  const p = 0;
  const sweep = useSweep(3.4, true);
  // 實測教訓：光暈、星點這類細微效果在 480x270 量不到，觀眾也看不出來。
  // 有效的是「大面積元素的位移」—— 整塊標題在每個節拍輕輕沉降一次。
  const settle = (1 - Math.min(1, Math.max(0, p))) * 0;
  const drop = p * 9;
  const lineW = interpolate(f,[0.5*fps,1.1*fps],[0,90],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return (
    <AbsoluteFill style={{justifyContent:'center', alignItems:'center', fontFamily:FONT}}>
      <StarField count={52} />
      <div style={{display:'flex', flexDirection:'column', alignItems:'center',
                   transform:`translateY(${-drop}px)`}}>
      {eyebrow && (
        <div style={{...rise(f,fps,0.15), color:C.muted, fontSize:T.eyebrow, fontWeight:500,
                     letterSpacing:6, marginBottom:20}}>
          {eyebrow}
        </div>
      )}
      <div style={{...rise(f,fps,0), fontSize:T.hero, fontWeight:700, letterSpacing:2}}>
        <span style={sweep}>{title}</span>
      </div>
      <div style={{width:lineW + p*34, height:3, background:C.primary, marginTop:26, borderRadius:2,
                   boxShadow:`0 0 ${8+p*18}px ${C.glow}`}} />
      {subtitleEn && (
        <div style={{...rise(f,fps,0.9), color:C.muted, fontSize:T.label, letterSpacing:4+p*2, marginTop:30}}>
          {subtitleEn}
        </div>
      )}
      </div>
    </AbsoluteFill>
  );
};
