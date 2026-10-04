import {useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate} from 'remotion';
import {Phrases} from '../Phrases';
import {Circle} from '@remotion/shapes';
import {C, T, FONT, R} from '../theme';
import {rise} from '../anim';
import {narrate, FocusPlan} from '../beats';

export type Node = {label: string; note?: string; icon?: string; cue?: string};

/**
 * 架構連線圖：節點排成一列。節點在旁白唸到時出場，光點沿著「上一個節點 → 這個節點」
 * 的連線跑一次（0.8 秒）；全部唸完後固定，不再循環流動（2026-10-03 使用者要求）。
 *
 * 拉片來源：Gary Chen 影片中的「前端 ↔ 後端」「客戶端 → 雲端機房」資料流圖 ——
 * 平滑連線加上移動的光點。
 *
 * 這是我們畫面靜止比例（82%）與原片（72%）差距的主因：
 * 他有持續流動的連線動畫，我們原本只有會停的卡片。
 * 光點逐幀移動，本質上不可能靜止。
 *
 * 用 @remotion/shapes 的 <Circle> 畫節點，不自己刻 SVG。
 */
export const NetworkDiagram: React.FC<{
  heading?: string; nodes: Node[]; footer?: string; footerAt?: number; focusPlan?: FocusPlan; durSec?: number;
}> = ({heading, nodes, footer, footerAt, focusPlan, durSec = 16}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;

  const nr = narrate(t, focusPlan, nodes.length, 0.9, 0.16);
  const active = nr.active;
  const p = nr.pulse;
  const fAt = footerAt ?? Math.max(durSec - 3.5, durSec * 0.72);

  const NODE = 128;
  // 節點欄寬依數量自動算（舊版固定 190px，字放大後「權威伺服器」放不下）：總寬控制在安全區 1760px 內
  const LINK = nodes.length >= 5 ? 80 : 120;
  const COL = Math.min(320, Math.floor((1760 - LINK * (nodes.length - 1)) / nodes.length));
  const RUN = 0.8;

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT}}>
      {heading && (
        <div style={{...rise(f, fps, 0), color: C.text, fontSize: T.h2, fontWeight: 700, marginBottom: 76}}>
          <Phrases text={heading} />
        </div>
      )}

      <div style={{display: 'flex', alignItems: 'flex-start'}}>
        {nodes.map((n, i) => {
          const enter = rise(f, fps, nr.appear(i));
          const hot = active === i;
          const since = t - nr.appear(i + 1);
          const onThisLink = i < nodes.length - 1 && since >= 0 && since < RUN;
          const linkPct = onThisLink ? (since / RUN) * 100 : 0;

          return (
            <div key={i} style={{display: 'flex', alignItems: 'flex-start'}}>
              {/* 節點 */}
              <div style={{...enter, width: COL, display: 'flex',
                           flexDirection: 'column', alignItems: 'center', gap: 16}}>
                <div style={{position: 'relative', width: NODE, height: NODE,
                             transform: `scale(${hot ? 1 + p * 0.05 : 1})`}}>
                  <Circle
                    radius={NODE / 2}
                    fill={C.card}
                    stroke={hot ? C.primary : C.border}
                    strokeWidth={hot ? 2.5 : 1.5}
                    style={{filter: hot ? `drop-shadow(0 0 24px ${C.primary})` : 'none'}}
                  />
                  <div style={{position: 'absolute', inset: 0, display: 'flex',
                               alignItems: 'center', justifyContent: 'center', fontSize: 52}}>
                    {n.icon ?? '🖥️'}
                  </div>
                </div>
                <div style={{color: hot ? C.primary : C.text, fontSize: T.h3,
                             fontWeight: 600, textAlign: 'center'}}>
                  <Phrases text={n.label} />
                </div>
                {n.note && (
                  <div style={{color: hot ? C.body : C.muted, fontSize: T.cardNote,
                               textAlign: 'center', lineHeight: 1.4, maxWidth: COL - 10}}>
                    <Phrases text={n.note} />
                  </div>
                )}
              </div>

              {/* 連線 + 流動光點 */}
              {i < nodes.length - 1 && (
                <div style={{...rise(f, fps, nr.appear(i + 1) - 0.1),
                             width: LINK, marginTop: NODE / 2 - 2, position: 'relative'}}>
                  <div style={{height: 3, background: C.border, borderRadius: 2}} />
                  <div style={{position: 'absolute', top: -4, left: `${linkPct}%`,
                               width: 11, height: 11, borderRadius: '50%',
                               background: C.primary, opacity: onThisLink ? 1 : 0,
                               boxShadow: `0 0 14px ${C.primary}`}} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {footer && t >= fAt && (
        <div style={{...rise(f, fps, fAt), color: C.body, fontSize: T.h3, marginTop: 64}}>
          <Phrases text={footer} />
        </div>
      )}
    </AbsoluteFill>
  );
};
