/* 範本K 宇宙風圖示（viewBox 0 0 100 100，青色發光線條：寬的半透明底線＋亮線，不用濾鏡模糊）。
   <CosmosIcon icon=…> 找圖順序：①這裡的宇宙圖示（名稱或 emoji）②lib/sketches.ts 的線稿（改畫成青色發光線）③圓框＋emoji／短字。
   一律不會出現空白或「?」：沒給 icon 時畫星星。
   格式同 lib/comic/icons.tsx：COSMOS_ICONS（名稱→圖示）、EMOJI_TO_COSMOS（emoji→名稱），make_video 的圖示檢查會讀這兩個表。 */
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {sketchFor} from '../sketches';
import {CYAN, NOTO, ORANGE, ORB, pop} from './kit';

const LINE = '#bff8ff';
/** 一組發光線條：paths＝線、fills＝半透明填色的封閉形、dots＝[x,y,r] 橘色亮點 */
const ic = (paths: string[], fills: string[] = [], dots: [number, number, number][] = []) => (
  <g strokeLinecap="round" strokeLinejoin="round" fill="none">
    {fills.map((d, i) => <path key={`f${i}`} d={d} fill={CYAN} fillOpacity={0.16} stroke="none" />)}
    {paths.map((d, i) => <path key={`g${i}`} d={d} stroke={CYAN} strokeOpacity={0.28} strokeWidth={11} />)}
    {paths.map((d, i) => <path key={`l${i}`} d={d} stroke={LINE} strokeWidth={4.2} />)}
    {dots.map(([x, y, r], i) => <circle key={`d${i}`} cx={x} cy={y} r={r} fill={ORANGE} stroke="none" />)}
  </g>
);

