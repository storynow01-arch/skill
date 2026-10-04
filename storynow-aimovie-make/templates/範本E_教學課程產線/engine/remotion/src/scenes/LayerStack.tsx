import {useCurrentFrame, useVideoConfig, AbsoluteFill} from 'remotion';
import {Phrases} from '../Phrases';
import {C, T, FONT, R} from '../theme';
import {rise} from '../anim';
import {narrate, FocusPlan} from '../beats';

export type Layer = {name: string; role: string; tag?: string; cue?: string};

/**
 * 分層堆疊圖：由上而下逐層淡入，焦點依節拍在各層之間移動。
 * 拉片來源：Gary Chen 影片中的「前端 / 後端」「三層協定」堆疊圖。
 *
 * 動態：焦點層外光暈連續呼吸，並有一道資料往下穿層的光點。
 * 用於 HTTP/TCP/IP 分層、雲端服務模式分層這類「上下關係」的概念。
 */
export const LayerStack: React.FC<{
  heading?: string; layers: Layer[]; footer?: string; footerAt?: number; focusPlan?: FocusPlan; durSec?: number;
}> = ({heading, layers, footer, footerAt, focusPlan, durSec = 16}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;

  const n = narrate(t, focusPlan, layers.length, 0.9, 0.16);
  const active = n.active;
  const p = n.pulse;
  const fAt = footerAt ?? Math.max(durSec - 3.5, durSec * 0.72);

  // 2026-10-04：說明字放大到 38px 後會換行、貼到下一層 → 列加寬到 1320（安全區內）、列高 112，說明行距 1.25
  const ROW_H = 112;
  const GAP = 14;
  // 光點標示目前唸到的那一層：切換時用 0.5 秒滑過去，之後停住；全部唸完就收起來
  const rowY = (i: number) => i * (ROW_H + GAP) + ROW_H / 2 - 5;
  let prev = -1, cur = -1, sw = 0;
  for (const [at, i] of focusPlan ?? []) if (t >= at && i !== cur) { prev = cur; cur = i; sw = at; }
  const k = Math.min(1, Math.max(0, (t - sw) / 0.5));
  const dropY = active < 0 ? 0 : prev < 0 ? rowY(active) : rowY(prev) + (rowY(active) - rowY(prev)) * k;

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT}}>
      {heading && (
        <div style={{...rise(f, fps, 0), color: C.text, fontSize: T.h2, fontWeight: 700, marginBottom: 54}}>
          <Phrases text={heading} />
        </div>
      )}

      <div style={{position: 'relative', display: 'flex', flexDirection: 'column', gap: GAP}}>
        {/* 穿層而過的資料光點 */}
        <div style={{
          position: 'absolute', left: -26, top: dropY,
          width: 10, height: 10, borderRadius: '50%', opacity: active < 0 ? 0 : 1,
          background: C.primary, boxShadow: `0 0 14px ${C.primary}`,
        }} />

        {layers.map((l, i) => {
          const enter = rise(f, fps, n.appear(i));
          const hot = active === i;
          return (
            <div key={i} style={{
              ...enter,
              opacity: (enter.opacity as number) * (hot || active === -1 ? 1 : 0.45),
              transform: `${enter.transform} translateX(${hot ? p * 6 : 0}px)`,
              width: 1320, height: ROW_H,
              background: C.card,
              border: `1px solid ${hot ? C.primary : C.border}`,
              boxShadow: hot ? `0 0 34px ${C.glow}` : 'none',
              borderRadius: R.md,
              display: 'flex', alignItems: 'center', gap: 28, padding: '0 38px',
            }}>
              <div style={{
                minWidth: 132, color: hot ? C.primary : C.text,
                fontSize: T.cardTitle, fontWeight: 700,
              }}>
                {l.name}
              </div>
              <div style={{width: 1, height: 52, background: C.border}} />
              <div style={{color: hot ? C.body : C.muted, fontSize: T.body, flex: 1, lineHeight: 1.25}}>
                <Phrases text={l.role} />
              </div>
              {l.tag && (
                <div style={{
                  color: hot ? C.primary : C.muted, fontSize: T.cardNote,
                  border: `1px solid ${hot ? C.primary : C.border}`,
                  borderRadius: R.pill, padding: '8px 18px', whiteSpace: 'nowrap',
                }}>
                  {l.tag}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {footer && t >= fAt && (
        <div style={{...rise(f, fps, fAt), color: C.body, fontSize: T.h3, marginTop: 48}}>
          <Phrases text={footer} />
        </div>
      )}
    </AbsoluteFill>
  );
};
