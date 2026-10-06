// 分鏡預覽截圖（2026-10-06）：每個場景在「物件都出現了」的時間點（場景結束前 0.6 秒）截一張圖。
// 用法（在 04_引擎/remotion 執行）：node storyboard_stills.mjs <輸出資料夾> <節...>
// 用 src/data/<節>.json（暫配或正式配音建置的都可以）；內容（文字、圖示、物件順序）跟配音無關，時間長短才有關。
// 之後由 qa/storyboard_page.py 做成每節一頁的預覽（截圖＋旁白）。
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const [outDir, ...ids] = process.argv.slice(2);
const FPS = 30;
const proj = process.cwd();
const serveUrl = await bundle({entryPoint: path.join(proj, 'src', 'index.ts')});
const browser = await openBrowser('chrome');

for (const id of ids) {
  const data = JSON.parse(fs.readFileSync(path.join(proj, 'src', 'data', `${id}.json`), 'utf8'));
  const inputProps = {data};
  const composition = await selectComposition({serveUrl, id: 'Section', inputProps, puppeteerInstance: browser});
  const dir = path.join(outDir, id);
  fs.mkdirSync(dir, {recursive: true});
  const t0 = Date.now();
  for (const s of data.scenes) {
    const t = Math.max(0.5, s.durSec - 0.6);
    const frame = Math.min(Math.round((s.startSec + t) * FPS), composition.durationInFrames - 1);
    await renderStill({composition, serveUrl, frame, inputProps, puppeteerInstance: browser, scale: 0.5,
                       imageFormat: 'jpeg', jpegQuality: 80, timeoutInMilliseconds: 60000, logLevel: 'error',
                       output: path.join(dir, `${s.id}.jpg`)});
  }
  console.log(`${id}: ${data.scenes.length} 張（${((Date.now() - t0) / 1000).toFixed(0)}s）`);
}
await browser.close({silent: true});
