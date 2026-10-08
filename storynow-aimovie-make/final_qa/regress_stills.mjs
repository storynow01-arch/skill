// F2 回歸測試的截圖（2026-10-08）：打包一次，依序算出指定畫格的靜態圖（比逐格跑 remotion still 快很多）。
// 用法（在專案資料夾執行，Node 才找得到專案的 @remotion 套件）：node regress_stills.mjs <frames 逗號分隔> <Composition> <輸出資料夾> [scale]
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const frames = process.argv[2].split(',').map(Number);
const compId = process.argv[3];
const outDir = process.argv[4];
const scale = Number(process.argv[5] ?? 1 / 3);
const proj = process.cwd();
const spec = JSON.parse(fs.readFileSync(path.join(proj, 'src', 'data', 'spec.json'), 'utf8'));
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(proj, 'src', 'index.ts')});
const browser = await openBrowser('chrome');
const composition = await selectComposition({serveUrl, id: compId, inputProps: spec, puppeteerInstance: browser});
for (const frame of frames) {
  await renderStill({composition, serveUrl, frame, inputProps: spec, puppeteerInstance: browser, scale, imageFormat: 'png',
                     output: path.join(outDir, `f${String(frame).padStart(5, '0')}.png`), timeoutInMilliseconds: 60000});
  process.stdout.write(`  ${frame}`);
}
process.stdout.write('\n');
await browser.close({silent: true});
