// 版面品檢：對每個場景抽樣幾格，用 QaProbe 量測畫面上所有文字的實際位置。
// 用法（在 04_引擎/remotion 執行）：node qa_layout.mjs <輸出資料夾> <節...>
// 每節輸出 <輸出資料夾>/layout_<節>.json，由 qa_run.py 併入報告。
//
// 抽樣點（每個場景）：
//   ① 進場完成（1.8s）
//   ② 每次焦點切換後 0.6s（被點到的項目會放大、發光，最容易撞到旁邊）
//   ③ 場景 70% 處（footer、結論多半在這之後出現）
//   ④ 淡出前 0.5s（所有元素都已出現）
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const [outDir, ...ids] = process.argv.slice(2);
const FPS = 30;
const proj = process.cwd();
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.join(proj, 'src', 'index.ts')});
const browser = await openBrowser('chrome');

for (const id of ids) {
  const data = JSON.parse(fs.readFileSync(path.join(proj, 'src', 'data', `${id}.json`), 'utf8'));
  const inputProps = {data, qa: true};
  const composition = await selectComposition({serveUrl, id: 'Section', inputProps, puppeteerInstance: browser});
  const samples = [];
  for (const s of data.scenes) {
    const ts = new Set([1.8, 4.0, s.durSec * 0.7, s.durSec - 0.5]);
    for (const [at] of s.props?.focusPlan ?? []) ts.add(at + 0.6);
    for (const t of [...ts].filter((t) => t > 0 && t < s.durSec).sort((a, b) => a - b))
      samples.push({scene: s.id, type: s.type, t: Number(t.toFixed(2)), frame: Math.round((s.startSec + t) * FPS)});
  }
  const out = [];
  const t0 = Date.now();
  for (const smp of samples) {
    let found = null;
    try {
      await renderStill({
        composition, serveUrl, frame: Math.min(smp.frame, composition.durationInFrames - 1), inputProps,
        puppeteerInstance: browser, scale: 0.25, timeoutInMilliseconds: 60000, logLevel: 'error',
        output: path.join(os.tmpdir(), `qa_layout.png`),
        onBrowserLog: (log) => { if (log.text.startsWith('QA:')) found = JSON.parse(log.text.slice(3)); },
      });
    } catch (e) {
      found = {error: String(e.message ?? e).slice(0, 200), issues: []};
    }
    const rec = {...smp, ...(found ?? {error: '沒有收到量測結果', issues: []})};
    // 渲染錯誤一律算問題（2026-10-06：測驗卡 revealAt 缺漏會整格報錯，原本只記 error、問題數 0 → 假通過）
    if (rec.error) rec.issues = [...(rec.issues ?? []), {kind: '渲染錯誤', text: smp.scene, detail: rec.error}];
    // 畫面空白：場景開始 4 秒後畫面上還沒有任何內容文字（只剩字幕與 LOGO）
    if (smp.t >= 4 && rec.boxes && rec.boxes.length === 0)
      rec.issues = [...(rec.issues ?? []), {kind: '畫面空白', text: smp.scene, detail: `場景第 ${smp.t}s 沒有任何內容`}];
    out.push(rec);
  }
  const n = out.reduce((k, o) => k + (o.issues?.length ?? 0), 0);
  fs.writeFileSync(path.join(outDir, `layout_${id}.json`), JSON.stringify(out));
  console.log(`${id}: ${samples.length} 格，${n} 個問題（${((Date.now() - t0) / 1000).toFixed(0)}s）`);
}
await browser.close({silent: true});
