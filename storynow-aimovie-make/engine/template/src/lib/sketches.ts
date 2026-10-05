/* 手繪線稿圖示庫（200×200 座標）：給「創客手稿」逐筆畫出、筆跟著走、畫完「活起來」。
   每個圖示＝多段路徑（依畫的順序），alive＝畫完後的動態（blink 閃燈、spin 轉動、pulse 擴散、bob 上下、wave 電波）。
   EMOJI_TO_SKETCH 把常見 emoji 對應到線稿；沒有對應時範本會畫圓框＋貼上 emoji。 */
export type Sketch = {paths: string[]; alive?: 'blink' | 'spin' | 'pulse' | 'bob' | 'wave'; dots?: [number, number][]; fill?: string};

export const SKETCHES: Record<string, Sketch> = {
  computer: {paths: ['M 30 40 h 140 v 95 h -140 Z', 'M 45 55 h 110 v 65 h -110 Z', 'M 85 135 v 20 M 115 135 v 20', 'M 60 160 h 80'], alive: 'blink', dots: [[100, 88]]},
  laptop: {paths: ['M 45 50 h 110 v 75 h -110 Z', 'M 25 135 h 150 l -12 18 h -126 Z', 'M 85 145 h 30'], alive: 'blink', dots: [[100, 88]]},
  phone: {paths: ['M 70 25 h 60 a 10 10 0 0 1 10 10 v 130 a 10 10 0 0 1 -10 10 h -60 a 10 10 0 0 1 -10 -10 v -130 a 10 10 0 0 1 10 -10 Z', 'M 75 45 h 50 v 100 h -50 Z', 'M 95 158 h 10'], alive: 'blink', dots: [[100, 95]]},
  router: {paths: ['M 30 110 h 140 v 45 h -140 Z', 'M 60 110 l -15 -55 M 140 110 l 15 -55', 'M 85 75 q 15 -15 30 0 M 75 62 q 25 -25 50 0'], alive: 'blink', dots: [[55, 132], [80, 132], [105, 132], [130, 132]]},
  server: {paths: ['M 50 30 h 100 v 40 h -100 Z', 'M 50 80 h 100 v 40 h -100 Z', 'M 50 130 h 100 v 40 h -100 Z', 'M 95 50 h 40 M 95 100 h 40 M 95 150 h 40'], alive: 'blink', dots: [[68, 50], [68, 100], [68, 150]]},
  cloud: {paths: ['M 50 140 q -35 0 -30 -30 q 5 -28 35 -25 q 8 -40 50 -35 q 35 5 40 40 q 35 0 35 28 q 0 22 -30 22 Z'], alive: 'bob'},
  globe: {paths: ['M 100 25 a 75 75 0 1 0 0.1 0', 'M 25 100 h 150', 'M 100 25 q -45 75 0 150 M 100 25 q 45 75 0 150', 'M 40 60 q 60 15 120 0 M 40 140 q 60 -15 120 0'], alive: 'spin'},
  house: {paths: ['M 30 95 l 70 -60 l 70 60', 'M 50 80 v 85 h 100 v -85', 'M 88 165 v -45 h 24 v 45', 'M 60 105 h 20 v 20 h -20 Z'], alive: 'bob'},
  mailbox: {paths: ['M 50 70 h 90 a 25 25 0 0 1 25 25 v 45 h -140 v -45 a 25 25 0 0 1 25 -25 Z', 'M 95 140 v 45', 'M 140 70 v -30 h 25 v 15 h -25', 'M 65 100 h 50'], alive: 'bob'},
  envelope: {paths: ['M 30 55 h 140 v 95 h -140 Z', 'M 30 55 l 70 55 l 70 -55', 'M 30 150 l 50 -45 M 170 150 l -50 -45'], alive: 'bob'},
  package: {paths: ['M 40 70 l 60 -30 l 60 30 l -60 30 Z', 'M 40 70 v 70 l 60 30 v -70', 'M 160 70 v 70 l -60 30', 'M 70 55 l 60 30'], alive: 'bob'},
  lock: {paths: ['M 55 95 h 90 v 75 h -90 Z', 'M 70 95 v -25 a 30 30 0 0 1 60 0 v 25', 'M 100 125 v 20'], alive: 'pulse'},
  key: {paths: ['M 60 100 a 30 30 0 1 0 0.1 0', 'M 90 115 h 85 M 150 115 v 20 M 170 115 v 15'], alive: 'bob'},
  chip: {paths: ['M 55 55 h 90 v 90 h -90 Z', 'M 75 75 h 50 v 50 h -50 Z', 'M 70 55 v -20 M 100 55 v -20 M 130 55 v -20 M 70 145 v 20 M 100 145 v 20 M 130 145 v 20',
    'M 55 70 h -20 M 55 100 h -20 M 55 130 h -20 M 145 70 h 20 M 145 100 h 20 M 145 130 h 20'], alive: 'blink', dots: [[100, 100]]},
  robotarm: {paths: ['M 40 175 h 70', 'M 75 175 v -15 l 15 -55', 'M 90 105 l 55 -35', 'M 145 70 l 15 -20 M 145 70 l 22 5'], alive: 'bob'},
  bulb: {paths: ['M 100 30 a 45 45 0 0 1 28 80 v 20 h -56 v -20 a 45 45 0 0 1 28 -80 Z', 'M 78 145 h 44 M 82 160 h 36', 'M 92 105 l 8 -20 l 8 20'], alive: 'pulse', fill: '#FFE680'},
  gear: {paths: ['M 100 60 a 40 40 0 1 0 0.1 0', 'M 100 85 a 15 15 0 1 0 0.1 0', 'M 100 30 v 25 M 100 145 v 25 M 30 100 h 25 M 145 100 h 25 M 50 50 l 18 18 M 132 132 l 18 18 M 150 50 l -18 18 M 68 132 l -18 18'], alive: 'spin'},
  book: {paths: ['M 100 50 q -35 -15 -70 0 v 110 q 35 -15 70 0 Z', 'M 100 50 q 35 -15 70 0 v 110 q -35 -15 -70 0', 'M 45 75 h 40 M 45 95 h 40 M 115 75 h 40 M 115 95 h 40'], alive: 'bob'},
  magnifier: {paths: ['M 90 45 a 45 45 0 1 0 0.1 0', 'M 122 122 l 45 45'], alive: 'bob'},
  clock: {paths: ['M 100 25 a 75 75 0 1 0 0.1 0', 'M 100 100 v -45 M 100 100 l 35 20'], alive: 'spin'},
  trophy: {paths: ['M 60 35 h 80 v 40 a 40 40 0 0 1 -80 0 Z', 'M 60 50 h -25 q 0 35 30 35 M 140 50 h 25 q 0 35 -30 35', 'M 100 115 v 30 M 70 170 h 60 v -25 h -60 Z'], alive: 'pulse', fill: '#FFD84D'},
  medal: {paths: ['M 70 25 l 30 55 l 30 -55', 'M 100 85 a 45 45 0 1 0 0.1 0', 'M 100 110 l 8 16 l 17 2 l -12 12 l 3 17 l -16 -8 l -16 8 l 3 -17 l -12 -12 l 17 -2 Z'], alive: 'pulse', fill: '#FFD84D'},
  person: {paths: ['M 100 30 a 28 28 0 1 0 0.1 0', 'M 45 175 q 0 -65 55 -65 q 55 0 55 65'], alive: 'bob'},
  wifi: {paths: ['M 100 150 a 8 8 0 1 0 0.1 0', 'M 70 125 q 30 -28 60 0', 'M 45 100 q 55 -50 110 0', 'M 20 75 q 80 -75 160 0'], alive: 'wave'},
  database: {paths: ['M 40 50 a 60 20 0 1 0 120 0 a 60 20 0 1 0 -120 0', 'M 40 50 v 100 a 60 20 0 0 0 120 0 v -100', 'M 40 100 a 60 20 0 0 0 120 0'], alive: 'blink', dots: [[60, 125], [60, 75]]},
  code: {paths: ['M 70 60 l -40 40 l 40 40', 'M 130 60 l 40 40 l -40 40', 'M 112 45 l -24 110'], alive: 'bob'},
  camera: {paths: ['M 30 65 h 115 v 85 h -115 Z', 'M 145 85 l 35 -20 v 85 l -35 -20', 'M 75 107 a 22 22 0 1 0 0.1 0'], alive: 'blink', dots: [[45, 78]]},
  rocket: {paths: ['M 100 25 q 35 35 30 100 h -60 q -5 -65 30 -100 Z', 'M 70 110 l -25 35 l 30 -10 M 130 110 l 25 35 l -30 -10', 'M 88 135 l 12 35 l 12 -35', 'M 100 60 a 12 12 0 1 0 0.1 0'], alive: 'bob'},
  checklist: {paths: ['M 45 30 h 110 v 145 h -110 Z', 'M 60 65 l 10 10 l 18 -20 M 100 68 h 40', 'M 60 105 l 10 10 l 18 -20 M 100 108 h 40', 'M 60 145 l 10 10 l 18 -20 M 100 148 h 40'], alive: 'bob'},
  ruler: {paths: ['M 20 120 l 140 -80 l 20 35 l -140 80 Z', 'M 50 112 l -8 -14 M 75 98 l -6 -10 M 100 83 l -8 -14 M 125 69 l -6 -10 M 150 54 l -8 -14'], alive: 'bob'},
  calculator: {paths: ['M 50 25 h 100 v 150 h -100 Z', 'M 62 40 h 76 v 30 h -76 Z', 'M 68 95 h 14 M 93 95 h 14 M 118 95 h 14 M 68 125 h 14 M 93 125 h 14 M 118 125 h 14 M 68 155 h 14 M 93 155 h 14 M 118 155 h 14'], alive: 'blink', dots: [[125, 55]]},
  network: {paths: ['M 100 40 a 18 18 0 1 0 0.1 0', 'M 40 140 a 18 18 0 1 0 0.1 0', 'M 160 140 a 18 18 0 1 0 0.1 0', 'M 92 74 l -40 52 M 108 74 l 40 52 M 58 158 h 84'], alive: 'pulse'},
  warning: {paths: ['M 100 30 l 75 135 h -150 Z', 'M 100 75 v 45', 'M 100 140 v 5'], alive: 'pulse', fill: '#FF9E9E'},
  // 2026-10-05 補（07_skill實作 1-1 實測時顯示「?」的 9 個）
  gauge: {paths: ['M 30 140 a 70 70 0 0 1 140 0', 'M 42 105 l 12 7 M 70 78 l 7 11 M 100 68 v 14 M 130 78 l -7 11 M 158 105 l -12 7', 'M 100 140 l 40 -45', 'M 100 140 a 8 8 0 1 0 0.1 0'], alive: 'bob'},
  packet: {paths: ['M 35 60 h 130 v 90 h -130 Z', 'M 35 85 h 130', 'M 50 72 h 30 M 95 72 h 20 M 130 72 h 20', 'M 55 110 h 90 M 55 130 h 60'], alive: 'bob'},
  road: {paths: ['M 75 30 l -50 145', 'M 125 30 l 50 145', 'M 100 40 v 20 M 100 80 v 25 M 100 125 v 35'], alive: 'bob'},
  stamp: {paths: ['M 85 35 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0', 'M 92 50 v 35 h 16 v -35', 'M 50 85 h 100 v 25 h -100 Z', 'M 40 110 h 120 v 14 h -120 Z', 'M 50 160 h 100'], alive: 'bob'},
  tag: {paths: ['M 35 60 h 85 l 45 40 l -45 40 h -85 Z', 'M 120 100 a 8 8 0 1 0 0.1 0', 'M 55 85 h 40 M 55 115 h 30'], alive: 'bob'},
  ear: {paths: ['M 130 55 q -10 -30 -45 -25 q -35 8 -35 50 q 0 25 18 40 q 14 12 10 32 q 2 22 24 20 q 16 -2 18 -22 q 2 -18 16 -32 q 18 -20 -6 -63', 'M 85 85 q 8 -22 28 -10 q 12 12 -8 32'], alive: 'pulse'},
  document: {paths: ['M 50 25 h 70 l 30 30 v 120 h -100 Z', 'M 120 25 v 30 h 30', 'M 70 85 h 60 M 70 110 h 60 M 70 135 h 40'], alive: 'bob'},
  shuffle: {paths: ['M 25 60 h 40 q 30 0 50 40 q 20 40 50 40 h 10', 'M 25 140 h 40 q 30 0 50 -40 q 20 -40 50 -40 h 10', 'M 165 45 l 15 15 l -15 15', 'M 165 125 l 15 15 l -15 15'], alive: 'bob'},
  repeat: {paths: ['M 50 100 a 50 50 0 0 1 90 -30', 'M 150 100 a 50 50 0 0 1 -90 30', 'M 142 45 v 27 h -27', 'M 58 155 v -27 h 27'], alive: 'spin'},
};