export const COSMOS_ICONS: Record<string, React.ReactNode> = {
  rocket: ic(['M50 8 Q72 28 68 66 H32 Q28 28 50 8 Z', 'M32 50 L16 72 L32 66', 'M68 50 L84 72 L68 66', 'M42 70 L50 92 L58 70'], ['M50 8 Q72 28 68 66 H32 Q28 28 50 8 Z'], [[50, 36, 7]]),
  planet: ic(['M50 22 A28 28 0 1 1 49.9 22 Z', 'M14 62 Q4 74 30 70 Q60 64 86 46 Q100 34 84 34'], ['M50 22 A28 28 0 1 1 49.9 22 Z'], [[40, 42, 4]]),
  star: ic(['M50 10 L61 37 L90 39 L67 57 L75 86 L50 70 L25 86 L33 57 L10 39 L39 37 Z'], ['M50 10 L61 37 L90 39 L67 57 L75 86 L50 70 L25 86 L33 57 L10 39 L39 37 Z']),
  satellite: ic(['M40 40 L60 60', 'M36 44 L44 36 L64 56 L56 64 Z', 'M14 30 L30 14 L42 26 L26 42 Z', 'M58 74 L74 58 L86 70 L70 86 Z', 'M66 34 Q76 34 76 24', 'M66 26 Q70 26 70 22'], ['M36 44 L44 36 L64 56 L56 64 Z']),
  telescope: ic(['M14 46 L70 22 L76 36 L20 60 Z', 'M70 22 L84 16 L90 30 L76 36', 'M46 50 L30 90', 'M50 48 L66 90', 'M48 49 L48 90'], ['M14 46 L70 22 L76 36 L20 60 Z']),
  warning: ic(['M50 12 L90 84 H10 Z', 'M50 38 V60', 'M50 72 V73'], ['M50 12 L90 84 H10 Z']),
  clock: ic(['M50 14 A36 36 0 1 1 49.9 14 Z', 'M50 28 V50 L66 60'], ['M50 14 A36 36 0 1 1 49.9 14 Z'], [[50, 50, 4]]),
  hourglass: ic(['M28 12 H72', 'M28 88 H72', 'M32 12 Q32 40 50 50 Q68 40 68 12', 'M32 88 Q32 60 50 50 Q68 60 68 88'], ['M38 88 Q40 70 50 64 Q60 70 62 88 Z']),
  target: ic(['M50 12 A38 38 0 1 1 49.9 12 Z', 'M50 28 A22 22 0 1 1 49.9 28 Z', 'M50 50 L84 16', 'M76 14 L84 16 L86 24'], [], [[50, 50, 7]]),
  bulb: ic(['M50 12 Q76 12 76 40 Q76 54 62 64 V74 H38 V64 Q24 54 24 40 Q24 12 50 12 Z', 'M40 82 H60', 'M44 90 H56', 'M44 46 L50 56 L56 46'], ['M50 12 Q76 12 76 40 Q76 54 62 64 V74 H38 V64 Q24 54 24 40 Q24 12 50 12 Z']),
  mic: ic(['M38 14 H62 V50 Q62 62 50 62 Q38 62 38 50 Z', 'M26 46 Q26 74 50 74 Q74 74 74 46', 'M50 74 V88', 'M34 88 H66'], ['M38 14 H62 V50 Q62 62 50 62 Q38 62 38 50 Z']),
  pencil: ic(['M66 14 L86 34 L38 82 L16 86 L20 64 Z', 'M58 22 L78 42', 'M20 64 L38 82'], ['M66 14 L86 34 L38 82 L16 86 L20 64 Z']),
  book: ic(['M50 24 Q34 14 12 18 V80 Q34 76 50 86 Q66 76 88 80 V18 Q66 14 50 24 Z', 'M50 24 V86', 'M22 34 Q32 32 40 36', 'M60 36 Q68 32 78 34'], ['M50 24 Q34 14 12 18 V80 Q34 76 50 86 Z']),
  chart: ic(['M14 86 H88', 'M14 86 V14', 'M24 74 V60', 'M42 74 V46', 'M60 74 V52', 'M78 74 V28', 'M22 52 L42 36 L58 44 L82 18'], [], [[82, 18, 5]]),
  people: ic(['M34 22 A12 12 0 1 1 33.9 22 Z', 'M14 78 Q14 50 34 50 Q54 50 54 78 Z', 'M66 28 A10 10 0 1 1 65.9 28 Z', 'M58 52 Q64 48 70 48 Q88 48 88 74 H60'], ['M14 78 Q14 50 34 50 Q54 50 54 78 Z']),
  person: ic(['M50 14 A16 16 0 1 1 49.9 14 Z', 'M22 88 Q22 54 50 54 Q78 54 78 88 Z'], ['M22 88 Q22 54 50 54 Q78 54 78 88 Z']),
  chat: ic(['M14 20 H86 V66 H44 L26 82 V66 H14 Z'], ['M14 20 H86 V66 H44 L26 82 V66 H14 Z'], [[34, 43, 4.5], [50, 43, 4.5], [66, 43, 4.5]]),
  document: ic(['M22 10 H62 L80 28 V90 H22 Z', 'M62 10 V28 H80', 'M34 46 H68', 'M34 60 H68', 'M34 74 H56'], ['M22 10 H62 L80 28 V90 H22 Z']),
  slides: ic(['M10 18 H90 V68 H10 Z', 'M50 68 V82', 'M34 90 L50 82 L66 90', 'M22 56 L38 40 L50 50 L66 32 L78 44'], ['M10 18 H90 V68 H10 Z']),
  check: ic(['M50 12 A38 38 0 1 1 49.9 12 Z', 'M30 52 L44 66 L72 36'], ['M50 12 A38 38 0 1 1 49.9 12 Z']),
  cross: ic(['M50 12 A38 38 0 1 1 49.9 12 Z', 'M34 34 L66 66', 'M66 34 L34 66']),
  trophy: ic(['M28 14 H72 V38 Q72 62 50 64 Q28 62 28 38 Z', 'M28 22 Q12 22 14 36 Q16 48 32 48', 'M72 22 Q88 22 86 36 Q84 48 68 48', 'M50 64 V78', 'M32 88 H68 V78 H32 Z'], ['M28 14 H72 V38 Q72 62 50 64 Q28 62 28 38 Z'], [[50, 34, 5]]),
  heart: ic(['M50 84 Q14 60 14 36 Q14 18 32 18 Q44 18 50 30 Q56 18 68 18 Q86 18 86 36 Q86 60 50 84 Z'], ['M50 84 Q14 60 14 36 Q14 18 32 18 Q44 18 50 30 Q56 18 68 18 Q86 18 86 36 Q86 60 50 84 Z']),
  gear: ic(['M44 8 H56 L58 20 L68 24 L78 16 L86 24 L78 34 L82 44 L94 46 V56 L82 58 L78 68 L86 78 L78 86 L68 78 L58 82 L56 94 H44 L42 82 L32 78 L22 86 L14 78 L22 68 L18 58 L6 56 V46 L18 44 L22 34 L14 24 L22 16 L32 24 L42 20 Z', 'M50 36 A14 14 0 1 1 49.9 36 Z'], ['M50 36 A14 14 0 1 1 49.9 36 Z']),
  globe: ic(['M50 12 A38 38 0 1 1 49.9 12 Z', 'M12 50 H88', 'M50 12 Q30 50 50 88', 'M50 12 Q70 50 50 88', 'M18 30 H82', 'M18 70 H82']),
  eye: ic(['M8 50 Q50 10 92 50 Q50 90 8 50 Z', 'M50 34 A16 16 0 1 1 49.9 34 Z'], ['M8 50 Q50 10 92 50 Q50 90 8 50 Z'], [[50, 50, 6]]),
  compass: ic(['M50 10 A40 40 0 1 1 49.9 10 Z', 'M50 22 L60 50 L50 78 L40 50 Z', 'M40 50 H60'], ['M50 22 L60 50 L40 50 Z']),
  flag: ic(['M24 90 V12', 'M24 14 Q40 6 54 16 Q68 26 82 18 V54 Q68 62 54 52 Q40 42 24 50'], ['M24 14 Q40 6 54 16 Q68 26 82 18 V54 Q68 62 54 52 Q40 42 24 50 Z']),
  bolt: ic(['M58 8 L22 56 H48 L40 92 L78 40 H52 Z'], ['M58 8 L22 56 H48 L40 92 L78 40 H52 Z']),
  laptop: ic(['M22 22 H78 V64 H22 Z', 'M10 74 H90 L84 84 H16 Z'], ['M22 22 H78 V64 H22 Z']),
  phone: ic(['M32 8 H68 Q74 8 74 14 V86 Q74 92 68 92 H32 Q26 92 26 86 V14 Q26 8 32 8 Z', 'M32 20 H68 V76 H32 Z', 'M46 84 H54'], ['M32 20 H68 V76 H32 Z']),
  calendar: ic(['M14 20 H86 V86 H14 Z', 'M14 38 H86', 'M32 12 V26', 'M68 12 V26'], ['M14 20 H86 V38 H14 Z'], [[32, 54, 4], [50, 54, 4], [68, 54, 4], [32, 70, 4], [50, 70, 4]]),
  search: ic(['M42 14 A26 26 0 1 1 41.9 14 Z', 'M60 60 L86 86'], ['M42 14 A26 26 0 1 1 41.9 14 Z']),
  key: ic(['M30 32 A18 18 0 1 1 29.9 32 Z', 'M44 56 L84 56', 'M72 56 V70', 'M82 56 V66'], ['M30 32 A18 18 0 1 1 29.9 32 Z']),
  lock: ic(['M22 44 H78 V88 H22 Z', 'M32 44 V30 Q32 12 50 12 Q68 12 68 30 V44', 'M50 60 V72'], ['M22 44 H78 V88 H22 Z']),
  question: ic(['M50 10 A40 40 0 1 1 49.9 10 Z', 'M36 38 Q36 24 50 24 Q64 24 64 36 Q64 46 50 52 V60', 'M50 72 V73']),
  smile: ic(['M50 12 A38 38 0 1 1 49.9 12 Z', 'M32 58 Q50 76 68 58'], [], [[37, 40, 5], [63, 40, 5]]),
  nervous: ic(['M50 12 A38 38 0 1 1 49.9 12 Z', 'M34 66 Q42 58 50 66 Q58 74 66 66', 'M80 22 Q88 34 80 40 Q72 34 80 22 Z'], [], [[37, 42, 5], [63, 42, 5]]),
  music: ic(['M38 74 V20 L80 12 V64', 'M38 32 L80 24', 'M28 64 A10 10 0 1 1 27.9 64 Z', 'M70 56 A10 10 0 1 1 69.9 56 Z'], ['M28 64 A10 10 0 1 1 27.9 64 Z', 'M70 56 A10 10 0 1 1 69.9 56 Z']),
  home: ic(['M12 48 L50 14 L88 48', 'M22 40 V86 H78 V40', 'M42 86 V62 H58 V86'], ['M22 40 L50 16 L78 40 V86 H22 Z']),
  camera: ic(['M12 30 H34 L40 20 H60 L66 30 H88 V80 H12 Z', 'M50 38 A16 16 0 1 1 49.9 38 Z'], ['M12 30 H34 L40 20 H60 L66 30 H88 V80 H12 Z'], [[78, 40, 4]]),
  coin: ic(['M50 12 A38 38 0 1 1 49.9 12 Z', 'M50 24 A26 26 0 1 1 49.9 24 Z', 'M50 34 V66', 'M42 42 Q50 34 58 42', 'M42 58 Q50 66 58 58'], ['M50 12 A38 38 0 1 1 49.9 12 Z']),
  radar: ic(['M50 12 A38 38 0 1 1 49.9 12 Z', 'M50 28 A22 22 0 1 1 49.9 28 Z', 'M50 50 L80 28'], ['M50 50 L80 28 A38 38 0 0 0 50 12 Z'], [[64, 36, 4], [34, 62, 4]]),
};

