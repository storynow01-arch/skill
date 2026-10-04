import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Phrases} from '../Phrases';
import {fitText} from '@remotion/layout-utils';
import {C, T, FONT, R, L} from '../theme';
import {StarField} from '../chrome/StarField';

/**
 * 片尾隨堂測驗卡 — 固定 6 秒。
 *   0–4s  題目 + 4 個選項 + 橘色倒數條
 *   4–6s  正解轉綠 + 勾號，其餘淡至 30%
 *
 * 版面：grid 用 minmax(0,1fr) 防止內容撐破欄寬（1fr 預設不會縮到小於 min-content，
 * 之前就是這個原因整組往右溢出 179px）。字級再用 fitText() 依實際文字長度自動收斂，
 * 讓 72 節長短不一的選項都不會爆框。
 */
const SNAPPY = {damping: 20, stiffness: 200} as const;
const LETTERS = ['A', 'B', 'C', 'D'];

const GRID_W = 1920 - L.safeX * 2;   // 1680
const GAP = 24;
const COL_W = (GRID_W - GAP) / 2;    // 828
const PAD_X = 32;
const BADGE = 52;
const BADGE_GAP = 20;
const TEXT_W = COL_W - PAD_X * 2 - BADGE - BADGE_GAP;   // 692

export const QAEndCard: React.FC<{
  question: string;
  options: string[];
  answerIndex: number;
  answerSec?: number;
  totalSec?: number;
}> = ({question, options, answerIndex, answerSec = 4, totalSec = 6}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const revealed = t >= answerSec;

  const titleIn = spring({frame, fps, config: SNAPPY});
  const countdown = interpolate(frame, [0, answerSec * fps], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const secsLeft = Math.max(0, Math.ceil(answerSec - t));

  // 題目：裝不下就自動縮，但不超過 h2
  const qFit = fitText({
    text: question,
    withinWidth: GRID_W,
    fontFamily: FONT,
    fontWeight: '700',
  });
  const qSize = Math.min(qFit.fontSize, T.h2);

  // 四個選項共用同一個字級 —— 取最長那一個算出來的值，版面才整齊
  const optSize = Math.min(
    T.h3,
    ...options.slice(0, 4).map(
      (o) => fitText({text: o, withinWidth: TEXT_W, fontFamily: FONT, fontWeight: '500'}).fontSize
    )
  );

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT}}>
      <StarField count={34} opacity={0.34} />
      <div style={{opacity: titleIn, color: C.primary, fontSize: T.label, letterSpacing: 4, marginBottom: 26}}>
        隨堂測驗
      </div>

      <div
        style={{
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 20}px)`,
          color: C.text,
          fontSize: qSize,
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.4,
          marginBottom: 18,
        }}
      >
        <Phrases text={question} />
      </div>

      <div style={{height: 56, display: 'flex', alignItems: 'center', gap: 18}}>
        {!revealed ? (
          <>
            <div style={{width: 360, height: 6, background: C.high, borderRadius: R.pill, overflow: 'hidden'}}>
              <div style={{width: `${countdown}%`, height: '100%', background: C.primary, borderRadius: R.pill}} />
            </div>
            <div style={{color: C.muted, fontSize: T.cardNote, minWidth: 40}}>{secsLeft}</div>
          </>
        ) : (
          <div style={{color: C.success, fontSize: T.cardNote, letterSpacing: 2}}>正解</div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          gap: GAP,
          marginTop: 14,
          width: GRID_W,
        }}
      >
        {options.slice(0, 4).map((o, i) => {
          const enter = spring({frame, fps, delay: Math.round((0.35 + i * 0.12) * fps), config: SNAPPY});
          const ok = revealed && i === answerIndex;
          const dim = revealed && i !== answerIndex;
          const pop = ok ? spring({frame, fps, delay: Math.round(answerSec * fps), config: SNAPPY}) : 0;
          return (
            <div
              key={i}
              style={{
                minWidth: 0,
                opacity: enter * (dim ? 0.3 : 1),
                transform: `translateY(${(1 - enter) * 18}px) scale(${1 + pop * 0.03})`,
                background: C.card,
                border: `1px solid ${ok ? C.success : C.border}`,
                boxShadow: ok ? '0 0 34px rgba(32,192,88,0.25)' : 'none',
                borderRadius: R.md,
                padding: `26px ${PAD_X}px`,
                display: 'flex',
                alignItems: 'center',
                gap: BADGE_GAP,
              }}
            >
              <div
                style={{
                  width: BADGE,
                  height: BADGE,
                  flexShrink: 0,
                  borderRadius: R.sm,
                  background: ok ? C.success : C.high,
                  color: ok ? C.bg : C.muted,
                  fontSize: T.cardNote,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {ok ? '✓' : LETTERS[i]}
              </div>
              <div
                style={{
                  minWidth: 0,
                  color: ok ? C.text : C.body,
                  fontSize: optSize,
                  fontWeight: ok ? 700 : 500,
                  wordBreak: 'keep-all',
                  lineBreak: 'strict',
                }}
              >
                <Phrases text={o} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
