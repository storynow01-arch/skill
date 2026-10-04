/** 節拍排程 —— 落實 garychen-dark.yaml 的鐵律：畫面絕不靜止超過 4 秒。
 *
 *  Gary Chen 兩支參考片實測最長連續靜止 3.8s / 4.0s。
 *  組件不再手寫死幾個時間點，而是依場景總長自動排出等間隔節拍，
 *  再把自己的元素（卡片、膠囊、選項）循環套上去，長場景也不會出現空窗。
 */
export const INTERVAL = 3.5;   // 秒；規格值 micro_beat_interval_seconds
export const FIRST = 1.6;      // 首拍：等進場動畫落地後再開始
export const MAX_STILL = 4.0;  // 秒；超過即違規

/** 依場景長度產生節拍時間點。
 *  不是固定間隔往後排（那樣結尾會留尾巴），而是把 FIRST→結束這段均分成 n 等份，
 *  n 取到讓每段 ≤ INTERVAL。如此首拍、拍間、尾端三種間隔都保證 ≤ INTERVAL ≤ MAX_STILL。 */
export const schedule = (durSec: number): number[] => {
  const span = durSec - FIRST;
  if (span <= 0) return [0];
  const n = Math.max(1, Math.ceil(span / INTERVAL));
  const gap = span / n;
  return Array.from({length: n}, (_, i) => Number((FIRST + i * gap).toFixed(2)));
};

/** 目前在第幾拍（尚未開始為 -1） */
export const beatAt = (t: number, beats: number[]): number => {
  let i = -1;
  for (let k = 0; k < beats.length; k++) if (t >= beats[k]) i = k;
  return i;
};

/** 把第 n 拍映射到 count 個元素上，循環輪播 */
export const cycle = (t: number, beats: number[], count: number): number => {
  const b = beatAt(t, beats);
  return b < 0 ? -1 : b % count;
};

/** 節拍觸發後的短暫脈衝 0→1→0，用於「剛被點到」的強調 */
export const pulse = (t: number, beats: number[], dur = 0.5): number => {
  const b = beatAt(t, beats);
  if (b < 0) return 0;
  const since = t - beats[b];
  if (since > dur) return 0;
  return Math.sin((since / dur) * Math.PI);
};

/** 連續呼吸 0→1→0，不依節拍。
 *  用於「已經定案」的元素（揭曉後的正解、當前焦點卡片的外光暈）：
 *  節拍脈衝是瞬間的，兩拍之間仍會靜止；呼吸是連續的，畫面永遠在變。 */
export const breathe = (t: number, period = 2.4, phase = 0): number =>
  0.5 + 0.5 * Math.sin((t / period) * Math.PI * 2 + phase);

/** 內容驅動的焦點計畫：[[秒數, 該亮第幾項], ...]
 *  由 build_data.py 依旁白的句級時間軸算出 —— 旁白講到第三張卡，畫面才亮第三張。
 *
 *  ⚠ 時間點一定要帶著項目索引。早期版本只給時間陣列、用「索引 % 項目數」推，
 *    補間隔時插入額外時間點就會整組錯位。 */
export type FocusPlan = [number, number][];

export const focusFrom = (t: number, plan: FocusPlan | undefined): number => {
  if (!plan || plan.length === 0) return -1;
  let idx = -1;
  for (const [at, i] of plan) if (t >= at) idx = i;
  return idx;
};

/** 旁白驅動的出場與焦點（2026-10-03 改版，取代 cycle() 計時輪播）。
 *
 *  使用者要求：「文本唸到的時候物件要跟著動；唸完之後固定，不要不斷循環。」
 *    - 第 i 項在旁白唸到它時才出場（plan 裡它第一次出現的時間，提早 LEAD 秒開始浮出）
 *    - 唸到哪一項就亮哪一項，其他已出場的項目淡一點
 *    - 最後一項唸完 HOLD 秒後，全部恢復全亮並固定；之後不再有任何週期性變化
 *  沒有 plan（找不到旁白對應）時：依序快速出場，全部全亮，不輪播。 */
export const LEAD = 0.15;
export const HOLD = 1.6;

export type Narration = {
  /** 第 i 項開始出場的秒數 */
  appear: (i: number) => number;
  /** 目前被唸到的項目；-1 = 沒有焦點（全部全亮） */
  active: number;
  /** 全部唸完並已固定 */
  done: boolean;
  /** 焦點剛切換時的一次性脈衝 0→1→0（只在切換當下，不循環） */
  pulse: number;
};

export const narrate = (t: number, plan: FocusPlan | undefined, count: number,
                        fallbackStart = 1.0, stagger = 0.15): Narration => {
  if (!plan || plan.length === 0) {
    return {appear: (i) => fallbackStart + i * stagger, active: -1, done: true, pulse: 0};
  }
  const first = new Map<number, number>();
  for (const [at, i] of plan) if (!first.has(i)) first.set(i, at);
  const lastAt = Math.max(...plan.map(([at]) => at));
  const done = t >= lastAt + HOLD;
  return {
    appear: (i) => Math.max(0, (first.get(i) ?? fallbackStart + i * stagger) - LEAD),
    active: done ? -1 : focusFrom(t, plan),
    done,
    pulse: done ? 0 : focusPulse(t, plan),
  };
};

/** 焦點剛切換時的短暫脈衝，讓「切到這一項」有重量 */
export const focusPulse = (t: number, plan: FocusPlan | undefined, dur = 0.55): number => {
  if (!plan || plan.length === 0) return 0;
  let last = -1;
  for (const [at] of plan) if (t >= at) last = at;
  if (last < 0) return 0;
  const since = t - last;
  return since > dur ? 0 : Math.sin((since / dur) * Math.PI);
};