export const EMOJI_TO_SKETCH: Record<string, string> = {
  '💻': 'laptop', '🖥️': 'computer', '🖥': 'computer', '📱': 'phone', '📶': 'wifi', '🛜': 'wifi', '🌐': 'globe', '🌍': 'globe', '🌏': 'globe', '☁️': 'cloud', '☁': 'cloud',
  '🏠': 'house', '🏡': 'house', '🏫': 'house', '📮': 'mailbox', '📬': 'mailbox', '📫': 'mailbox', '✉️': 'envelope', '✉': 'envelope', '📧': 'envelope', '📨': 'envelope',
  '📦': 'package', '🔒': 'lock', '🔐': 'lock', '🔑': 'key', '🗝️': 'key', '🔌': 'chip', '💾': 'chip', '🤖': 'robotarm', '🦾': 'robotarm', '💡': 'bulb', '⚙️': 'gear', '⚙': 'gear',
  '📖': 'book', '📚': 'book', '📘': 'book', '🔍': 'magnifier', '🔎': 'magnifier', '⏰': 'clock', '🕒': 'clock', '⏱️': 'clock', '🏆': 'trophy', '🏅': 'medal', '🥇': 'medal',
  '🧑': 'person', '👤': 'person', '🙋': 'person', '🧑‍💻': 'person', '🗄️': 'database', '🗃️': 'database', '💽': 'database', '👨‍💻': 'code', '⌨️': 'code', '🧾': 'checklist', '📋': 'checklist',
  '📷': 'camera', '📸': 'camera', '🎥': 'camera', '🚀': 'rocket', '📏': 'ruler', '📐': 'ruler', '🧮': 'calculator', '🔢': 'calculator', '🔗': 'network', '🕸️': 'network', '⚠️': 'warning', '❗': 'warning',
  '🏷️': 'tag', '🏷': 'tag', '👂': 'ear', '📄': 'document', '📃': 'document', '📝': 'document', '🔀': 'shuffle', '🔁': 'repeat', '🔄': 'repeat', '🛣️': 'road',
};

export const sketchFor = (nameOrEmoji?: string): Sketch | null => {
  if (!nameOrEmoji) return null;
  return SKETCHES[nameOrEmoji] ?? SKETCHES[EMOJI_TO_SKETCH[nameOrEmoji] ?? ''] ?? null;
};
