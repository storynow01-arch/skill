/* 範本L 黏土物件圖示庫：storyboard 的 icon（名稱或 emoji）→ 黏土玩具物件。
   <ClayIcon icon=… size=… f=…> 找圖順序：①這裡的黏土物件（名稱或 emoji）②lib/sketches.ts 的線稿（畫成黏土圓角粗線）③黏土圓牌＋emoji／短字。
   一律不會出現空白或「?」：沒給 icon 時畫星星。
   CLAY_ICONS 每筆＝{w, h（基準寬高）, el(f)（畫出物件，f＝場景內格數，給會動的物件用）}；make_video 的圖示檢查會讀這裡的名稱與 EMOJI_TO_CLAY。 */
import React from 'react';
import {sketchFor} from '../sketches';
import {CREAM, FAT, NV, OR, TC, mix} from './kit';
import {
  Bell, Block, Board, Bowl, Bulb, Bus, Bush, Cake, Camera, Cart, Cert, Chip, Clapper, Coin, Crib, Cup, Drink, FlatBook, Globe, House,
  Laser, Paw, Piggy, Plane, Pool, Printer, SignPost, Tablet, Tag, Trophy,
} from './props';
import {
  Bolt, BookC, Calendar, Chart, Chat, Clipboard, Clock, Cross, Gear, Heart, Laptop, Magnifier, Mic, OpenBook, Papers, Pencil, Person,
  Phone, Rocket, Screen, Star, Target, Tick, Warning,
} from './objects';

export type ClayArt = {w: number; h: number; el: (f: number) => React.ReactNode};

export const CLAY_ICONS: Record<string, ClayArt> = {
  trophy: {w: 220, h: 270, el: () => <Trophy />},
  cert: {w: 240, h: 190, el: () => <Cert />},
  cart: {w: 300, h: 250, el: () => <Cart />},
  paw: {w: 70, h: 70, el: () => <Paw />},
  board: {w: 300, h: 220, el: () => <Board />},
  globe: {w: 280, h: 320, el: (f) => <Globe spin={Math.sin(f / 40) * 0.5 + 0.5} />},
  plane: {w: 150, h: 90, el: () => <Plane />},
  bowl: {w: 170, h: 130, el: () => <Bowl />},
  cake: {w: 170, h: 170, el: () => <Cake />},
  drink: {w: 120, h: 180, el: () => <Drink />},
  cup: {w: 150, h: 150, el: (f) => <Cup f={f} />},
  bell: {w: 170, h: 130, el: () => <Bell />},
  camera: {w: 230, h: 170, el: () => <Camera />},
  printer: {w: 230, h: 250, el: (f) => <Printer p={Math.min(1, f / 90)} />},
  laser: {w: 270, h: 180, el: (f) => <Laser f={f} />},
  tablet: {w: 230, h: 166, el: () => <Tablet />},
  clapper: {w: 210, h: 190, el: () => <Clapper />},
  block: {w: 110, h: 110, el: () => <Block c={OR} ch="A" />},
  crib: {w: 320, h: 230, el: () => <Crib />},
  chip: {w: 240, h: 240, el: () => <Chip />},
  bulb: {w: 150, h: 220, el: (f) => <Bulb lit={Math.min(1, Math.max(0, (f - 20) / 10))} />},
  piggy: {w: 320, h: 250, el: () => <Piggy />},
  coin: {w: 80, h: 80, el: () => <Coin />},
  tag: {w: 400, h: 220, el: () => <Tag text="$" />},
  bus: {w: 440, h: 240, el: () => <Bus />},
  house: {w: 340, h: 320, el: () => <House />},
  pool: {w: 440, h: 190, el: (f) => <Pool f={f} />},
  signpost: {w: 300, h: 330, el: () => <SignPost />},
  bush: {w: 140, h: 100, el: () => <Bush />},
  books: {w: 300, h: 190, el: () => (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <FlatBook w={240} c={OR} /><FlatBook w={280} c={NV} /><FlatBook w={260} c="#3aa86b" />
    </div>
  )},
  book: {w: 200, h: 230, el: () => <BookC />},
  openbook: {w: 280, h: 170, el: () => <OpenBook />},
  clock: {w: 220, h: 230, el: (f) => <Clock t={f / 30} />},
  pencil: {w: 260, h: 200, el: () => <Pencil />},
  mic: {w: 160, h: 280, el: () => <Mic />},
  target: {w: 240, h: 250, el: () => <Target />},
  chat: {w: 240, h: 210, el: (f) => <Chat f={f} />},
  checklist: {w: 210, h: 260, el: () => <Clipboard />},
  laptop: {w: 290, h: 200, el: () => <Laptop />},
  phone: {w: 140, h: 240, el: () => <Phone />},
  calendar: {w: 220, h: 220, el: () => <Calendar />},
  magnifier: {w: 230, h: 230, el: () => <Magnifier />},
  warning: {w: 240, h: 220, el: () => <Warning />},
  star: {w: 200, h: 200, el: () => <Star />},
  heart: {w: 200, h: 190, el: () => <Heart />},
  gear: {w: 210, h: 210, el: (f) => <Gear spin={f * 1.2} />},
  rocket: {w: 170, h: 280, el: (f) => <Rocket f={f} />},
  papers: {w: 240, h: 220, el: () => <Papers />},
  chart: {w: 250, h: 210, el: (f) => <Chart p={Math.min(1, f / 20)} />},
  person: {w: 150, h: 230, el: () => <Person />},
  screen: {w: 280, h: 280, el: () => <Screen />},
  bolt: {w: 160, h: 240, el: () => <Bolt />},
  cross: {w: 160, h: 160, el: () => <Cross />},
  tick: {w: 180, h: 160, el: () => <Tick />},
};

