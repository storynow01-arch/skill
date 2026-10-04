import {useCurrentFrame, useVideoConfig, AbsoluteFill} from 'remotion';
import {Phrases} from '../Phrases';
import {C, T, FONT, R} from '../theme';
import {rise} from '../anim';
import {narrate, FocusPlan} from '../beats';

export type Card = {n?: number; icon?: string; title: string; note?: string;
  /** 旁白講到這個詞時才亮起；由 build_data.py 查詞級時間戳轉成 focusAt */
  cue?: string};

/**
 * 2–4 張並排卡片。
 * 每張卡在旁白唸到它時才出場並亮起；全部唸完後固定全亮，不再輪播。
 */
export const ConceptCards: React.FC<{
  heading?: string; cards: Card[]; footer?: string; footerAt?: number; focusPlan?: FocusPlan; durSec?: number;
}> = ({heading, cards, footer, footerAt, focusPlan, durSec = 12}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;

  const n = narrate(t, focusPlan, cards.length, 1.2);
  const active = n.active;
  const p = n.pulse;
  const fAt = footerAt ?? Math.max(durSec - 4.5, durSec * 0.65);
  // 卡片寬依張數自動縮：舊版固定 450px，4 張時總寬 1896px，左右只剩 12～32px（1-14 S8 品檢抓到）
  const GAP = 32;
  const cardW = Math.min(450, Math.floor((1920 - 2 * 120 - GAP * (cards.length - 1)) / cards.length));

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT, padding: '0 120px'}}>
      {heading && (
        <div style={{...rise(f, fps, 0), color: C.text, fontSize: T.h2, fontWeight: 700, marginBottom: 68}}>
          <Phrases text={heading} />
        </div>
      )}

      <div style={{display: 'flex', gap: GAP}}>
        {cards.map((c, i) => {
          const enter = rise(f, fps, n.appear(i));
          const on = active === -1 || active === i;
          const hot = active === i;
          return (
            <div key={i} style={{
              ...enter,
              opacity: (enter.opacity as number) * (0.38 + 0.62 * n.weight(i)),
              transform: `${enter.transform} scale(${hot ? 1 + p * 0.018 : 1})`,
              background: C.card,
              border: `1px solid ${hot ? C.primary : C.border}`,
              boxShadow: hot ? `0 0 36px ${C.glow}` : 'none',
              borderRadius: R.md, padding: cardW < 420 ? 34 : 44, width: cardW, minHeight: 310, position: 'relative',
            }}>
              {c.n !== undefined && (
                <div style={{position: 'absolute', top: 18, left: 22,
                             color: hot ? C.primary : C.muted, fontSize: T.label}}>{c.n}</div>
              )}
              {c.icon && (
                <div style={{fontSize: 76, marginTop: 30, marginBottom: 24, lineHeight: 1,
                             transform: `translateY(${hot ? -p * 5 : 0}px)`}}>{c.icon}</div>
              )}
              <div style={{color: C.text, fontSize: T.cardTitle, fontWeight: 600}}><Phrases text={c.title} /></div>
              {c.note && (
                <div style={{color: hot ? C.body : C.muted, fontSize: T.cardNote,
                             marginTop: 14, lineHeight: 1.5}}><Phrases text={c.note} /></div>
              )}
            </div>
          );
        })}
      </div>

      {footer && (
        <div style={{...rise(f, fps, fAt), color: C.body, fontSize: T.h3, marginTop: 54}}>
          <Phrases text={footer} />
        </div>
      )}
    </AbsoluteFill>
  );
};
