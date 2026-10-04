// 指定秒數算靜態圖（不必整支渲染就能看新版畫面）。
// 用法：node qa_stills.mjs <節> <輸出資料夾> <秒,秒,...>
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const [id, outDir, secs] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const data = JSON.parse(fs.readFileSync(path.join('src', 'data', `${id}.json`), 'utf8'));
const serveUrl = await bundle({entryPoint: path.resolve('src', 'index.ts')});
const browser = await openBrowser('chrome');
const inputProps = {data};
const composition = await selectComposition({serveUrl, id: 'Section', inputProps, puppeteerInstance: browser});
for (const s of secs.split(',').map(Number)) {
  const out = path.join(outDir, `${id}_${s.toFixed(2)}.png`);
  await renderStill({composition, serveUrl, frame: Math.round(s * 30), inputProps, puppeteerInstance: browser,
                     scale: 0.5, output: out, logLevel: 'error'});
  console.log(out);
}
await browser.close({silent: true});
