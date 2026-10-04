import {useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate} from 'remotion';
import {Phrases} from '../Phrases';
import {C, T, FONT, R} from '../theme';
import {rise} from '../anim';
import {narrate, FocusPlan} from '../beats';

export type Step = {label: string; note?: string; cue?: string};

/**
 * 流程箭頭：膠囊標籤以橘色箭頭串接，由左至右。
 * 拉片來源：Gary Chen 影片中的「裝系統 → 設防火牆 → 裝環境 → 一行行打指令」。
 *
 * 動態：每一站在旁白唸到時出場；焦點切到下一站時，光點沿著前一段箭頭跑一次（0.7 秒）。
 * 全部唸完後固定全亮，不再循環。
 */
export const FlowArrows: React.FC<{
  heading?: string; steps: Step[]; footer?: string; footerAt?: number; focusPlan?: FocusPlan; durSec?: number;
}> = ({heading, steps, footer, footerAt, focusPlan, durSec = 14}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;

  const n = narrate(t, focusPlan, steps.length, 1.0, 0.18);
  const active = n.active;
  const p = n.pulse;
  const fAt = footerAt ?? Math.max(durSec - 3.5, durSec * 0.7);
  // 光點：第 i 站出場的那 0.7 秒內，沿著「i-1 → i」那段箭頭跑一次
  const RUN = 0.7;

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT, padding: '0 100px'}}>
      {heading && (
        <div style={{...rise(f, fps, 0), color: C.text, fontSize: T.h2, fontWeight: 700, marginBottom: 70}}>
          <Phrases text={heading} />
        </div>
      )}

      <div style={{display: 'flex', alignItems: 'center', gap: 0}}>
        {steps.map((s, i) => {
          const enter = rise(f, fps, n.appear(i));
          const hot = active === i;
          const since = t - n.appear(i + 1);
          const here = i < steps.length - 1 && since >= 0 && since < RUN;
          const pct = here ? (since / RUN) * 100 : 0;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center'}}>
              <div style={{
                ...enter,
                transform: `${enter.transform} translateY(${hot ? -p * 4 : 0}px)`,
                border: `1px solid ${hot ? C.primary : C.border}`,
                background: C.card,
                color: hot ? C.primary : C.body,
                boxShadow: hot ? `0 0 34px ${C.glow}` : 'none',
                // 兩行以上的說明放在膠囊裡，第二行會貼到兩端的半圓 → 改大圓角矩形、文字置中（2026-10-04 使用者抽檢 1-14）
                borderRadius: R.lg, padding: '24px 40px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,   // 6→12：字放大後標題與說明黏在一起（品檢「間距過小」）
                minWidth: 170,
              }}>
                <span style={{fontSize: T.h3, fontWeight: 600}}><Phrases text={s.label} /></span>
                {s.note && (
                  <span style={{fontSize: T.cardNote, color: hot ? C.body : C.muted, textAlign: 'center'}}><Phrases text={s.note} /></span>
                )}
              </div>

              {i < steps.length - 1 && (
                <div style={{
                  ...rise(f, fps, n.appear(i + 1) - 0.1),
                  position: 'relative', width: 96, height: 3,
                  background: C.border, margin: '0 10px', borderRadius: 2,
                }}>
                  {/* 沿線前進的光點 */}
                  <div style={{
                    position: 'absolute', top: -3, left: `${pct}%`,
                    width: 9, height: 9, borderRadius: '50%',
                    background: C.primary, opacity: here ? 1 : 0,
                    boxShadow: `0 0 12px ${C.primary}`,
                  }} />
                  <div style={{
                    position: 'absolute', right: -9, top: -6,
                    borderLeft: `10px solid ${C.primary}`,
                    borderTop: '7px solid transparent',
                    borderBottom: '7px solid transparent',
                    opacity: 0.85,
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {footer && (
        <div style={{...rise(f, fps, fAt), color: C.body, fontSize: T.h3, marginTop: 60}}>
          <Phrases text={footer} />
        </div>
      )}
    </AbsoluteFill>
  );
};
