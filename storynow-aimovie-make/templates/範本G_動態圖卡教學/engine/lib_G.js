// 範本G：動態圖卡教學 —— 通用渲染器
// 讀 storyboard.json（每段旁白＋畫面型別）與 timings.json，逐格畫出。每一格畫面只由時間 t 決定。
(() => {
const cv = document.getElementById('c'), x = cv.getContext('2d');
const W = 1920, H = 1080;
const C = { bg: '#0d1220', ivory: '#F5F0E6', dim: '#8E96A8', coral: '#E07A52', teal: '#4FC3B5', yellow: '#F2C14E', red: '#E5604F', card: '#182033', line: '#2A3550' };
const F = '"Microsoft JhengHei","微軟正黑體",sans-serif', MONO = 'Consolas,"Cascadia Mono",monospace';
let SB, T, S;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t, a, d) => clamp((t - a) / d);
const outBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const outExpo = k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k);
const ioCubic = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const st = i => S[i - 1].start;
// 關鍵詞時間：關鍵詞在該句中的字元位置 ÷ 句長 × 該句秒數
function K(i, word) { const s = S[i - 1], idx = s.text.indexOf(word); if (idx < 0) throw new Error(`第 ${i} 段旁白找不到關鍵詞「${word}」`); return s.start + idx / s.text.length * s.dur; }
const KW = (i, word, dflt) => word ? K(i, word) : dflt;
// 進場：主角 outBack 彈出（0.6→1 倍回彈）、次要 outExpo 快進慢停（下方 46px 上滑）
function enter(t, at, kind = 'expo', d) {
  if (kind === 'back') { const k = prog(t, at, d || 0.55); return { a: clamp(k * 2.2), s: 0.6 + 0.4 * outBack(k), dy: 0 }; }
  const k = outExpo(prog(t, at, d || 0.6)); return { a: k, s: 1, dy: (1 - k) * 46 };
}
function withA(e, cx, cy, fn) { if (e.a <= 0.001) return; x.save(); x.globalAlpha *= e.a; x.translate(cx, cy + e.dy); x.scale(e.s, e.s); fn(); x.restore(); }

function rr(px, py, w, h, r) { x.beginPath(); x.roundRect(px, py, w, h, r); }
function txt(s, px, py, size, col = C.ivory, weight = 700, align = 'center', font = F) {
  x.font = `${weight} ${size}px ${font}`; x.fillStyle = col; x.textAlign = align; x.textBaseline = 'middle'; x.fillText(s, px, py); }
