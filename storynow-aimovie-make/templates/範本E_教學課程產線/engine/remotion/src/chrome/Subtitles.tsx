import {useCurrentFrame, useVideoConfig, Sequence, AbsoluteFill} from 'remotion';
import {createTikTokStyleCaptions} from '@remotion/captions';
import type {Caption, TikTokPage} from '@remotion/captions';
import {useMemo} from 'react';
import {C, T, FONT, L} from '../theme';

/**
 * 底部字幕帶。實測自 Gary Chen 原片：y954-992，置中，白字無底板。
 *
 * 改用官方 @remotion/captions 的 createTikTokStyleCaptions() 分頁，
 * 取代原本手刻的 SRT 解析與長句切分邏輯。
 * combineTokensWithinMilliseconds 設大一點，讓中文維持「一句一行」，
 * 而不是 TikTok 那種逐詞跳動 —— 原片是前者。
 */
const COMBINE_MS = 2600;

export const Subtitles: React.FC<{captions: Caption[]}> = ({captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const {pages} = useMemo(
    () => createTikTokStyleCaptions({captions, combineTokensWithinMilliseconds: COMBINE_MS}),
    [captions]
  );

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {pages.map((page: TikTokPage, i) => {
        const next = pages[i + 1] ?? null;
        // 起訖都先換成整數格再相減。早期寫法是 from、長度各自四捨五入，
        // 兩頁接縫會多出 1 格空白 —— 字幕閃一下，觀眾看起來像在抖（EP1+EP2 實測 70 多處）。
        const from = Math.round((page.startMs / 1000) * fps);
        const to = next
          ? Math.round((next.startMs / 1000) * fps)
          : from + Math.round((COMBINE_MS / 1000) * fps);
        const dur = to - from;
        if (dur <= 0) return null;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Line text={page.text} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Line: React.FC<{text: string}> = ({text}) => (
  <div style={{position: 'absolute', top: L.subtitle.y - 14, left: 0, width: '100%',
               display: 'flex', justifyContent: 'center'}}>
    <div data-qa="caption" style={{fontFamily: FONT, fontSize: T.subtitle, fontWeight: 500, color: C.subtitleText,
                 background: C.subtitleBg, padding: '6px 22px', borderRadius: 8,
                 maxWidth: 1480, textAlign: 'center', lineHeight: 1.3}}>
      {text}
    </div>
  </div>
);
