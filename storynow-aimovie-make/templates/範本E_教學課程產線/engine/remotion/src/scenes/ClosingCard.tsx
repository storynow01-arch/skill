import {useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill} from 'remotion';
import {Phrases} from '../Phrases';
import {C, T, FONT, R} from '../theme';
import {rise} from '../anim';
import {schedule} from '../beats';
import {StarField} from '../chrome/StarField';
import {useSweep} from '../chrome/Shimmer';

/**
 * 結語卡。
 *
 * takeaway 可以是一句或多句：多句時逐句浮現。
 * 2026-10-03 起：每一句、每個重點詞、下一節預告都在旁白唸到時才出現（lineAts／recapAts／teaserAt
 * 由 build_data.py 依旁白算出）；全部出現後固定，取消每拍整塊沉降與循環光掃。
 * 實測依據：原本單句版靜止比例 96.5%、最長靜止 17.8 秒 ——
 * 旁白其實常常講了兩句帶走重點，畫面卻只顯示一句，內容密度不足。
 */
export const ClosingCard: React.FC<{
  takeaway: string | string[]; recap?: string[]; nextTeaser?: string; durSec?: number;
  lineAts?: number[]; recapAts?: number[]; teaserAt?: number;
}> = ({takeaway, recap = [], nextTeaser, durSec = 14, lineAts, recapAts, teaserAt: teaserCue}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;

  const lines = Array.isArray(takeaway) ? takeaway : [takeaway];
  const beats = schedule(durSec);
  const p = 0;
  const sweep = useSweep(3.6, true);
  const drop = 0;

  // 第 i 句在第 i 個節拍浮現；最後一句之後留時間給「下一節」
  const lineAt = (i: number) => lineAts?.[i] ?? (i === 0 ? 0 : beats[Math.min(i, beats.length - 1)] ?? 0);
  // 重點詞接在結語之後逐一浮現，最後才是下一節預告 ——
  // 否則 8 秒就把畫面填滿，剩下 13 秒完全靜止（實測）。
  const recapAt = (i: number) => recapAts?.[i] ?? beats[Math.min(lines.length + i, beats.length - 1)] ?? 99;
  const teaserAt = teaserCue ?? beats[Math.min(lines.length + recap.length, beats.length - 1)] ?? 3.5;

  const lineW = interpolate(f, [0.6 * fps, 1.2 * fps], [0, 110],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center',
                          // 下方留 80px 給字幕帶：內容在「安全區頂 100～字幕頂 940」之間置中
                          fontFamily: FONT, padding: '0 160px 80px'}}>
      <StarField count={44} />

      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center',
                   transform: `translateY(${-drop}px)`}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
        {lines.map((line, i) => {
          const at = lineAt(i);
          if (t < at) return null;
          const e = rise(f, fps, at);
          const isFirst = i === 0;
          return (
            <div key={i} style={{
              ...e,
              fontSize: isFirst ? T.h1 : T.h2,
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.3,
              color: isFirst ? undefined : C.body,
            }}>
              {isFirst ? <span style={sweep}><Phrases text={line} /></span> : <Phrases text={line} />}
            </div>
          );
        })}
      </div>

      <div style={{width: lineW + p * 30, height: 3, background: C.primary,
                   marginTop: 26, borderRadius: 2,
                   boxShadow: `0 0 ${8 + p * 16}px ${C.glow}`}} />

      {recap.length > 0 && (
        <div style={{display: 'flex', gap: 16, marginTop: 30, flexWrap: 'wrap',
                     justifyContent: 'center', maxWidth: 1400}}>
          {recap.map((r, i) => {
            const at = recapAt(i);
            if (t < at) return null;
            const e = rise(f, fps, at);
            return (
              <div key={i} style={{
                ...e,
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: R.pill, padding: '10px 26px',
                color: C.body, fontSize: T.cardNote,
              }}>
                <Phrases text={r} />
              </div>
            );
          })}
        </div>
      )}

      {nextTeaser && t >= teaserAt && (
        <div style={{...rise(f, fps, teaserAt), display: 'flex', alignItems: 'center', gap: 16,
                     marginTop: 34,
                     border: `1px solid ${p > 0.25 ? C.primary : C.border}`,
                     borderRadius: R.pill, padding: '10px 30px',
                     boxShadow: p > 0.25 ? `0 0 ${14 + p * 14}px ${C.glow}` : 'none'}}>
          <span style={{color: C.muted, fontSize: T.cardNote}}>下一節</span>
          <span style={{color: C.primary, fontSize: T.cardNote,
                        transform: `translateX(${p * 9}px)`}}>→</span>
          <span style={{color: C.text, fontSize: T.h3, fontWeight: 600}}><Phrases text={nextTeaser} /></span>
        </div>
      )}
      </div>
    </AbsoluteFill>
  );
};
