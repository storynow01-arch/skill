import {useCurrentFrame, useVideoConfig, AbsoluteFill} from 'remotion';
import {Phrases} from '../Phrases';
import {C, T, FONT, R} from '../theme';
import {rise} from '../anim';
import {narrate, FocusPlan} from '../beats';

/** 情境卡：大圖示 + 膠囊標籤。標籤在旁白唸到時出場並亮起；全部唸完後固定，最後一個轉為橘色警示。 */
export const ScenarioCard: React.FC<{
  heading?: string; icon?: string; pills: string[]; focusPlan?: FocusPlan; durSec?: number;
}> = ({heading, icon = '📱', pills, focusPlan, durSec = 12}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const t = f/fps;
  const n = narrate(t, focusPlan, pills.length, 1.0);
  const active = n.active;
  const p = n.pulse;
  return (
    <AbsoluteFill style={{justifyContent:'center', alignItems:'center', fontFamily:FONT}}>
      {heading && (
        <div style={{...rise(f,fps,0), color:C.text, fontSize:T.h2, fontWeight:700, marginBottom:50}}>
          <Phrases text={heading} />
        </div>
      )}
      <div style={{...rise(f,fps,0), fontSize:190, marginBottom:56, lineHeight:1,
                   transform:`translateY(${-p*6}px) scale(${1+p*0.012})`}}>{icon}</div>
      <div style={{display:'flex', gap:20}}>
        {pills.map((s,i)=>{
          const last = i === pills.length-1;
          const alert = last && n.done && t >= n.appear(i);
          const hot = active === i && !alert;
          const on = alert || hot ? C.primary : C.border;
          return (
            <div key={i} style={{
              ...rise(f,fps,n.appear(i)),
              border:`1px solid ${on}`,
              color: (alert||hot) ? C.primary : C.muted,
              boxShadow: (alert||hot) ? `0 0 ${20+p*14}px ${C.glow}` : 'none',
              opacity: (rise(f,fps,n.appear(i)).opacity as number) * (active === -1 || hot ? 1 : 0.45),
              transform: hot ? `translateY(${-p*3}px)` : 'none',
              borderRadius:R.pill, padding:'16px 34px', fontSize:T.cardNote,
            }}><Phrases text={s} /></div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