const COL = n => C[n] || n;
function rich(parts, px, py, size, weight = 700, font = F) { // [[文字, 顏色名], ...] 置中
  x.font = `${weight} ${size}px ${font}`; const w = parts.reduce((a, [s]) => a + x.measureText(s).width, 0);
  let cx = px - w / 2; x.textAlign = 'left'; x.textBaseline = 'middle';
  for (const [s, c] of parts) { x.fillStyle = COL(c || 'ivory'); x.fillText(s, cx, py); cx += x.measureText(s).width; }
}
function card(w, h, col = C.card, stroke = C.line, r = 28) { rr(-w / 2, -h / 2, w, h, r); x.fillStyle = col; x.fill(); x.lineWidth = 2; x.strokeStyle = stroke; x.stroke(); }
function check(px, py, r, col = C.teal, k = 1) {
  if (k <= 0) return; x.save(); x.beginPath(); x.arc(px, py, r, 0, 7); x.fillStyle = col; x.fill();
  x.strokeStyle = C.bg; x.lineWidth = r * 0.22; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); const p = [[-0.45, 0.02], [-0.12, 0.34], [0.48, -0.3]];
  x.moveTo(px + p[0][0] * r, py + p[0][1] * r);
  for (let i = 1; i <= 2; i++) { const kk = clamp(k * 2 - (i - 1)); if (kk <= 0) break;
    x.lineTo(px + (p[i - 1][0] + (p[i][0] - p[i - 1][0]) * kk) * r, py + (p[i - 1][1] + (p[i][1] - p[i - 1][1]) * kk) * r); }
  x.stroke(); x.restore();
}
function arrow(x1, y1, x2, y2, k, col = C.dim) {
  if (k <= 0) return; const ex = x1 + (x2 - x1) * k, ey = y1 + (y2 - y1) * k;
  x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 5; x.lineCap = 'round';
  x.beginPath(); x.moveTo(x1, y1); x.lineTo(ex, ey); x.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1); x.beginPath(); x.moveTo(ex, ey);
  x.lineTo(ex - 22 * Math.cos(a - 0.45), ey - 22 * Math.sin(a - 0.45)); x.lineTo(ex - 22 * Math.cos(a + 0.45), ey - 22 * Math.sin(a + 0.45)); x.fill(); x.restore();
}
// 向量圖示：term（終端機）hex（六角形＋文字）film（底片▶）；其他字串就畫在彩色方框裡
function icon(kind, col, label) {
  if (kind === 'term') { rr(-110, -80, 220, 160, 18); x.fillStyle = '#0b0f1a'; x.fill(); x.strokeStyle = col; x.lineWidth = 4; x.stroke(); txt('>_', -30, 0, 64, col, 700, 'center', MONO); return; }
  if (kind === 'hex') { x.beginPath(); for (let a = 0; a < 6; a++) { const an = Math.PI / 6 + a * Math.PI / 3; x.lineTo(Math.cos(an) * 95, Math.sin(an) * 95); }
    x.closePath(); x.fillStyle = col + '26'; x.fill(); x.strokeStyle = col; x.lineWidth = 6; x.stroke(); txt(label || 'JS', 0, 4, 58, col, 800, 'center', MONO); return; }
  if (kind === 'film') { rr(-110, -75, 220, 150, 14); x.fillStyle = col + '26'; x.fill(); x.strokeStyle = col; x.lineWidth = 5; x.stroke();
    for (let j = 0; j < 5; j++) { x.fillStyle = col; rr(-95 + j * 42, -65, 22, 16, 4); x.fill(); rr(-95 + j * 42, 49, 22, 16, 4); x.fill(); }
    x.beginPath(); x.moveTo(-22, -30); x.lineTo(34, 0); x.lineTo(-22, 30); x.closePath(); x.fill(); return; }
  rr(-110, -80, 220, 160, 18); x.fillStyle = col + '26'; x.fill(); x.strokeStyle = col; x.lineWidth = 4; x.stroke(); txt(kind, 0, 4, 64, col, 700);
}
const ICOL = [C.coral, C.teal, C.yellow];
// 段落標題：上方膠囊標籤（STEP 1 等）＋大標題；在段落開始前 0.1 秒進場
function header(t, i, h) {
  if (!h) return; const e = enter(t, st(i) - 0.1, 'expo', 0.5), col = COL(h.color || 'coral');
  withA(e, 0, 0, () => {
    if (h.label) { x.font = `800 30px ${F}`; const w = x.measureText(h.label).width + 44;
      rr(W / 2 - w / 2, 92, w, 52, 26); x.fillStyle = col; x.fill(); txt(h.label, W / 2, 119, 30, C.bg, 800); }
    txt(h.title, W / 2, h.label ? 205 : 170, 68, C.ivory, 800);
  });
}
function background(t) {
  x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
  const g1 = x.createRadialGradient(420 + 80 * Math.sin(t * .15), 260, 0, 420, 260, 900);
  g1.addColorStop(0, 'rgba(224,122,82,.13)'); g1.addColorStop(1, 'rgba(224,122,82,0)'); x.fillStyle = g1; x.fillRect(0, 0, W, H);
  const g2 = x.createRadialGradient(1550, 820 + 60 * Math.cos(t * .12), 0, 1550, 820, 900);
  g2.addColorStop(0, 'rgba(79,195,181,.10)'); g2.addColorStop(1, 'rgba(79,195,181,0)'); x.fillStyle = g2; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(255,255,255,.035)'; x.lineWidth = 1;
  for (let gx = 0; gx <= W; gx += 80) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
  for (let gy = 0; gy <= H; gy += 80) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
}

