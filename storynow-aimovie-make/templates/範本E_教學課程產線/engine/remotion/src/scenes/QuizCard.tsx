import {useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, interpolateColors} from 'remotion';
import {Phrases} from '../Phrases';
import {C, T, FONT, R} from '../theme';
import {rise} from '../anim';
import {StarField} from '../chrome/StarField';
import {narrate, FocusPlan, FADE} from '../beats';
import {useFx} from '../fx';

/** 課中小檢查。選項在旁白唸到時出場；揭曉時正解轉綠、錯的淡出，之後固定（不再輪播、不再呼吸）。
 *  亮暗與揭曉都用 FADE（0.4 秒）漸變，不在一格之內切換（2026-10-04 EP2 品檢 F11）。 */
export const QuizCard: React.FC<{
  question: string; options: string[]; answerIndex: number; revealAt: number;
  afterNote?: string; afterAt?: number; focusPlan?: FocusPlan; durSec?: number;
}> = ({question, options, answerIndex, revealAt: revealIn, afterNote, afterAt, focusPlan, durSec = 12}) => {
  // 揭曉時間缺漏（旁白找不到答案句）時退回場景中段，不讓整格報錯（2026-10-06）
  const revealAt = Number.isFinite(revealIn) ? revealIn : durSec * 0.5;
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const t = f/fps;
  const n = narrate(t, focusPlan, options.length, 1.5);
  const revealed = t >= revealAt;
  const rv = interpolate(t, [revealAt, revealAt + FADE], [0, 1], {extrapolateLeft:'clamp', extrapolateRight:'clamp'});
  const scan = revealed ? -1 : n.active;
  const p = n.pulse;
  const noteAt = afterAt ?? revealAt + 1.2;
  // ⑥ 測驗小儀式（特效版）：揭曉前 3 秒出現倒數圈慢慢收合；揭曉時答案外框亮一次橘色光暈（0.8 秒，之後固定綠色）
  const fx = useFx();
  const ringFrom = Math.max(1, revealAt - 3), ringK = interpolate(t, [ringFrom, revealAt], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ringOp = fx.quiz ? interpolate(t, [ringFrom, ringFrom + 0.3, revealAt, revealAt + 0.4], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  const glow = fx.quiz ? interpolate(t, [revealAt, revealAt + 0.25, revealAt + 0.8], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  return (
    <AbsoluteFill style={{justifyContent:'center', alignItems:'center', fontFamily:FONT}}>
      <StarField count={34} opacity={0.34} />
      <div style={{...rise(f,fps,0), color:C.text, fontSize:T.h2, fontWeight:700, marginBottom:64}}>
        <Phrases text={question} />
      </div>
      <div style={{display:'flex', gap:32}}>
        {options.map((o,i)=>{
          const isAns = i===answerIndex;
          const hot = !revealed && scan===i;
          // 揭曉前：唸到的亮、其他 0.45（weight 已是 0.4 秒漸變）；揭曉後：正解 1、錯的 0.3
          const pre = 0.45 + 0.55*n.weight(i);
          const post = isAns ? 1 : 0.3;
          const dim = pre + (post - pre)*rv;
          const borderPre = scan===i ? C.primary : C.border;
          return (
            <div key={i} style={{
              ...rise(f,fps,n.appear(i)),
              opacity:(rise(f,fps,n.appear(i)).opacity as number)*dim,
              background:C.card,
              border:`1px solid ${interpolateColors(rv,[0,1],[borderPre, isAns?C.success:C.border])}`,
              boxShadow: isAns && glow>0 ? `0 0 ${40+50*glow}px rgba(248,152,0,${0.75*glow})`
                       : isAns && rv>0 ? `0 0 40px rgba(32,192,88,${0.35*rv})`
                       : hot ? `0 0 ${16+p*12}px ${C.glow}` : 'none',
              transform: hot ? `translateY(${-p*3}px)` : 'none',
              borderRadius:R.md, padding:'40px 56px', minWidth:460,
              display:'flex', alignItems:'center', gap:18,
            }}>
              {isAns && revealed && <span style={{color:C.success, fontSize:40, opacity:rv}}>✓</span>}
              <span style={{color:C.text, fontSize:T.h3, fontWeight:600}}><Phrases text={o} /></span>
            </div>
          );
        })}
      </div>
      {ringOp > 0 && (
        <svg width={110} height={110} style={{position: 'absolute', top: 150, opacity: ringOp}}>
          <circle cx={55} cy={55} r={44} stroke={C.border} strokeWidth={6} fill="none" />
          <circle cx={55} cy={55} r={44} stroke={C.primary} strokeWidth={6} fill="none" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 44} strokeDashoffset={2 * Math.PI * 44 * (1 - ringK)} transform="rotate(-90 55 55)" />
        </svg>
      )}
      {afterNote && (
        <div style={{...rise(f,fps,noteAt), marginTop:46, color:C.body, fontSize:T.h3}}>
          <Phrases text={afterNote} />
        </div>
      )}
    </AbsoluteFill>
  );
};