/** emoji → 宇宙圖示名 */
export const EMOJI_TO_COSMOS: Record<string, string> = {
  '🚀': 'rocket', '🪐': 'planet', '🌍': 'globe', '🌏': 'globe', '🌎': 'globe', '🌐': 'globe', '⭐': 'star', '🌟': 'star', '✨': 'star', '💫': 'star',
  '🛰️': 'satellite', '🛰': 'satellite', '📡': 'satellite', '🔭': 'telescope', '⚠️': 'warning', '⚠': 'warning', '❗': 'warning', '🚨': 'warning',
  '⏰': 'clock', '⏱️': 'clock', '⏱': 'clock', '🕒': 'clock', '⌚': 'clock', '⌛': 'hourglass', '⏳': 'hourglass', '🎯': 'target', '💡': 'bulb',
  '🎤': 'mic', '🎙️': 'mic', '🎙': 'mic', '✏️': 'pencil', '✏': 'pencil', '📝': 'pencil', '🖊️': 'pencil', '📖': 'book', '📚': 'book', '📘': 'book', '📕': 'book',
  '📊': 'chart', '📈': 'chart', '👥': 'people', '👫': 'people', '🧑‍🤝‍🧑': 'people', '🧑': 'person', '👤': 'person', '🙋': 'person', '🧑‍🚀': 'person',
  '💬': 'chat', '🗨️': 'chat', '🗣️': 'chat', '📄': 'document', '📃': 'document', '📋': 'document', '🧾': 'document', '🖼️': 'slides', '📽️': 'slides',
  '✅': 'check', '☑️': 'check', '✔️': 'check', '❌': 'cross', '✖️': 'cross', '🏆': 'trophy', '🏅': 'trophy', '🥇': 'trophy', '❤️': 'heart', '❤': 'heart', '💖': 'heart',
  '⚙️': 'gear', '⚙': 'gear', '👀': 'eye', '👁️': 'eye', '🧭': 'compass', '🚩': 'flag', '🏁': 'flag', '⚡': 'bolt', '💻': 'laptop', '🖥️': 'laptop', '🖥': 'laptop',
  '📱': 'phone', '📲': 'phone', '📅': 'calendar', '📆': 'calendar', '🗓️': 'calendar', '🔍': 'search', '🔎': 'search', '🔑': 'key', '🗝️': 'key', '🔒': 'lock', '🔐': 'lock',
  '❓': 'question', '❔': 'question', '🤔': 'question', '😊': 'smile', '🙂': 'smile', '😀': 'smile', '😄': 'smile', '😰': 'nervous', '😱': 'nervous', '😨': 'nervous', '😥': 'nervous',
  '🎵': 'music', '🎶': 'music', '🏠': 'home', '🏡': 'home', '🏫': 'home', '📷': 'camera', '📸': 'camera', '💰': 'coin', '🪙': 'coin', '💲': 'coin',
};

