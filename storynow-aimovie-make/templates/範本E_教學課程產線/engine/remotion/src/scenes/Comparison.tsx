import {useCurrentFrame, useVideoConfig, AbsoluteFill} from 'remotion';
import {Phrases} from '../Phrases';
import {C, T, FONT, R} from '../theme';
import {rise} from '../anim';
import {narrate, FocusPlan} from '../beats';

type Side = {frame: 'danger' | 'success' | 'primary'; icon: string; text: string};

/**
 * 左右對照。
 * 左、右兩邊在旁白唸到時各自出場並亮起（focusPlan 第 0 項＝左、第 1 項＝右）；
 * 兩邊都唸完後固定全亮，不再循環（2026-10-03 前是依節拍「兩邊→左→右」輪播，跟旁白無關）。
 */
export const Comparison: React.FC<{
  left: Side; mid?: string; right: Side; footerPill?: string; footerAt?: number;
  heading?: string; focusPlan?: FocusPlan; durSec?: number;
}> = ({left, mid = '≠', right, footerPill, footerAt, heading, focusPlan, durSec = 14}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;

  // 沒有 focusPlan 時退回舊的出場時間（左 0s、右 2.6s），但不輪播
  const n = narrate(t, focusPlan, 2, 0, 2.6);
  const p = n.pulse;
  const phase = n.active === 0 ? 1 : n.active === 1 ? 2 : 0;
  const fAt = footerAt ?? Math.max(durSec - 4.0, durSec * 0.6);

  const col = (k: Side['frame']) =>
    k === 'danger' ? C.danger : k === 'success' ? C.success : C.primary;

  const box = (s: Side, delay: number, hot: boolean, dim: boolean) => {
    const e = rise(f, fps, delay);
    return (
      <div style={{
        ...e,
        opacity: (e.opacity as number) * (dim ? 0.35 : 1),
        transform: `${e.transform} scale(${hot ? 1 + p * 0.015 : 1})`,
        background: C.card,
        border: `1px solid ${col(s.frame)}`,
        borderRadius: R.md,
        boxShadow: hot ? `0 0 38px ${C.glow}` : 'none',
        padding: '46px 50px', width: 660, minHeight: 210,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18,
      }}>
        <div style={{fontSize: 52, color: col(s.frame), lineHeight: 1}}>{s.icon}</div>
        <div style={{color: C.text, fontSize: T.h3, fontWeight: 600, lineHeight: 1.45,
                     wordBreak: 'keep-all', lineBreak: 'strict'}}><Phrases text={s.text} /></div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT}}>
      {/* 標題一開場就出現：左右兩邊要等旁白唸到才出場，沒有標題時畫面會空好幾秒（1-4 S6 前 12 秒全空） */}
      {heading && (
        <div style={{...rise(f, fps, 0), color: C.text, fontSize: T.h2, fontWeight: 700, marginBottom: 64}}>
          <Phrases text={heading} />
        </div>
      )}
      <div style={{display: 'flex', alignItems: 'center', gap: 44}}>
        {box(left, n.appear(0), phase === 1, phase === 2)}
        <div style={{...rise(f, fps, n.appear(1) - 0.3), color: C.muted, fontSize: 64, fontWeight: 300}}>
          {mid}
        </div>
        {box(right, n.appear(1), phase === 2, phase === 1)}
      </div>
      {footerPill && t >= fAt && (
        <div style={{...rise(f, fps, fAt), color: C.muted, fontSize: T.cardNote, marginTop: 56,
                     border: `1px solid ${C.border}`, borderRadius: R.pill, padding: '12px 28px'}}>
          <Phrases text={footerPill} />
        </div>
      )}
    </AbsoluteFill>
  );
};
