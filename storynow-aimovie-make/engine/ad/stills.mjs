// 廣告範本抽格：打包一次，依序算出指定格的靜態圖（make_ad.py 會把這支複製到專案裡再跑，套件從專案的 node_modules 找）
// node stills.mjs <專案> <格數逗號分隔> <輸出資料夾> [縮放=0.5]
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const [proj, framesArg, outDir, scaleArg] = process.argv.slice(2);
const frames = framesArg.split(',').map(Number);
const scale = Number(scaleArg ?? 0.5);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(proj, 'src', 'index.ts')});
const browser = await openBrowser('chrome');
const composition = await selectComposition({serveUrl, id: 'Ad', puppeteerInstance: browser});
for (const frame of frames) {
  await renderStill({composition, serveUrl, frame, puppeteerInstance: browser, scale, imageFormat: 'jpeg', jpegQuality: 85,
    output: path.join(outDir, `f${String(frame).padStart(4, '0')}.jpg`), timeoutInMilliseconds: 90000});
  process.stdout.write(` ${frame}`);
}
process.stdout.write('\n');
await browser.close({silent: true});
