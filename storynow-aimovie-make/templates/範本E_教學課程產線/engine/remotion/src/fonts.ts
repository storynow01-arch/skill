/** 明確載入字型。不載入的話 headless Chromium 會 fallback：
 *  中文會變成系統字（機器間不一致），emoji 會變成灰色方塊。 */
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadEmoji} from '@remotion/google-fonts/NotoColorEmoji';

const tc = loadTC('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['chinese-traditional', 'latin'],
  ignoreTooManyRequestsWarning: true,
});
const emoji = loadEmoji();

export const fontsReady = Promise.all([tc.waitUntilDone(), emoji.waitUntilDone()]);
export const FONT_STACK = `${tc.fontFamily}, ${emoji.fontFamily}, sans-serif`;
export const EMOJI_FONT = emoji.fontFamily;

/** 預載這一節會出現的每一個字。
 *
 *  2026-10-03 查到的字幕抖動根因：Google Fonts 把 Noto Sans TC 切成上百個 unicode-range 小檔，
 *  瀏覽器要等畫面「用到」某個字才去抓那一片。Remotion 多個分頁平行算圖，
 *  某一格如果在那一片抓到之前就截圖，那幾個字會用備用字型畫 —— 字寬不同，
 *  整行字幕在那一格左右跳 10px 左右，下一格又跳回來（1-7 實測 5 處）。
 *
 *  解法：開始算圖前，用 document.fonts.load() 把全部文字、四種字重的分片一次載完。 */
export const preloadGlyphs = (text: string): Promise<unknown> => {
  const uniq = Array.from(new Set(Array.from(text))).join('');
  return Promise.all(['400', '500', '600', '700'].map((w) =>
    document.fonts.load(`${w} 40px ${tc.fontFamily}`, uniq)));
};
