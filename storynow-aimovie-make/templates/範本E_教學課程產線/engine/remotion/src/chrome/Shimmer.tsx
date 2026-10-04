import {useCurrentFrame, useVideoConfig} from 'remotion';
import {C} from '../theme';

/**
 * 橫向光掃：一道柔和的亮帶緩慢掃過文字區塊。
 *
 * 為什麼需要這個 —— 實測發現的教訓：
 *   逐場景量測顯示 definition / closing_card / title_card 這類「元素少」的場景，
 *   靜止比例高達 96%，最長靜止 24 秒。原本靠光暈脈動、星點飄移撐場，
 *   但那些在 480x270 的量測解析度下被平均掉（星點縮到 0.4px），
 *   量不到就代表觀眾也看不到。
 *
 *   有通過的組件（concept_cards / layer_stack / network_diagram）共同點是
 *   「大面積變化」：整張卡片降到 0.38 不透明、光點橫跨整個畫面。
 *
 * 所以這道光掃是前景元素、大面積、逐幀移動 —— 不是背景漸層流動
 * （那個原片沒有，規格明確禁用）。
 */
export const Shimmer: React.FC<{
  width: number;
  height: number;
  periodSec?: number;
  strength?: number;
}> = ({width, height, periodSec = 3.2, strength = 0.16}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  // −40% → 140%，掃出畫面後再回頭
  const x = -40 + ((t / periodSec) % 1) * 180;

  return (
    <div style={{
      position: 'absolute', inset: 0, width, height,
      overflow: 'hidden', pointerEvents: 'none',
      maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
    }}>
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: `${x}%`, width: '34%',
        background: `linear-gradient(90deg, transparent, rgba(248,152,0,${strength}), transparent)`,
        filter: 'blur(14px)',
      }} />
    </div>
  );
};

/** 供組件內聯使用的漸層文字光掃（不需要知道尺寸）
 *  once=true：只在進場後掃過一次就停（2026-10-03 起所有場景都用這個，不再循環） */
export const useSweep = (periodSec = 3.2, once = false) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const START = 0.6;
  // 單次模式：0.6 秒後開始掃，掃完停在 p=1.2（亮帶已離開文字，看起來就是純白字）
  const p = once ? Math.min(1.2, Math.max(-0.2, (t - START) / periodSec)) : (t / periodSec) % 1;
  return {
    backgroundImage:
      `linear-gradient(100deg, ${C.text} 0%, ${C.text} ${Math.max(0, p * 100 - 14)}%, ` +
      `#FFE0A8 ${p * 100}%, ${C.text} ${Math.min(100, p * 100 + 14)}%, ${C.text} 100%)`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  } as const;
};