export const EMOJI_TO_CLAY: Record<string, string> = {
  '🏆': 'trophy', '🥇': 'trophy', '🏅': 'trophy', '📜': 'cert', '🎓': 'cert', '🛒': 'cart', '🐾': 'paw', '🐶': 'paw', '🐕': 'paw',
  '🌍': 'globe', '🌏': 'globe', '🌎': 'globe', '🌐': 'globe', '✈️': 'plane', '✈': 'plane', '🛫': 'plane',
  '🍜': 'bowl', '🍚': 'bowl', '🥣': 'bowl', '🍰': 'cake', '🎂': 'cake', '🧁': 'cake', '🧋': 'drink', '🥤': 'drink', '🍹': 'drink',
  '☕': 'cup', '🍵': 'cup', '🛎️': 'bell', '🛎': 'bell', '🔔': 'bell', '📷': 'camera', '📸': 'camera', '🎥': 'camera', '📹': 'camera',
  '🖨️': 'printer', '🖨': 'printer', '📱': 'phone', '📲': 'phone', '💻': 'laptop', '🖥️': 'laptop', '🖥': 'laptop', '⌨️': 'laptop',
  '📺': 'screen', '📽️': 'screen', '📽': 'screen', '📊': 'chart', '📈': 'chart', '📉': 'chart', '🎬': 'clapper',
  '🧱': 'block', '🔤': 'block', '🔠': 'block', '🧸': 'block', '👶': 'crib', '🍼': 'crib', '🤖': 'chip', '🔌': 'chip', '💾': 'chip',
  '💡': 'bulb', '🐷': 'piggy', '🐖': 'piggy', '🪙': 'coin', '💰': 'coin', '💲': 'coin', '💵': 'coin', '💴': 'coin',
  '🏷️': 'tag', '🏷': 'tag', '🚌': 'bus', '🚍': 'bus', '🚐': 'bus', '🏠': 'house', '🏡': 'house', '🏫': 'house', '🏢': 'house', '🏨': 'house',
  '🏊': 'pool', '🪧': 'signpost', '🚏': 'signpost', '🌳': 'bush', '🌲': 'bush', '🌿': 'bush', '🍀': 'bush',
  '📚': 'books', '📘': 'book', '📗': 'book', '📕': 'book', '📙': 'book', '📒': 'book', '📓': 'book', '📖': 'openbook',
  '⏰': 'clock', '⏱️': 'clock', '⏱': 'clock', '🕒': 'clock', '🕐': 'clock', '⌛': 'clock', '⏳': 'clock',
  '✏️': 'pencil', '✏': 'pencil', '📝': 'pencil', '🖊️': 'pencil', '🖊': 'pencil', '🖍️': 'pencil',
  '🎤': 'mic', '🎙️': 'mic', '🎙': 'mic', '🎯': 'target', '💬': 'chat', '🗨️': 'chat', '🗨': 'chat', '🗣️': 'chat', '🗣': 'chat',
  '📋': 'checklist', '🧾': 'checklist', '☑️': 'checklist', '✅': 'tick', '✔️': 'tick', '✔': 'tick', '❌': 'cross', '✖️': 'cross', '❎': 'cross',
  '📅': 'calendar', '📆': 'calendar', '🗓️': 'calendar', '🗓': 'calendar', '🔍': 'magnifier', '🔎': 'magnifier',
  '⚠️': 'warning', '⚠': 'warning', '❗': 'warning', '⭐': 'star', '🌟': 'star', '✨': 'star',
  '❤️': 'heart', '❤': 'heart', '💖': 'heart', '💕': 'heart', '💗': 'heart', '⚙️': 'gear', '⚙': 'gear', '🔧': 'gear', '🛠️': 'gear',
  '🚀': 'rocket', '📄': 'papers', '📃': 'papers', '📑': 'papers', '🗂️': 'papers', '📁': 'papers',
  '🧑': 'person', '👤': 'person', '👥': 'person', '🙋': 'person', '🧑‍🏫': 'person', '👨‍🏫': 'person', '👩‍🏫': 'person', '⚡': 'bolt',
};