// ---------- 畫面庫 ----------
const STAGE = {
  // 開場：雙行大標題（可部分上色）＋計時圓環＋流程膠囊與箭頭
  hook(t, i, sc) {
    const s = st(i);
    withA(enter(t, s + 0.1, 'back', 0.7), W / 2, 330, () => { sc.title.forEach((ln, j) => rich(ln, 0, -50 + j * 120, 96, 800)); });
    if (sc.ring) { const k1 = KW(i, sc.ring.word, s + 1.5);
      withA(enter(t, k1, 'back'), W / 2, 610, () => {
        x.lineWidth = 14; x.strokeStyle = C.line; x.beginPath(); x.arc(0, 0, 92, 0, 7); x.stroke();
        const sw = ioCubic(prog(t, k1, 1.8)); x.strokeStyle = C.yellow; x.lineCap = 'round';
        x.beginPath(); x.arc(0, 0, 92, -Math.PI / 2, -Math.PI / 2 + sw * Math.PI * 2); x.stroke();
        txt(sc.ring.big, 0, -10, 76, C.yellow, 800, 'center', MONO); txt(sc.ring.small || '', 0, 48, 28, C.dim, 700); }); }
    if (sc.chips) { const k2 = KW(i, sc.chips.word, s + 2.5), n = sc.chips.items.length, gap = Math.min(320, 1280 / n);
      sc.chips.items.forEach((c, j) => { const cx = W / 2 + (j - (n - 1) / 2) * gap;
        withA(enter(t, k2 + j * 0.08, 'expo'), cx, 800, () => { card(gap - 100, 84, C.card, C.line, 42); txt(c, 0, 2, 36, C.ivory, 700); });
        if (j < n - 1) arrow(cx + (gap - 100) / 2 + 10, 800, cx + gap - (gap - 100) / 2 - 10, 800, prog(t, k2 + j * 0.08 + 0.2, 0.3), C.line); }); }
  },
  // 對照：左「一般做法」（魔杖＋模糊圖塊）vs 右「這個做法」（程式逐字打出＋底片逐格點亮）
  compare(t, i, sc) {
    const s = st(i), L = sc.left, R = sc.right;
    const kL = KW(i, L.word, s + 0.5), kL2 = KW(i, L.captionWord, kL + 0.6), kR = KW(i, R.word, s + 2.5), kR2 = KW(i, R.codeWord, kR + 0.5), kF = KW(i, R.filmWord, kR2 + 1.4);
    withA(enter(t, kL, 'back'), 500, 520, () => {
      card(700, 560); txt(L.title, 0, -220, 44, C.dim, 700);
      const sp = prog(t, kL2, 0.6);
      x.save(); x.translate(-150, -60); x.rotate(-0.6); rr(-12, -10, 200, 20, 10); x.fillStyle = C.dim; x.fill(); x.restore();
      for (let j = 0; j < 4; j++) { const a = j * Math.PI / 2 + t; const r = 30 + 10 * Math.sin(t * 3 + j);
        x.save(); x.globalAlpha *= sp; x.translate(-210 + Math.cos(a) * r * .3, -110 + Math.sin(a) * r * .3); txt('✦', 0, 0, 40 + j * 6, C.yellow, 400); x.restore(); }
      withA(enter(t, kL2, 'back'), 110, -10, () => {
        const g = x.createLinearGradient(-150, -100, 150, 100); g.addColorStop(0, '#5b4b8a'); g.addColorStop(1, '#e07a52');
        x.filter = 'blur(3px)'; rr(-150, -100, 300, 200, 18); x.fillStyle = g; x.fill(); x.filter = 'none'; txt('?', 0, 0, 90, 'rgba(255,255,255,.75)', 800); });
      withA(enter(t, kL2 + 0.1), 0, 190, () => txt(L.caption, 0, 0, 46, C.ivory, 800));
    });
    withA(enter(t, kR, 'back'), 1420, 520, () => {
      card(700, 560, C.card, C.coral); txt(R.title, 0, -220, 44, C.coral, 800);
      const lines = R.code, ty = prog(t, kR2, 1.6) * lines.join('').length; let used = 0;
      rr(-300, -165, 290, 230, 16); x.fillStyle = '#0b0f1a'; x.fill();
      lines.forEach((l, j) => { const n = clamp(ty - used, 0, l.length); used += l.length; txt(l.slice(0, n), -284, -125 + j * 50, 24, j === 0 ? C.teal : C.ivory, 400, 'left', MONO); });
      arrow(5, -50, 50, -50, prog(t, kF - 0.3, 0.3), C.coral);
      for (let j = 0; j < 6; j++) { const on = prog(t, kF + j * 0.18, 0.2), fx = 70 + (j % 2) * 112, fy = -165 + Math.floor(j / 2) * 78;
        rr(fx, fy, 100, 66, 8); x.fillStyle = on > 0 ? `rgba(224,122,82,${0.25 + 0.75 * on})` : '#0b0f1a'; x.fill(); x.strokeStyle = C.line; x.lineWidth = 2; x.stroke();
        if (on > 0) { x.save(); x.globalAlpha *= on; x.beginPath(); x.arc(fx + 22 + j * 10, fy + 33, 12, 0, 7); x.fillStyle = C.ivory; x.fill(); x.restore(); } }
      withA(enter(t, kF + 0.1), 0, 190, () => rich(R.caption, 0, 0, 46, 800));
    });
  },
  // 圖示卡：2～4 張，念到名稱時各自彈出
  iconCards(t, i, sc) {
    const n = sc.cards.length, gap = n >= 4 ? 420 : 520;
    sc.cards.forEach((c, j) => withA(enter(t, KW(i, c.word, st(i) + 0.5 + j * 0.6), 'back'), W / 2 + (j - (n - 1) / 2) * gap, 560, () => {
      card(n >= 4 ? 360 : 420, 420); x.save(); x.translate(0, -50); icon(c.icon, ICOL[j % 3], c.iconText); x.restore(); txt(c.name, 0, 130, 46, C.ivory, 800); }));
  },
  // 分鏡格：左「先別做」（紅線劃掉），中間 6 格分鏡錯開彈出，黃筆圈註，最後綠色確認膠囊
  storyboard(t, i, sc) {
    const s = st(i), kNo = KW(i, sc.no.word, s + 0.5), kG = KW(i, sc.gridWord, s + 2), kE = KW(i, sc.editWord, kG + 1.5), kOK = KW(i, sc.ok.word, kE + 1.2);
    withA(enter(t, kNo, 'back'), 330, 560, () => {
      card(300, 300); txt(sc.no.icon || '</>', 0, -10, 90, C.dim, 700, 'center', MONO);
      const k = outExpo(prog(t, kNo + 0.35, 0.4)); x.strokeStyle = C.red; x.lineWidth = 12; x.lineCap = 'round';
      x.beginPath(); x.moveTo(-90, -90); x.lineTo(-90 + 180 * k, -90 + 180 * k); x.stroke(); txt(sc.no.text, 0, 110, 34, C.red, 800); });
    for (let j = 0; j < 6; j++) { const cx = 760 + (j % 3) * 300, cy = 450 + Math.floor(j / 3) * 210;
      withA(enter(t, kG + j * 0.07, 'back'), cx, cy, () => {
        rr(-130, -85, 260, 170, 16); x.fillStyle = C.card; x.fill(); x.strokeStyle = C.line; x.lineWidth = 2; x.stroke();
        txt(String(j + 1), -100, -58, 26, C.coral, 800, 'center', MONO);
        if (sc.frames && sc.frames[j]) txt(sc.frames[j], 0, 8, 30, 'rgba(245,240,230,.8)', 700);
        else { x.strokeStyle = 'rgba(245,240,230,.55)'; x.lineWidth = 4; x.beginPath();
          if (j % 3 === 0) x.arc(0, 0, 36, 0, 7); else if (j % 3 === 1) { x.moveTo(-70, 40); x.lineTo(-20, -20); x.lineTo(20, 20); x.lineTo(70, -40); } else x.rect(-60, -30, 120, 60); x.stroke(); }
        const ed = prog(t, kE + j * 0.06, 0.35);
        if (ed > 0 && j % 2 === 0) { x.strokeStyle = C.yellow; x.lineWidth = 4; x.beginPath(); x.ellipse(40, 30, 50, 28, -0.2, 0, Math.PI * 2 * ed); x.stroke(); } }); }
    withA(enter(t, kOK, 'back'), W / 2 + 120, 835, () => {
      x.font = `800 40px ${F}`; const w = x.measureText(sc.ok.text).width + 160;
      rr(-w / 2, -44, w, 88, 44); x.fillStyle = 'rgba(79,195,181,.15)'; x.fill(); x.strokeStyle = C.teal; x.lineWidth = 3; x.stroke();
      check(-w / 2 + 60, 0, 28, C.teal, prog(t, kOK + 0.15, 0.4)); txt(sc.ok.text, 30, 2, 40, C.teal, 800); });
  },
  // 要點膠囊：3×2 膠囊念到才出現，最後一顆珊瑚色強調；下方重點框＋多色公式
  chips(t, i, sc) {
    const s = st(i);
    sc.items.forEach((it, j) => { const last = j === sc.items.length - 1, cx = W / 2 - 400 + (j % 3) * 400, cy = 360 + Math.floor(j / 3) * 150;
      withA(enter(t, KW(i, it.word, s + 0.5 + j * 0.4), last ? 'back' : 'expo'), cx, cy, () => {
        rr(-170, -55, 340, 110, 55); x.fillStyle = last ? C.coral : C.card; x.fill(); x.strokeStyle = last ? C.coral : C.line; x.lineWidth = 2; x.stroke();
        txt(it.icon || '•', -110, 2, 40, last ? C.bg : C.yellow, 700); txt(it.name, 20, 2, 44, last ? C.bg : C.ivory, 800); }); });
    if (sc.panel) withA(enter(t, KW(i, sc.panel.word, s + 3), 'back', 0.7), W / 2, 760, () => {
      rr(-560, -95, 1120, 190, 30); x.fillStyle = 'rgba(224,122,82,.12)'; x.fill(); x.strokeStyle = C.coral; x.lineWidth = 3; x.stroke();
      txt(sc.panel.title, 0, sc.panel.formula ? -32 : 0, 50, C.ivory, 800);
      if (sc.panel.formula) rich(sc.panel.formula, 0, 42, 46, 700, MONO); });
  },
  // 時間軸：3 個時間點各彈出一張縮圖卡並打勾，最後進度條填滿＋完成按鈕
  timeline(t, i, sc) {
    const s = st(i), L0 = 360, L1 = 1560, Y = 660, kc = KW(i, sc.checkWord, s + 2.5);
    withA(enter(t, s + 0.2), 0, 0, () => { rr(L0, Y - 10, L1 - L0, 20, 10); x.fillStyle = C.line; x.fill();
      txt(sc.startLabel || '0:00', L0, Y + 50, 28, C.dim, 700, 'center', MONO); txt(sc.endLabel || '結尾', L1, Y + 50, 28, C.dim, 700); });
    sc.points.forEach((p, j) => { const k = KW(i, p.word, s + 0.6 + j * 0.5), px = L0 + (L1 - L0) * (j / (sc.points.length - 1));
      withA(enter(t, k, 'back'), px, Y - 170, () => {
        rr(-150, -95, 300, 170, 16); x.fillStyle = C.card; x.fill(); x.strokeStyle = C.yellow; x.lineWidth = 3; x.stroke();
        x.fillStyle = 'rgba(245,240,230,.5)'; rr(-110, -60, 140, 22, 8); x.fill(); rr(-110, -24, 220, 14, 7); x.fill(); rr(-110, 4, 180, 14, 7); x.fill();
        txt(p.name, 0, 52, 30, C.yellow, 800); check(130, -80, 26, C.teal, prog(t, kc + j * 0.1, 0.4)); });
      withA(enter(t, k), px, Y, () => { x.beginPath(); x.arc(0, 0, 18, 0, 7); x.fillStyle = C.yellow; x.fill(); }); });
    if (sc.done) { const kO = KW(i, sc.done.word, s + 4), fill = ioCubic(prog(t, kO, 1.2));
      if (fill > 0) { rr(L0, Y - 10, (L1 - L0) * fill, 20, 10); x.fillStyle = C.teal; x.fill(); }
      withA(enter(t, kO + 0.6, 'back'), W / 2, 830, () => { x.font = `800 40px ${F}`; const w = x.measureText(sc.done.button).width + 120;
        rr(-w / 2, -48, w, 96, 48); x.fillStyle = C.teal; x.fill(); txt(sc.done.button, 0, 2, 40, C.bg, 800); }); }
  },
  // 問題 → 解法：每列左紅框（問題）、箭頭延伸、右青綠框（解法）
  problemFix(t, i, sc) {
    const n = sc.rows.length, y0 = n >= 3 ? 380 : 450;
    sc.rows.forEach((r, j) => { const kp = KW(i, r.pword, st(i) + 0.5 + j * 1.2), kf = KW(i, r.fword, kp + 0.8), y = y0 + j * 170;
      withA(enter(t, kp, 'back'), 560, y, () => { rr(-380, -62, 760, 124, 24); x.fillStyle = 'rgba(229,96,79,.12)'; x.fill(); x.strokeStyle = C.red; x.lineWidth = 2; x.stroke();
        txt(String(j + 1), -320, 2, 44, C.red, 800, 'center', MONO); txt(r.problem, 20, 2, 44, C.ivory, 800); });
      arrow(970, y, 1080, y, prog(t, kf - 0.15, 0.25), C.dim);
      withA(enter(t, kf, 'expo'), 1400, y, () => { rr(-300, -62, 600, 124, 24); x.fillStyle = 'rgba(79,195,181,.12)'; x.fill(); x.strokeStyle = C.teal; x.lineWidth = 2; x.stroke();
        txt(r.fix, 0, 2, 42, C.teal, 800); }); });
  },
  // 收尾：3 個節點串成一條線，珊瑚色大按鈕呼吸脈動，最後一行字
  finale(t, i, sc) {
    const s = st(i), ks = sc.nodes.map((n, j) => KW(i, n.word, s + 0.3 + j * 0.8));
    sc.nodes.forEach((n, j) => { const cx = W / 2 - 560 + j * 560;
      withA(enter(t, ks[j], 'back'), cx, 360, () => { card(400, 260, C.card, j === 1 ? C.coral : C.line);
        txt(n.icon, 0, -45, 70, [C.yellow, C.coral, C.teal][j % 3], 700, 'center', n.icon.length > 1 && /^[\x00-\x7F]+$/.test(n.icon) ? MONO : F); txt(n.name, 0, 70, 44, C.ivory, 800); });
      if (j < sc.nodes.length - 1) arrow(cx + 210, 360, cx + 350, 360, prog(t, ks[j + 1] - 0.25, 0.25), C.dim); });
    if (sc.cta) { const kC = KW(i, sc.cta.word, s + 3);
      withA(enter(t, kC, 'back', 0.7), W / 2, 660, () => { const p = 1 + 0.03 * Math.sin((t - kC) * 6) * prog(t, kC + 0.7, 0.3); x.scale(p, p);
        x.font = `800 56px ${F}`; const w = x.measureText(sc.cta.text).width + 140;
        rr(-w / 2, -70, w, 140, 70); x.fillStyle = C.coral; x.fill(); txt(sc.cta.text, 0, 3, 56, C.bg, 800); }); }
    if (sc.line) withA(enter(t, KW(i, sc.line.word, s + 4)), W / 2, 810, () => txt(sc.line.text, 0, 0, 46, C.ivory, 700));
  },
};

