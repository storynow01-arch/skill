// 版面品檢：打包專案 → 對指定 frame 算靜態圖（inputProps.qa=true 掛上 QaProbe）→ 收集 QA:{json}。
// 用法（在專案資料夾執行）：node <skill>/engine/scripts/qa_layout.mjs <frames 逗號分隔> [Composition=Video]
// 輸出：qa_layout.json
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const frames = (process.argv[2] ?? '0').split(',').map(Number);
const compId = process.argv[3] ?? 'Video';
const proj = process.cwd();
const spec = JSON.parse(fs.readFileSync(path.join(proj, 'src', 'data', 'spec.json'), 'utf8'));
const inputProps = {...spec, qa: true};

const serveUrl = await bundle({entryPoint: path.join(proj, 'src', 'index.ts')});
const browser = await openBrowser('chrome');
const composition = await selectComposition({serveUrl, id: compId, inputProps, puppeteerInstance: browser});
const out = [];
for (const frame of frames) {
  let found = null;
  const t0 = Date.now();
  try {
    await renderStill({
      composition, serveUrl, frame, inputProps, puppeteerInstance: browser, scale: 0.25, timeoutInMilliseconds: 45000,
      output: path.join(os.tmpdir(), `qa_${frame}.png`),
      onBrowserLog: (log) => { if (log.text.startsWith('QA:')) found = JSON.parse(log.text.slice(3)); },
    });
  } catch (e) {
    found = {frame, error: `算圖失敗：${String(e.message ?? e).slice(0, 200)}`, issues: []};
  }
  out.push(found ?? {frame, error: '沒有收到量測結果', issues: []});
  process.stdout.write(`  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  process.stdout.write(`  frame ${frame}: ${found ? found.issues.length + ' 個問題' : '無結果'}\n`);
}
await browser.close({silent: true});
fs.writeFileSync(path.join(proj, 'qa_layout.json'), JSON.stringify(out, null, 1));