/** 這個 icon 字串用哪一種畫法 */
export const clayKind = (icon?: string): 'clay' | 'sketch' | 'emoji' | 'none' => {
  if (!icon) return 'none';
  if (CLAY_ICONS[icon] || CLAY_ICONS[EMOJI_TO_CLAY[icon] ?? '']) return 'clay';
  if (sketchFor(icon)) return 'sketch';
  return 'emoji';
};

/** 線稿（200×200）改畫成黏土：深色粗線底（厚度）＋深藍圓角粗線，第一筆封閉路徑塗奶油色（線稿有指定填色時塗那個顏色） */
const SketchClay: React.FC<{name: string; size: number}> = ({name, size}) => {
  const sk = sketchFor(name)!;
  const sw = 16;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{overflow: 'visible', display: 'block'}}>
      <g transform="translate(0 7)">
        {sk.paths.map((d, i) => <path key={i} d={d} fill={i === 0 && /Z\s*$/.test(d) ? mix(NV, '#000000', 0.35) : 'none'} stroke={mix(NV, '#000000', 0.35)}
          strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />)}
      </g>
      {sk.paths.map((d, i) => (
        <path key={i} d={d} fill={i === 0 && /Z\s*$/.test(d) ? (sk.fill ?? CREAM) : 'none'} stroke="url(#cgv-b)" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {sk.paths.map((d, i) => <path key={`h${i}`} d={d} fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.25} transform="translate(-2 -3)" />)}
      {(sk.dots ?? []).map(([cx, cy], i) => <circle key={`d${i}`} cx={cx} cy={cy} r={11} fill="url(#cgr-o)" />)}
    </svg>
  );
};

/** 黏土圓牌＋emoji／短字（最後的退路） */
const Medallion: React.FC<{icon: string; size: number}> = ({icon, size}) => {
  const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
  const t = Array.from(icon);
  return (
    <div style={{width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 36% 30%, #ffffff, ${CREAM} 55%, ${mix(CREAM, '#000000', 0.16)})`,
      boxShadow: `inset 0 -${size * 0.05}px 0 rgba(0,0,0,0.08), 0 ${size * 0.06}px 0 ${mix(CREAM, '#000000', 0.22)}, 0 ${size * 0.14}px ${size * 0.16}px rgba(70,50,30,0.25)`,
      fontSize: isEmoji ? size * 0.5 : size * (t.length > 2 ? 0.26 : 0.36), fontFamily: isEmoji ? undefined : /[一-鿿]/.test(icon) ? TC : FAT,
      fontWeight: 900, color: NV, lineHeight: 1}}>{icon}</div>
  );
};

/** 物件的實際寬高（給版面計算）：size＝最長邊 */
export const claySize = (icon: string | undefined, size: number): [number, number] => {
  const k = clayKind(icon);
  if (k === 'clay' || k === 'none') {
    const a = CLAY_ICONS[icon ?? ''] ?? CLAY_ICONS[EMOJI_TO_CLAY[icon ?? ''] ?? ''] ?? CLAY_ICONS.star;
    const sc = size / Math.max(a.w, a.h);
    return [a.w * sc, a.h * sc];
  }
  return [size, size];
};

/** 畫一個黏土物件（不含落下動畫；外層用 Drop 包）。size＝最長邊；data-qa="ignore"：物件上的 $、A、AI 不算畫面文字 */
export const ClayIcon: React.FC<{icon?: string; size: number; f?: number; style?: React.CSSProperties}> = ({icon, size, f = 0, style}) => {
  const k = clayKind(icon);
  let inner: React.ReactNode;
  const [w, h] = claySize(icon, size);
  if (k === 'clay' || k === 'none') {
    const a = CLAY_ICONS[icon ?? ''] ?? CLAY_ICONS[EMOJI_TO_CLAY[icon ?? ''] ?? ''] ?? CLAY_ICONS.star;
    const sc = size / Math.max(a.w, a.h);
    inner = <div style={{position: 'absolute', left: 0, bottom: 0, width: a.w, height: a.h, transform: `scale(${sc})`, transformOrigin: '0% 100%',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center'}}>{a.el(f)}</div>;
  } else if (k === 'sketch') inner = <SketchClay name={icon!} size={size} />;
  else inner = <Medallion icon={icon!} size={size} />;
  return <div data-qa="ignore" style={{position: 'relative', width: w, height: h, ...style}}>{inner}</div>;
};
