import {useCurrentFrame, useVideoConfig, AbsoluteFill} from 'remotion';
import {Phrases} from '../Phrases';
import {C, T, FONT, R} from '../theme';
import {rise, wipe} from '../anim';
import {narrate, FocusPlan} from '../beats';
import {useSweep} from '../chrome/Shimmer';

/**
 * 定義卡：關鍵詞橘色高亮擦出；註解標籤依節拍循環。
 *
 * 動態設計依據實測修正過一次：
 *   原本只有小膠囊變色 + 光暈呼吸，實測靜止比例 96.2%、最長靜止 24.2 秒。
 *   改為「大面積變化」——
 *     1. 主文字有橫向光掃（逐幀移動，整行寬度）
 *     2. 非焦點的註解標籤降到 0.3 不透明（跟 concept_cards 同一招，已驗證有效）
 */
export const DefinitionCard: React.FC<{
  bigText: string; label?: string; highlight?: string; sideNotes?: string[]; focusPlan?: FocusPlan; durSec?: number;
}> = ({bigText, label, highlight, sideNotes = [], focusPlan, durSec = 14}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;

  const nr = narrate(t, focusPlan, sideNotes.length, 3.0);
  const active = !sideNotes.length ? -1 : nr.active;
  const p = nr.pulse;
  // 光掃只在進場時掃過一次，不循環（2026-10-03 使用者要求：唸完就固定）
  const sweep = useSweep(3.4, true);

  const parts = highlight && bigText.includes(highlight) ? bigText.split(highlight) : null;

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT}}>
      {label && (
        <div style={{...rise(f, fps, 0), color: C.primary, fontSize: T.label,
                     letterSpacing: 3, marginBottom: 34}}>
          {label}
        </div>
      )}

      <div style={{...rise(f, fps, 0.15), fontSize: T.h1, fontWeight: 700, position: 'relative'}}>
        {parts ? (
          <>
            <span style={sweep}>{parts[0]}</span>
            <span style={{position: 'relative', display: 'inline-block'}}>
              <span style={{position: 'absolute', inset: '-4px -10px', background: C.primary,
                            borderRadius: 6, boxShadow: `0 0 26px ${C.glow}`,
                            ...wipe(f, fps, 1.6)}} />
              <span style={{position: 'relative', color: C.bg}}>{highlight}</span>
            </span>
            <span style={sweep}>{parts[1]}</span>
          </>
        ) : (
          <span style={sweep}>{bigText}</span>
        )}
      </div>

      {sideNotes.length > 0 && (
        <div style={{display: 'flex', gap: 26, marginTop: 64}}>
          {sideNotes.map((n, i) => {
            const hot = active === i;
            const e = rise(f, fps, nr.appear(i));
            return (
              <div key={i} style={{
                ...e,
                // 改成正式卡片：小膠囊的變色在 480x270 量不到，觀眾也看不明顯。
                // 大面積不透明度切換才是實測有效的那一招（concept_cards 用同一套）。
                opacity: (e.opacity as number) * (0.32 + 0.68 * nr.weight(i)),
                transform: `${e.transform} scale(${hot ? 1 + p * 0.025 : 1})`,
                background: C.card,
                border: `1px solid ${hot ? C.primary : C.border}`,
                boxShadow: hot ? `0 0 36px ${C.glow}` : 'none',
                borderRadius: R.md,
                // 固定 330px 時 46px 字一行只放得下 5～6 字，「每台裝／置一個」被切開 → 寬度隨內容
                minWidth: 330, maxWidth: 620, minHeight: 132,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 28px', textAlign: 'center',
                color: hot ? C.primary : C.body,
                fontSize: T.h3, fontWeight: hot ? 700 : 500,
              }}>
                <Phrases text={n} />
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
