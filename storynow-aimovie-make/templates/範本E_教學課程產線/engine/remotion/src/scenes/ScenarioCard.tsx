import {useCurrentFrame, useVideoConfig, AbsoluteFill} from 'remotion';
import {Phrases} from '../Phrases';
import {C, T, FONT, R} from '../theme';
import {rise} from '../anim';
import {narrate, FocusPlan, HOLD} from '../beats';

/** 情境卡：大圖示 + 膠囊標籤。標籤在旁白唸到時出場並亮起；全部唸完後固定，最後一個轉為橘色警示。 */
export const ScenarioCard: React.FC<{
  heading?: string; icon?: string; pills: string[]; focusPlan?: FocusPlan; durSec?: number;
}> = ({heading, icon = '📱', pills, focusPlan, durSec = 12}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const t = f/fps;
  const n = narrate(t, focusPlan, pills.length, 1.0);
  const active = n.active;
  const p = n.pulse;
  // 會轉的圖示（轉圈、沙漏、齒輪）在旁白唸到「轉、載入、讀取、等待」那一項時真的轉起來，換下一項就停
  // （2026-10-04 使用者回報：說「突然轉圈」，圖示只彈一下沒有轉）
  const SPIN = ['🌀', '⏳', '⌛', '🔄', '🔁', '⚙️', '💿', '📀'];
  const spinItem = SPIN.some((x) => icon.includes(x))
    ? pills.findIndex((s) => /轉|載入|讀取|等待|緩衝/.test(s)) : -1;
  let spin = 0;
  if (spinItem >= 0 && focusPlan) {
    const start = focusPlan.find(([, i]) => i === spinItem)?.[0];
    // 轉到下一項被唸到為止；轉圈那一項如果是最後一項，就轉到全部唸完（HOLD）為止
    const lastAt = Math.max(...focusPlan.map(([at]) => at));
    const stop = focusPlan.find(([at, i]) => start !== undefined && at > start && i !== spinItem)?.[0] ?? lastAt + HOLD;
    if (start !== undefined) {
      // 每 1.1 秒轉一圈；換到下一項時停在當下角度（不對齊整圈，避免瞬間跳轉）
      const until = Math.min(t, stop ?? t);
      spin = until > start ? ((until - start) / 1.1) * 360 : 0;
    }
  }
  return (
    <AbsoluteFill style={{justifyContent:'center', alignItems:'center', fontFamily:FONT}}>
      {/* 會轉的圖示（190px）轉到 45° 時外框變大約 1.4 倍，往上會碰到標題 → 多留 40px（2026-10-04 版面探針 1-1 S8） */}
      {heading && (
        <div style={{...rise(f,fps,0), color:C.text, fontSize:T.h2, fontWeight:700, marginBottom: spinItem >= 0 ? 90 : 50}}>
          <Phrases text={heading} />
        </div>
      )}
      <div style={{...rise(f,fps,0), fontSize:190, marginBottom:56, lineHeight:1,
                   transform:`translateY(${-p*6}px) scale(${1+p*0.012}) rotate(${spin}deg)`}}>{icon}</div>
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
              opacity: (rise(f,fps,n.appear(i)).opacity as number) * (0.45 + 0.55 * n.weight(i)),
              transform: hot ? `translateY(${-p*3}px)` : 'none',
              borderRadius:R.pill, padding:'16px 34px', fontSize:T.cardNote,
            }}><Phrases text={s} /></div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