/** 線稿（200×200）改畫成青色發光線 */
const SketchArt: React.FC<{name: string}> = ({name}) => {
  const sk = sketchFor(name)!;
  return (
    <g transform="scale(0.5)" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {sk.paths.map((d, i) => <path key={`g${i}`} d={d} stroke={CYAN} strokeOpacity={0.28} strokeWidth={22} />)}
      {sk.paths.map((d, i) => <path key={`l${i}`} d={d} stroke={LINE} strokeWidth={8.4} />)}
      {(sk.dots ?? []).map(([cx, cy], i) => <circle key={`d${i}`} cx={cx} cy={cy} r={8} fill={ORANGE} />)}
    </g>
  );
};

/** 這個 icon 字串用哪一種畫法 */
export const cosmosKind = (icon?: string): 'cosmos' | 'sketch' | 'emoji' | 'none' => {
  if (!icon) return 'none';
  if (COSMOS_ICONS[icon] || COSMOS_ICONS[EMOJI_TO_COSMOS[icon] ?? '']) return 'cosmos';
  if (sketchFor(icon)) return 'sketch';
  return 'emoji';
};

/** 圖示畫面（100×100 座標） */
export const CosmosArt: React.FC<{icon?: string}> = ({icon}) => {
  const kind = cosmosKind(icon);
  if (kind === 'cosmos') return <>{COSMOS_ICONS[icon!] ?? COSMOS_ICONS[EMOJI_TO_COSMOS[icon!]]}</>;
  if (kind === 'sketch') return <SketchArt name={icon!} />;
  if (kind === 'none') return <>{COSMOS_ICONS.star}</>;
  const t = Array.from(icon!);
  const isEmoji = /\p{Extended_Pictographic}/u.test(icon!);
  return (
    <g>
      <circle cx={50} cy={50} r={42} fill={CYAN} fillOpacity={0.12} stroke={CYAN} strokeOpacity={0.3} strokeWidth={11} />
      <circle cx={50} cy={50} r={42} fill="none" stroke={LINE} strokeWidth={4} />
      <text x={50} y={isEmoji ? 65 : 63} textAnchor="middle" fontSize={isEmoji ? 44 : t.length > 2 ? 28 : 38}
        fontFamily={isEmoji ? undefined : /[一-鿿]/.test(icon!) ? NOTO : ORB} fontWeight={900} fill="#fff">{icon}</text>
    </g>
  );
};

/** 在 at 格彈出的圖示（x,y 為左上；data-qa="ignore"：圖示內的 emoji／字不算畫面文字） */
export const CosmosIcon: React.FC<{icon?: string; at: number; x: number; y: number; size: number; float?: boolean}> = ({icon, at, x, y, size, float = false}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const k = pop(f, at, 12);
  const fl = float ? Math.sin((f - at) / 22) * size * 0.03 : 0;
  return (
    <div data-qa="ignore" style={{position: 'absolute', left: x, top: y + fl, width: size, height: size, transform: `scale(${k})`, opacity: Math.min(1, k * 1.5)}}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{overflow: 'visible'}}><CosmosArt icon={icon} /></svg>
    </div>
  );
};