// 字幕：深色膠囊、象牙白字，一次一句
function subtitles(t) {
  for (const s of S) for (const p of s.phrases) {
    if (t < p.a || t >= p.b) continue;
    const a = clamp(Math.min((t - p.a) / 0.12, (p.b - t) / 0.12));
    x.save(); x.globalAlpha = a; x.font = `700 44px ${F}`;
    const w = x.measureText(p.text).width + 72;
    rr(W / 2 - w / 2, 958, w, 78, 39); x.fillStyle = 'rgba(8,10,18,.82)'; x.fill();
    txt(p.text, W / 2, 999, 44, C.ivory, 700); x.restore();
  }
}
// 段落切換：下一段進場時，上一段往上飄 110px＋淡出（0.45 秒）
function draw(t) {
  background(t);
  for (let i = 1; i <= S.length; i++) {
    const a = st(i) - 0.25, b = i < S.length ? st(i + 1) - 0.3 : T.total + 1;
    if (t < a || t > b + 0.6) continue;
    const sc = SB.segments[i - 1].scene, fn = STAGE[sc.type];
    if (!fn) throw new Error(`第 ${i} 段：沒有這種畫面型別「${sc.type}」`);
    const ex = ioCubic(prog(t, b, 0.45));
    x.save(); x.globalAlpha = 1 - ex; x.translate(0, -110 * ex); header(t, i, sc.header); fn(t, i, sc); x.restore();
  }
  const fo = prog(t, T.total - 0.8, 0.8); if (fo > 0) { x.fillStyle = `rgba(13,18,32,${fo})`; x.fillRect(0, 0, W, H); }
  subtitles(t);
}
window.seek = t => draw(t);
window.ready = (async () => {
  SB = await (await fetch('storyboard.json')).json(); T = await (await fetch('timings.json')).json(); S = T.segs;
  window.DURATION = T.total;
  await document.fonts.load(`800 40px ${F}`); await document.fonts.ready; draw(0);
})();
})();
