import {useCurrentFrame, useVideoConfig, AbsoluteFill} from 'remotion';
import {Phrases} from '../Phrases';
import {C, T, FONT, R} from '../theme';
import {rise} from '../anim';
import {StarField} from '../chrome/StarField';
import {narrate, FocusPlan} from '../beats';

/** 課中小檢查。選項在旁白唸到時出場；揭曉時正解轉綠、錯的淡出，之後固定（不再輪播、不再呼吸）。 */
export const QuizCard: React.FC<{
  question: string; options: string[]; answerIndex: number; revealAt: number;
  afterNote?: string; afterAt?: number; focusPlan?: FocusPlan; durSec?: number;
}> = ({question, options, answerIndex, revealAt, afterNote, afterAt, focusPlan, durSec = 12}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const t = f/fps;
  const n = narrate(t, focusPlan, options.length, 1.5);
  const revealed = t >= revealAt;
  const scan = revealed ? -1 : n.active;
  const p = n.pulse;
  const noteAt = afterAt ?? revealAt + 1.2;
  return (
    <AbsoluteFill style={{justifyContent:'center', alignItems:'center', fontFamily:FONT}}>
      <StarField count={34} opacity={0.34} />
      <div style={{...rise(f,fps,0), color:C.text, fontSize:T.h2, fontWeight:700, marginBottom:64}}>
        <Phrases text={question} />
      </div>
      <div style={{display:'flex', gap:32}}>
        {options.map((o,i)=>{
          const ok = revealed && i===answerIndex;
          const bad = revealed && i!==answerIndex;
          const hot = !revealed && scan===i;
          return (
            <div key={i} style={{
              ...rise(f,fps,n.appear(i)),
              // 揭曉時錯誤選項淡到 0.3 後固定
              opacity:(rise(f,fps,n.appear(i)).opacity as number)
                      *(bad?0.3:(!revealed && scan>=0 && !hot)?0.45:1),
              background:C.card,
              border:`1px solid ${ok?C.success:hot?C.primary:C.border}`,
              boxShadow: ok ? `0 0 40px rgba(32,192,88,0.35)`
                       : hot ? `0 0 ${16+p*12}px ${C.glow}` : 'none',
              transform: hot ? `translateY(${-p*3}px)` : 'none',
              borderRadius:R.md, padding:'40px 56px', minWidth:460,
              display:'flex', alignItems:'center', gap:18,
            }}>
              {ok && <span style={{color:C.success, fontSize:40}}>✓</span>}
              <span style={{color:C.text, fontSize:T.h3, fontWeight:600}}><Phrases text={o} /></span>
            </div>
          );
        })}
      </div>
      {afterNote && t >= noteAt && (
        <div style={{...rise(f,fps,noteAt), marginTop:46, color:C.body, fontSize:T.h3}}>
          <Phrases text={afterNote} />
        </div>
      )}
    </AbsoluteFill>
  );
};
