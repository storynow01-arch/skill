/** 特效試作（2026-10-06，使用者：六項提升挑兩節試作，看效果再決定要不要全面加入）。
 *  全部 opt-in：data.fx 沒設就跟原本一模一樣，正式版不受影響。
 *  守住三條規則：物件跟著旁白出現、不重複循環、不突然跳動（所有效果都是漸變、只播一次）。
 *    pushIn    ① 聚光燈＋微推近：每個場景整體 1.0 → 1.025 緩慢放大；概念卡非焦點壓得更暗
 *    kinetic   ② 數字滾動：卡片／footer 裡的數字在出現時從 0 滾到目標值（0.8 秒，之後固定）
 *    terminal  ③ 終端機打字：scene type "terminal"（Terminal.tsx）
 *    callback  ④ 前後呼應：結語卡帶回本節開頭的比喻圖示（ClosingCard props.callback）
 *    sfx       ⑤ 輕音效：卡片亮起、測驗揭曉、換場（Section.tsx，音量約 −20dB）
 *    quiz      ⑥ 測驗小儀式：思考停頓的倒數圈＋揭曉時答案橘色光暈一次 */
import React, {createContext, useContext} from 'react';
import {interpolate} from 'remotion';

export type FxFlags = {pushIn?: boolean; kinetic?: boolean; callback?: boolean; sfx?: boolean; quiz?: boolean;
  sfxVolume?: number};
export const FxContext = createContext<FxFlags>({});
export const useFx = () => useContext(FxContext);

/** ② 數字滾動：t 是從「這段文字出現」起算的秒數。只滾 2 以上的數字（避免「第 1」「1 個」也在跳）。 */
export const kineticText = (text: string, t: number, dur = 0.8): string => {
  if (t >= dur) return text;
  const k = interpolate(t, [0, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ease = 1 - Math.pow(1 - k, 3);
  return text.replace(/\d+(?:\.\d+)?/g, (m) => {
    const v = parseFloat(m);
    if (v < 2) return m;
    const dec = (m.split('.')[1] ?? '').length;
    return (v * ease).toFixed(dec);
  });
};

/** ① 微推近：場景從 1.0 慢慢放大到 1.025（整個場景時間，線性、不回彈） */
export const pushScale = (t: number, durSec: number) =>
  1 + 0.025 * interpolate(t, [0, Math.max(1, durSec)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
