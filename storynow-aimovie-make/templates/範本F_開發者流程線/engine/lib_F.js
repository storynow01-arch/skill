// 範本F：開發者流程線 —— 通用渲染器
// 讀 storyboard.json（每段旁白＋畫面型別）與 timings.json（build_audio.py 量出的每段秒數），逐格畫出。
// 每一格畫面只由時間 t 決定：沒有計時器、沒有亂數。
(() => {
const cv = document.getElementById('c'), x = cv.getContext('2d');
const W = 1920, H = 1080;
const C = { bg: '#0b0e14', panel: '#131924', line: '#263043', ivory: '#EDEAE3', dim: '#7C8698', green: '#3DDC97', amber: '#FFB547', blue: '#5AA9FF', red: '#FF6B6B', violet: '#B38CFF' };
const STEPCOL = [C.amber, C.blue, C.violet, C.green, C.red];
const F = '"Microsoft JhengHei","微軟正黑體",sans-serif', MONO = '"Cascadia Code",Consolas,monospace', LATIN = '"Segoe UI Variable Display","Segoe UI",sans-serif';
let SB, T, S;

// ---------- 動畫工具 ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t, a, d) => clamp((t - a) / d);
const outBack = k => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
const outExpo = k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k);
const ioCubic = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const st = i => S[i - 1].start;
// 關鍵詞時間＝字元位置 ÷ 句長 × 該句秒數；找不到就報錯（storyboard 的 word 要寫旁白裡真的有的字）
function K(i, word) { const s = S[i - 1], idx = s.text.indexOf(word); if (idx < 0) throw new Error(`第 ${i} 段旁白找不到關鍵詞「${word}」`); return s.start + idx / s.text.length * s.dur; }
const KW = (i, word, dflt) => word ? K(i, word) : dflt;
function enter(t, at, kind = 'expo', d) {
  if (kind === 'back') { const k = prog(t, at, d || 0.5); return { a: clamp(k * 2.2), s: 0.65 + 0.35 * outBack(k), dy: 0 }; }
  const k = outExpo(prog(t, at, d || 0.55)); return { a: k, s: 1, dy: (1 - k) * 40 };
}
function withA(e, cx, cy, fn) { if (e.a <= 0.001) return; x.save(); x.globalAlpha *= e.a; x.translate(cx, cy + e.dy); x.scale(e.s, e.s); fn(); x.restore(); }
const isLatin = s => /^[\x00-\x7F’'·×→ ]+$/.test(s);

// ---------- 繪圖工具 ----------
function rr(px, py, w, h, r) { x.beginPath(); x.roundRect(px, py, w, h, r); }
function txt(s, px, py, size, col = C.ivory, weight = 700, align = 'center', font = F) {
  x.font = `${weight} ${size}px ${font}`; x.fillStyle = col; x.textAlign = align; x.textBaseline = 'middle'; x.fillText(s, px, py); }
function panel(w, h, stroke = C.line) { rr(-w / 2, -h / 2, w, h, 20); x.fillStyle = C.panel; x.fill(); x.lineWidth = 2; x.strokeStyle = stroke; x.stroke(); }
function check(px, py, r, k, col = C.green) {
  if (k <= 0) return; x.save(); x.beginPath(); x.arc(px, py, r, 0, 7); x.fillStyle = col; x.fill();
  x.strokeStyle = C.bg; x.lineWidth = r * .24; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
  const p = [[-.45, .02], [-.12, .34], [.48, -.3]]; x.moveTo(px + p[0][0] * r, py + p[0][1] * r);
  for (let i = 1; i <= 2; i++) { const kk = clamp(k * 2 - (i - 1)); if (kk <= 0) break;
    x.lineTo(px + (p[i - 1][0] + (p[i][0] - p[i - 1][0]) * kk) * r, py + (p[i - 1][1] + (p[i][1] - p[i - 1][1]) * kk) * r); }
  x.stroke(); x.restore(); }
function arrow(x1, y1, x2, y2, k, col = C.dim) {
  if (k <= 0) return; const ex = x1 + (x2 - x1) * k, ey = y1 + (y2 - y1) * k, a = Math.atan2(y2 - y1, x2 - x1);
  x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(x1, y1); x.lineTo(ex, ey); x.stroke();
  x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex - 18 * Math.cos(a - .45), ey - 18 * Math.sin(a - .45)); x.lineTo(ex - 18 * Math.cos(a + .45), ey - 18 * Math.sin(a + .45)); x.fill(); x.restore(); }
function pill(k, a, b, colA, colB, w = 560) { // 狀態膠囊：k>0 時由 a 翻成 b
  const on = k > 0, col = on ? colB : colA;
  rr(-w / 2, -48, w, 96, 48); x.fillStyle = col + '26'; x.fill(); x.strokeStyle = col; x.lineWidth = 3; x.stroke();
  x.beginPath(); x.arc(-w / 2 + 64, 0, 20, 0, 7); x.fillStyle = col; x.fill();
  txt(on ? b : a, 30, 2, 34, col, 700, 'center', MONO);
}
const pillW = (a, b) => { x.font = `700 34px ${MONO}`; return Math.max(560, Math.max(x.measureText(a).width, x.measureText(b).width) + 200); };
function docCard(t, at, w, h, title, lines, col, gap = 0.25, size = 30) {
  panel(w, h, col); txt(title, -w / 2 + 40, -h / 2 + 52, 32, col, 700, 'left', MONO);
  lines.forEach((l, i) => withA(enter(t, at + 0.3 + i * gap), -w / 2 + 40, -h / 2 + 130 + i * 66, () => { rr(0, -5, 10, 10, 2); x.fillStyle = col; x.fill(); txt(l, 26, 0, size, C.ivory, 600, 'left'); }));
}
function rowCheck(t, kAt, w, title, desc, mono) {
  const ok = prog(t, kAt, .3) > 0;
  rr(-w / 2, -58, w, 116, 22); x.fillStyle = C.panel; x.fill(); x.strokeStyle = ok ? C.green : C.line; x.lineWidth = 3; x.stroke();
  txt(title, -w / 2 + 44, -14, 38, C.ivory, 800, 'left', mono ? MONO : F); txt(desc, -w / 2 + 44, 30, 26, C.dim, 600, 'left');
  check(w / 2 - 70, 0, 36, prog(t, kAt, 0.45));
}
function background() {
  x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,.05)';
  for (let gx = 40; gx < W; gx += 48) for (let gy = 40; gy < 940; gy += 48) { x.beginPath(); x.arc(gx, gy, 1.6, 0, 7); x.fill(); }
  const g = x.createRadialGradient(W / 2, 200, 0, W / 2, 200, 1100); g.addColorStop(0, 'rgba(90,169,255,.10)'); g.addColorStop(1, 'rgba(90,169,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
}

// ---------- 流程節點列 ----------
let PIPES = [];
function setupPipes() {
  let part = 0; S.forEach((s, k) => { const sc = SB.segments[k].scene; if (sc.type === 'transition' && k > 0) part++; s.part = part; });
  PIPES = SB.parts.map((p, pi) => {
    const segs = S.map((s, k) => ({ i: k + 1, s, sc: SB.segments[k].scene })).filter(o => o.s.part === pi);
    const intro = segs.find(o => o.sc.type === 'overview' || o.sc.type === 'transition');
    const lit = p.steps.map((_, j) => { const o = segs.find(o => o.sc.step === j); return o ? o.i : null; });
    const lastLit = Math.max(...lit.filter(Boolean));
    const ending = segs.find(o => o.sc.type === 'slogan');
    const nextPart = S.findIndex(s => s.part === pi + 1);
    return { steps: p.steps, n: p.steps.length,
      appear: intro ? st(intro.i) + (intro.sc.type === 'overview' ? 0.4 : 0.3) : 1e9,
      lit, curEnd: lastLit < S.length ? st(lastLit + 1) : 1e9,
      all: ending ? KW(ending.i, ending.sc.allWord, st(ending.i) + 0.3) : 1e9,
      exit: nextPart >= 0 ? S[nextPart].start - 0.2 : 1e9 };
  });
}
function pipeline(t, P) {
  const a0 = P.appear; if (t < a0 - 0.2) return;
  const ex = ioCubic(prog(t, P.exit, 0.4)); if (ex >= 1) return;
  const span = Math.min(1320, (P.n - 1) * 330), NX = i => W / 2 - span / 2 + i * span / Math.max(1, P.n - 1), NY = 230;
  x.save(); x.globalAlpha = 1 - ex; x.translate(0, -80 * ex);
  const lit = i => P.lit[i] ? st(P.lit[i]) : 1e9, allLine = ioCubic(prog(t, P.all, 1.2));
  for (let i = 0; i < P.n; i++) {
    const e = enter(t, a0 + i * 0.08, 'back'), on = prog(t, lit(i), 0.35), col = STEPCOL[i % 5];
    if (i < P.n - 1) {
      x.save(); x.globalAlpha *= e.a; x.strokeStyle = C.line; x.lineWidth = 4; x.beginPath(); x.moveTo(NX(i) + 48, NY); x.lineTo(NX(i + 1) - 48, NY); x.stroke();
      const fl = Math.max(prog(t, lit(i + 1) - 0.4, 0.4), allLine);
      if (fl > 0) { x.strokeStyle = C.ivory; x.globalAlpha *= 0.85; x.beginPath(); x.moveTo(NX(i) + 48, NY); x.lineTo(NX(i) + 48 + (NX(i + 1) - NX(i) - 96) * fl, NY); x.stroke(); }
      x.restore();
    }
    withA(e, NX(i), NY, () => {
      const cur = t >= lit(i) && t < (i === P.n - 1 ? P.curEnd : lit(i + 1));
      if (on > 0) { x.save(); x.globalAlpha *= on * (cur ? 0.35 + 0.15 * Math.sin(t * 5) : 0.15); x.beginPath(); x.arc(0, 0, 70, 0, 7); x.fillStyle = col; x.fill(); x.restore(); }
      x.beginPath(); x.arc(0, 0, 44, 0, 7); x.fillStyle = on > 0 ? col : C.panel; x.fill(); x.lineWidth = 3; x.strokeStyle = on > 0 ? col : C.line; x.stroke();
      txt(String(i + 1), 0, 2, 36, on > 0 ? C.bg : C.dim, 800, 'center', MONO);
      txt(P.steps[i][0], 0, 92, 28, on > 0 ? C.ivory : C.dim, 600, 'center', MONO);
      txt(P.steps[i][1], 0, 132, 26, on > 0 ? col : C.dim, 700);
    });
  }
  x.restore();
}

// ---------- 舞台畫面庫（y 420～880） ----------
const TKX = (i, n = 4) => W / 2 + (i - (n - 1) / 2) * 360;
const STAGE = {
  // 開場鉤子：終端機程式碼捲動，errorFrom 之後變紅；念到 stampWord 時彈出問號圓章
  terminal(t, i, sc) {
    const s = st(i), code = sc.code;
    withA(enter(t, s - 0.1), W / 2, 470, () => {
      panel(1100, 520);
      for (let j = 0; j < 3; j++) { x.beginPath(); x.arc(-510 + j * 30, -228, 9, 0, 7); x.fillStyle = [C.red, C.amber, C.green][j]; x.fill(); }
      const sc2 = Math.min(outExpo(prog(t, s, 2.2)) * code.length, code.length);
      x.save(); x.beginPath(); x.rect(-540, -200, 1080, 440); x.clip();
      code.forEach((l, j) => { const y = -170 + j * 52 - Math.max(0, sc2 - 6) * 52; if (j < sc2 + 1) txt(l, -500, y, 32, sc.errorFrom != null && j >= sc.errorFrom ? C.red : C.ivory, 400, 'left', MONO); });
      x.restore();
      withA(enter(t, KW(i, sc.stampWord, s + 1.6), 'back', 0.5), 380, 60, () => { x.beginPath(); x.arc(0, 0, 110, 0, 7); x.fillStyle = C.amber; x.fill(); txt(sc.stamp || '?', 0, 6, 150, C.bg, 800, 'center', MONO); });
    });
  },
  // 總覽：大標題（＋技術膠囊＋重點資訊＋小字）
  overview(t, i, sc) {
    const s = st(i), rich = sc.chip || sc.info, ty = rich ? 520 : 600;
    withA(enter(t, s, 'back', 0.6), W / 2, ty, () => txt(sc.title, 0, 0, isLatin(sc.title) ? 88 : 80, C.ivory, 800, 'center', isLatin(sc.title) ? LATIN : F));
    if (sc.subtitle) withA(enter(t, s + 0.25), W / 2, ty + 100, () => txt(sc.subtitle, 0, 0, 44, C.dim, 700));
    if (sc.chip) withA(enter(t, s + 0.25), W / 2, 615, () => { x.font = `600 30px ${MONO}`; const w = x.measureText(sc.chip).width + 60;
      rr(-w / 2, -30, w, 60, 30); x.fillStyle = 'rgba(90,169,255,.12)'; x.fill(); x.strokeStyle = C.blue; x.lineWidth = 2; x.stroke(); txt(sc.chip, 0, 2, 30, C.blue, 600, 'center', MONO); });
    const ki = KW(i, sc.infoWord, s + 0.6);
    if (sc.info) withA(enter(t, ki), W / 2, 715, () => txt(sc.info, 0, 0, 38, C.amber, 700));
    if (sc.note) withA(enter(t, ki + 0.15), W / 2, 790, () => txt(sc.note, 0, 0, 28, C.dim, 600));
  },
  // 轉場：換一組節點列，大標題＋副標
  transition(t, i, sc) {
    const s = st(i);
    withA(enter(t, s + 0.1, 'back', 0.6), W / 2, 560, () => txt(sc.title, 0, 0, 96, C.ivory, 800));
    if (sc.sub) withA(enter(t, s + 0.4), W / 2, 680, () => txt(sc.sub, 0, 0, 36, C.dim, 600));
  },
  // 檢查列：2～3 條，念到 word 時打勾
  checkRows(t, i, sc) {
    const s = st(i), n = sc.rows.length, y0 = n === 2 ? 540 : 485, gap = n === 2 ? 180 : 150;
    sc.rows.forEach((r, j) => withA(enter(t, s + 0.2 + j * 0.08, 'back'), W / 2, y0 + j * gap, () => rowCheck(t, KW(i, r.word, s + 0.8 + j * 0.6) + 0.2, 1120, r.title, r.desc, sc.mono)));
    if (sc.note) withA(enter(t, s + 0.6), W / 2, 880, () => txt(sc.note, 0, 0, 28, C.dim, 600));
  },
  // Q/A 對話氣泡（左）＋文件卡（右）
  qa(t, i, sc) {
    const s = st(i);
    sc.qa.forEach(([w, q], j) => withA(enter(t, s + 0.3 + j * 0.55), 560 + (w === 'A' ? 90 : 0), 500 + j * 120, () => {
      x.font = `700 34px ${F}`; const ww = x.measureText(q).width + 120;
      rr(-ww / 2, -42, ww, 84, 42); x.fillStyle = w === 'Q' ? 'rgba(255,181,71,.12)' : C.panel; x.fill(); x.strokeStyle = w === 'Q' ? C.amber : C.line; x.lineWidth = 2; x.stroke();
      txt(w, -ww / 2 + 46, 2, 32, w === 'Q' ? C.amber : C.ivory, 800, 'center', MONO); txt(q, 30, 2, 34, C.ivory, 700); }));
    if (sc.doc) { const at = KW(i, sc.doc.word, s + 1.0);
      withA(enter(t, at, 'back'), 1400, 620, () => docCard(t, at, 500, 330, sc.doc.title, sc.doc.lines, STEPCOL[(sc.step ?? 0) % 5], 0.12)); }
  },
  // 上線：狀態膠囊翻轉＋網址卡＋QR 方塊打勾
  deploy(t, i, sc) {
    const s = st(i), kL = KW(i, sc.pillWord, s + 1.2) + 0.4, kQ = KW(i, sc.qrWord, s + 2);
    withA(enter(t, s + 0.15, 'back'), W / 2, 470, () => pill(prog(t, kL, .2), sc.pill[0], sc.pill[1], C.red, C.green, pillW(...sc.pill)));
    withA(enter(t, s + 0.5), 760, 700, () => { panel(820, 150); txt(sc.card[0], -370, -36, 26, C.dim, 600, 'left'); txt(sc.card[1], -370, 18, 32, C.blue, 600, 'left', MONO); });
    withA(enter(t, kQ, 'back'), 1420, 700, () => { panel(240, 240, C.green);
      for (let a = 0; a < 9; a++) for (let b = 0; b < 9; b++) { const fin = (a < 3 && b < 3) || (a < 3 && b > 5) || (a > 5 && b < 3);
        if (fin || (a * 7 + b * 13 + a * b) % 5 < 2) { x.fillStyle = C.ivory; x.fillRect(-81 + b * 18, -81 + a * 18, 16, 16); } }
      check(100, -100, 28, prog(t, kQ + 0.4, .4)); });
  },
  // 收攏成文件：上一段的元素縮小移向中央淡出，文件卡彈出（可附表格，念到 rowWord 時某一列亮起）
  mergeDoc(t, i, sc) {
    const s = st(i), k = ioCubic(prog(t, s + 0.05, 0.7)), cx = sc.table ? 700 : W / 2, col = STEPCOL[(sc.step ?? 1) % 5];
    for (let j = 0; j < 3; j++) { x.save(); x.globalAlpha = 1 - k; const sx = 560 + (cx - 560) * k, sy = 500 + j * 120 + (650 - 500 - j * 120) * k;
      rr(sx - 220 * (1 - k * .8), sy - 40, 440 * (1 - k * .8), 80, 40); x.fillStyle = C.panel; x.fill(); x.restore(); }
    withA(enter(t, s + 0.45, 'back'), cx, 650, () => docCard(t, s + 0.45, sc.table ? 640 : 760, 360, sc.doc.title, sc.doc.lines, col, 0.25));
    if (sc.table) { const kR = KW(i, sc.table.rowWord, s + 1.5), cols = sc.table.cols, cw = 360 / cols.length, ch = 54;
      withA(enter(t, s + 0.8), 1400, 650, () => {
        for (let r = 0; r < 5; r++) for (let c = 0; c < cols.length; c++) {
          const px = -180 + c * cw, py = -135 + r * ch, hl = r === 2 && prog(t, kR, .3) > 0;
          x.fillStyle = r === 0 ? col + '40' : hl ? 'rgba(61,220,151,.25)' : C.panel; x.fillRect(px, py, cw, ch);
          x.strokeStyle = C.line; x.lineWidth = 2; x.strokeRect(px, py, cw, ch);
          if (r === 0) txt(cols[c], px + cw / 2, py + ch / 2, 24, col, 700);
          else { x.fillStyle = hl ? C.green : 'rgba(237,234,227,.25)'; rr(px + 16, py + 22, cw - 32 - c * 10, 10, 5); x.fill(); }
        }
        if (sc.table.label && prog(t, kR, .3) > 0) withA(enter(t, kR + 0.1), 0, 165, () => txt(sc.table.label, -30, 0, 26, C.green, 700));
      }); }
  },
  // 一分為四：上一張大卡縮小淡出，4 張小卡以 0.08 秒間隔彈出；可加虛線關係（deps）與底部標籤（tag）
  split4(t, i, sc) {
    const s = st(i), n = sc.cards.length, col = sc.color ? C[sc.color] : STEPCOL[(sc.step ?? 2) % 5], y = sc.tag ? 600 : 640;
    withA({ a: 1 - prog(t, s, 0.3), s: 1, dy: 0 }, W / 2, 650, () => panel(700 * (1 - prog(t, s, 0.3) * .3), 360, C.line));
    sc.cards.forEach(([l, nm], j) => withA(enter(t, s + 0.15 + j * 0.08, 'back'), TKX(j, n), y, () => {
      rr(-160, -90, 320, 180, 16); x.fillStyle = C.panel; x.fill(); x.strokeStyle = (sc.hlLast && j === n - 1) ? C.green : col; x.lineWidth = 3; x.stroke();
      txt(l, -130, -50, 28, col, 800, 'left', MONO); txt(nm, 0, 20, isLatin(nm) ? 30 : 34, C.ivory, 700, 'center', isLatin(nm) ? MONO : F); }));
    if (sc.deps) { const kd = KW(i, sc.depWord, s + 1.2), dc = sc.depColor === 'green' ? C.green : C.violet;
      sc.deps.forEach(([a, b], j) => { const k = prog(t, kd - 0.3 + j * 0.12, 0.35); if (k <= 0) return;
        x.save(); x.strokeStyle = dc; x.lineWidth = 4; x.setLineDash([12, 10]);
        const x1 = TKX(a, n), x2 = TKX(b, n); x.beginPath(); x.moveTo(x1, y + 90); x.quadraticCurveTo((x1 + x2) / 2, y + 160 + Math.abs(b - a) * 14, x1 + (x2 - x1) * k, y + 90 + (1 - k) * 50); x.stroke(); x.restore(); }); }
    if (sc.note) withA(enter(t, KW(i, sc.depWord, s + 1.2) + 0.4), W / 2, 885, () => txt(sc.note, 0, 0, 26, C.dim, 600));
    if (sc.tag) withA(enter(t, KW(i, sc.tag.word, s + 1.5) - 0.2, 'back'), W / 2, 800, () => { x.font = `700 32px ${F}`; const w = x.measureText(sc.tag.text).width + 120;
      rr(-w / 2, -40, w, 80, 40); x.fillStyle = col + '1f'; x.fill(); x.strokeStyle = col; x.lineWidth = 2; x.stroke(); txt(sc.tag.text, 0, 2, 32, col, 700); });
  },
  // 測試驅動：紅燈 failed → 綠燈 passed，下方卡片逐張打勾
  tdd(t, i, sc) {
    const s = st(i), kg = KW(i, sc.word, s + 0.6) + 0.6, kd = KW(i, sc.doneWord, s + 1.6), n = sc.cards.length;
    withA(enter(t, KW(i, sc.word, s + 0.3), 'back'), W / 2, 460, () => pill(prog(t, kg, .2), sc.pill[0], sc.pill[1], C.red, C.green, pillW(...sc.pill)));
    sc.cards.forEach(([l, nm], j) => { const k = prog(t, kd + j * 0.3, 0.4); withA({ a: 1, s: 1, dy: 0 }, TKX(j, n), 640, () => {
      rr(-150, -90, 300, 180, 16); x.fillStyle = C.panel; x.fill(); x.strokeStyle = k > 0 ? C.green : C.violet; x.lineWidth = 3; x.stroke();
      txt(l, -120, -50, 30, k > 0 ? C.green : C.violet, 800, 'left', MONO); txt(nm, 0, 20, 34, C.ivory, 700); check(110, -50, 26, k); }); });
  },
  // 三段鏈：A → B → C 依序打勾，上方狀態膠囊翻轉
  chain3(t, i, sc) {
    const s = st(i), kD = KW(i, sc.doneWord, s + 1), kU = KW(i, sc.pillWord, s + 2);
    withA(enter(t, s + 0.15, 'back'), W / 2, 470, () => pill(prog(t, kU + 0.3, .2), sc.pill[0], sc.pill[1], C.amber, C.green, pillW(...sc.pill)));
    sc.items.forEach(([a, b], j) => { const cx = W / 2 + (j - 1) * 400;
      withA(enter(t, s + 0.4 + j * 0.08, 'back'), cx, 700, () => { panel(300, 180, prog(t, kD + j * 0.3, .3) > 0 ? C.green : C.line);
        txt(a, 0, -28, 40, C.ivory, 800, 'center', isLatin(a) ? MONO : F); txt(b, 0, 34, 26, C.dim, 600); check(120, -60, 24, prog(t, kD + j * 0.3, 0.4)); });
      if (j < 2) arrow(cx + 162, 700, cx + 238, 700, prog(t, s + 0.6 + j * 0.1, .3)); });
  },
  // 文件卡（左）＋證照／成果卡（右，念到時打勾）
  docCerts(t, i, sc) {
    const s = st(i), col = STEPCOL[(sc.step ?? 0) % 5];
    withA(enter(t, s + 0.15, 'back'), 640, 650, () => docCard(t, s + 0.15, 760, 380, sc.doc.title, sc.doc.lines, col, 0.22, 30));
    sc.certs.forEach((c, j) => { const k = KW(i, c.word, s + 1 + j * 0.8);
      withA(enter(t, k - 0.2, 'back'), 1440, 545 + j * 210, () => { panel(460, 170, prog(t, k + .2, .3) > 0 ? C.green : C.line);
        txt(c.name, -190, -22, 38, C.ivory, 800, 'left'); txt(c.desc, -190, 30, 26, C.dim, 600, 'left'); check(170, 0, 32, prog(t, k + .2, .45)); }); });
  },
  // 數據卡：上方狀態膠囊翻轉，3 張數字卡跑數字
  stats(t, i, sc) {
    const s = st(i), kN = KW(i, sc.pillWord, s + 1) + 0.3, kG = KW(i, sc.word, s + 1.5), cc = [C.amber, C.green, C.blue];
    if (sc.pill) withA(enter(t, s + 0.15, 'back'), W / 2, 470, () => pill(prog(t, kN, .2), sc.pill[0], sc.pill[1], C.amber, C.green, pillW(...sc.pill)));
    sc.stats.forEach(([n, u, l], j) => withA(enter(t, kG + j * 0.08, 'back'), W / 2 + (j - (sc.stats.length - 1) / 2) * 400, 700, () => { panel(340, 220, cc[j % 3]);
      const v = Math.round(n * outExpo(prog(t, kG + j * 0.08, 1.2)));
      txt(String(v), -20, -26, 96, cc[j % 3], 800, 'right', MONO); txt(u, 0, -14, 36, C.ivory, 700, 'left'); txt(l, 0, 66, 28, C.dim, 600); }));
  },
  // 大數字：1～2 個數字跑到念到 word 時剛好停住，下方名單膠囊依序滑入
  bigNumbers(t, i, sc) {
    const s = st(i), n = sc.nums.length, cc = [C.green, C.amber];
    sc.nums.forEach((m, j) => { const a0 = s + 0.4 + j * 0.5, end = Math.max(a0 + 0.6, KW(i, m.word, a0 + 1.2)), cx = n === 1 ? W / 2 : (j === 0 ? 660 : 1260);
      withA(enter(t, a0, 'back'), cx, 520, () => { const v = Math.round(m.value * ioCubic(prog(t, a0, end - a0)));
        const s2 = (m.prefix || '') + v + (m.suffix || '');
        if (m.unit) { txt(s2, 0, -20, 120, cc[j], 800, 'right', MONO); txt(m.unit, 20, 0, 40, C.ivory, 700, 'left'); txt(m.label, -60, 70, 28, C.dim, 600); }
        else { txt(s2, 0, -20, 120, cc[j], 800, 'center', MONO); txt(m.label, 0, 70, 28, C.dim, 600); } }); });
    (sc.pills || []).forEach((p, j) => withA(enter(t, s + 1.2 + j * 0.1), W / 2 + (j - (sc.pills.length - 1) / 2) * 252, 790, () => {
      rr(-115, -36, 230, 72, 36); x.fillStyle = C.panel; x.fill(); x.strokeStyle = C.line; x.lineWidth = 2; x.stroke(); txt(p, 0, 2, 28, C.ivory, 700); }));
  },
  // 標語收尾：等寬雙色大標語（左琥珀右綠）＋一行總結＋署名膠囊＋來源小字（後三者可省略）
  slogan(t, i, sc) {
    const s = st(i), k = KW(i, sc.word, s + 0.3), font = isLatin(sc.left + sc.right) ? MONO : F, gap = font === MONO ? 300 : 260;
    if (sc.top) withA(enter(t, s + 0.15), W / 2, 500, () => txt(sc.top, 0, 0, 44, C.ivory, 700));
    const sy = sc.top ? 650 : 520;
    withA(enter(t, k, 'back', 0.6), W / 2, sy, () => { txt(sc.left, -gap, 0, 100, C.amber, 800, 'center', font); txt('→', 0, 0, 96, C.dim, 700, 'center', MONO); txt(sc.right, gap, 0, 100, C.green, 800, 'center', font); });
    if (sc.line) withA(enter(t, KW(i, sc.lineWord, k + 0.3)), W / 2, sy + 130, () => txt(sc.line, 0, 0, 44, C.ivory, 700));
    if (sc.note) withA(enter(t, KW(i, sc.noteWord, k + 0.5)), W / 2, sy + 150, () => txt(sc.note, 0, 0, 26, C.dim, 600));
    if (sc.credit) { const kc = KW(i, sc.creditWord, k + 0.8);
      withA(enter(t, kc, 'back', 0.6), W / 2, 790, () => { x.font = `800 42px ${F}`; const w = x.measureText(sc.credit).width + 140;
        rr(-w / 2, -50, w, 100, 50); x.fillStyle = 'rgba(237,234,227,.08)'; x.fill(); x.strokeStyle = C.ivory; x.lineWidth = 2; x.stroke(); txt(sc.credit, 0, 3, 42, C.ivory, 800); });
      if (sc.source) withA(enter(t, kc + 0.4), W - 60, 905, () => txt(sc.source, 0, 0, 22, C.dim, 500, 'right')); }
  },
};

function subtitles(t) {
  for (const s of S) for (const p of s.phrases) {
    if (t < p.a || t >= p.b) continue;
    const a = clamp(Math.min((t - p.a) / 0.1, (p.b - t) / 0.1));
    x.save(); x.globalAlpha = a; x.font = `700 42px ${F}`; const w = x.measureText(p.text).width + 70;
    rr(W / 2 - w / 2, 962, w, 74, 37); x.fillStyle = 'rgba(5,7,12,.85)'; x.fill(); txt(p.text, W / 2, 1000, 42, C.ivory, 700); x.restore();
  }
}
function draw(t) {
  background();
  PIPES.forEach(P => pipeline(t, P));
  for (let i = 1; i <= S.length; i++) {
    const a = st(i) - 0.3, b = i < S.length ? st(i + 1) - 0.2 : T.total + 1;
    if (t < a || t > b + 0.5) continue;
    const sc = SB.segments[i - 1].scene, fn = STAGE[sc.type];
    if (!fn) throw new Error(`第 ${i} 段：沒有這種畫面型別「${sc.type}」`);
    const ex = ioCubic(prog(t, b, 0.4));
    x.save(); x.globalAlpha = 1 - ex; x.translate(0, -80 * ex); fn(t, i, sc); x.restore();
  }
  const fo = prog(t, T.total - 0.7, 0.7); if (fo > 0) { x.fillStyle = `rgba(11,14,20,${fo})`; x.fillRect(0, 0, W, H); }
  subtitles(t);
}
window.seek = t => draw(t);
window.ready = (async () => {
  SB = await (await fetch('storyboard.json')).json(); T = await (await fetch('timings.json')).json(); S = T.segs;
  window.DURATION = T.total; setupPipes();
  await document.fonts.load(`800 40px ${F}`); await document.fonts.ready; draw(0);
})();
})();
