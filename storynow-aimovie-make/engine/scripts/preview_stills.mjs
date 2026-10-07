// 分鏡預覽截圖（2026-10-06，從範本E 移植；十二步流程、範本 A～D 用）：每個場景在「物件都出現了」的時間點
// （場景結束前 0.6 秒）截一張圖，再寫 scenes.json（場景、型別、截圖、旁白）給 final_qa/storyboard_page.py 做預覽頁。
// 用法（在專案資料夾執行，build.py 之後）：node <skill>/engine/scripts/preview_stills.mjs <Composition> [輸出資料夾=qa/分鏡預覽]
// make_video.py --preview 會自動跑：用 edge-tts 暫配（不花 Gemini 額度）→ 建置 → 截圖 → 預覽頁，不算圖。
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const proj = process.cwd();
const req = createRequire(path.join(proj, 'package.json'));   // 用專案自己的 node_modules
const load = (m) => import(pathToFileURL(req.resolve(m)).href);   // Windows 絕對路徑要轉成 file:// URL
const {bundle} = await load('@remotion/bundler');
const {openBrowser, renderStill, selectComposition} = await load('@remotion/renderer');

const [comp, outArg] = process.argv.slice(2);
if (!comp) { console.error('用法：node preview_stills.mjs <Composition，例 TemplateB> [輸出資料夾]'); process.exit(1); }
const outDir = path.resolve(outArg || path.join('qa', '分鏡預覽'));
const spec = JSON.parse(fs.readFileSync(path.join(proj, 'src', 'data', 'spec.json'), 'utf8'));
const fps = spec.fps || 30;
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(proj, 'src', 'index.ts')});
const browser = await openBrowser('chrome');
const composition = await selectComposition({serveUrl, id: comp, inputProps: {}, puppeteerInstance: browser});
const say = {};
for (const v of spec.voiceLines || []) (say[v.scene] ||= []).push(v.text);
const rows = [];
for (const s of spec.scenes) {
  const frame = Math.min(Math.max(0, s.from + s.dur - Math.round(0.6 * fps)), composition.durationInFrames - 1);
  const img = `${s.id}.jpg`;
  await renderStill({composition, serveUrl, frame, inputProps: {}, puppeteerInstance: browser, scale: 0.5,
                     imageFormat: 'jpeg', jpegQuality: 80, timeoutInMilliseconds: 60000, logLevel: 'error',
                     output: path.join(outDir, img)});
  rows.push({id: s.id, type: s.type, img, say: say[s.id] || []});
}
fs.writeFileSync(path.join(outDir, 'scenes.json'), JSON.stringify({title: path.basename(proj), template: comp, scenes: rows}, null, 1));
await browser.close({silent: true});
console.log(`分鏡截圖 ${rows.length} 張 → ${outDir}`);
