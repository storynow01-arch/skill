// REEL · 影片版本庫：滑過預覽、篩選搜尋、挑選（待挑選的要／不要、收進 skill 標記）、單片頁左右鍵換片
// 挑選結果：用「啟動展示網頁.py」開時存到 挑選紀錄.json（/api/state）；直接開檔時只能暫存在瀏覽器
(() => {
  const META = window.REEL || {};
  const API = location.protocol.startsWith('http') ? '/api/state' : null;
  const LS = 'reel-state';
  let S = { 待挑選: {}, 收進skill: [] };
  let saved = '';

  const clean = s => ({
    待挑選: Object.fromEntries(Object.entries((s && s.待挑選) || {}).filter(([id, v]) => META[id] && META[id].區 === '待挑選' && (v === '要' || v === '不要'))),
    收進skill: ((s && s.收進skill) || []).filter(id => META[id] && META[id].區 !== '待挑選' && !META[id].已收進),
  });
  async function load() {
    if (API) { try { const r = await fetch(API, { cache: 'no-store' }); S = clean(await r.json()); saved = '已自動存檔'; return; } catch (e) { saved = '連不到伺服器，沒有存檔'; } }
    try { S = clean(JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
    if (!API) saved = '直接開檔：只暫存在這個瀏覽器，Claude 讀不到';
  }
  async function save() {
    try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {}
    if (!API) return;
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(S) });
      saved = r.ok ? '已自動存檔 ' + new Date().toLocaleTimeString('zh-TW') : '存檔失敗';
    } catch (e) { saved = '連不到伺服器，沒有存檔'; }
    paintDrawer();
  }

  const el = (tag, txt, cls) => { const e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; };
  const pageOf = id => (document.querySelector('link[href="site.css"]') ? '' : '展示網頁素材/') + '片_' + id + '.html';

  function paintDrawer() {
    const box = document.querySelector('[data-pick-list]'); if (!box) return;
    box.replaceChildren();
    const pend = Object.keys(META).filter(id => META[id].區 === '待挑選');
    const group = (title, ids, note) => {
      const sec = el('section', null, 'dgroup');
      sec.append(el('h4', `${title}（${ids.length}）`));
      if (note) sec.append(el('p', note, 'hint'));
      const ol = el('ol');
      ids.forEach(id => { const li = el('li'); const a = el('a', META[id].名稱); a.href = pageOf(id); li.append(a); if (META[id].去向 && title.startsWith('要')) li.append(el('span', ' → ' + META[id].去向, 'to')); ol.append(li); });
      if (ids.length) sec.append(ol);
      box.append(sec);
    };
    if (pend.length) {
      const yes = pend.filter(id => S.待挑選[id] === '要'), no = pend.filter(id => S.待挑選[id] === '不要');
      group('要', yes); group('不要', no, '會移到資源回收筒');
      group('還沒決定', pend.filter(id => !S.待挑選[id]));
    }
    group('等待收進 skill', S.收進skill, S.收進skill.length ? '跟 Claude 說要收進，Claude 會先說明做法、經你同意才上傳' : null);
    const tip = el('p', '挑完後跟 Claude 說「挑完了」就好，不用複製。', 'hint strong');
    box.append(tip);
    const h = document.querySelector('[data-save-hint]'); if (h) h.textContent = saved;
  }
  function paint() {
    document.querySelectorAll('[data-decide]').forEach(d => {
      const v = S.待挑選[d.dataset.decide];
      d.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
      const card = d.closest('.card'); if (card) { card.dataset.verdict = v || '未決定'; card.querySelector('.verdict').textContent = v || ''; }
    });
    document.querySelectorAll('[data-skill]').forEach(b => b.classList.toggle('on', S.收進skill.includes(b.dataset.skill)));
    const n = Object.keys(S.待挑選).length + S.收進skill.length;
    document.querySelectorAll('[data-pick-count]').forEach(x => x.textContent = n);
    document.querySelectorAll('.picks-btn').forEach(b => b.classList.toggle('has', n > 0));
    const bar = document.querySelector('[data-savebar]'); if (bar) bar.hidden = !!API;
    paintDrawer(); applyFilter();
  }

  document.addEventListener('click', e => {
    const dv = e.target.closest('[data-decide] button');
    if (dv) {
      e.preventDefault(); const id = dv.closest('[data-decide]').dataset.decide;
      if (S.待挑選[id] === dv.dataset.v) delete S.待挑選[id]; else S.待挑選[id] = dv.dataset.v;
      paint(); save(); return;
    }
    const sk = e.target.closest('[data-skill]');
    if (sk) { e.preventDefault(); const id = sk.dataset.skill; S.收進skill = S.收進skill.includes(id) ? S.收進skill.filter(x => x !== id) : [...S.收進skill, id]; paint(); save(); return; }
    const dr = document.querySelector('[data-drawer]');
    if (e.target.closest('[data-open-picks]')) dr.classList.add('open');
    else if (e.target.closest('[data-close-picks]')) dr.classList.remove('open');
  });

  // 滑過縮圖播 6 秒預覽
  document.querySelectorAll('.card').forEach(c => {
    const v = c.querySelector('.thumb video'); if (!v) return;
    c.addEventListener('mouseenter', () => { if (!v.src) v.src = v.dataset.src; v.currentTime = 0; v.play().then(() => c.classList.add('playing')).catch(() => {}); });
    c.addEventListener('mouseleave', () => { v.pause(); c.classList.remove('playing'); });
  });

  // 篩選（做法／系列、要不要）＋搜尋
  const grid = document.querySelector('[data-grid]');
  let tag = '', verdict = '', q = '';
  function applyFilter() {
    if (!grid) return; let n = 0;
    grid.querySelectorAll('.card').forEach(c => {
      const ok = (!tag || c.dataset.tags.includes(tag)) && (!verdict || c.dataset.verdict === verdict) && (!q || c.textContent.toLowerCase().includes(q));
      c.hidden = !ok; n += ok;
    });
    const em = document.querySelector('[data-empty]'); if (em) em.hidden = n > 0 || !grid.querySelector('.card');
  }
  document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(x => x.classList.remove('on')); b.classList.add('on'); tag = b.dataset.filter; applyFilter();
  }));
  document.querySelectorAll('[data-verdict]').forEach(b => b.addEventListener('click', () => {
    const on = !b.classList.contains('on');
    document.querySelectorAll('[data-verdict]').forEach(x => x.classList.remove('on'));
    b.classList.toggle('on', on); verdict = on ? b.dataset.verdict : ''; applyFilter();
  }));
  const sb = document.querySelector('[data-search]');
  if (sb) sb.addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); applyFilter(); });

  // 單片頁：← → 換片
  document.addEventListener('keydown', e => {
    if (e.target.closest('video,input,textarea')) return;
    const k = e.key === 'ArrowLeft' ? 'prev' : e.key === 'ArrowRight' ? 'next' : '';
    const a = k && document.querySelector(`[data-key="${k}"]`);
    if (a) location.href = a.href;
    if (e.key === 'Escape') document.querySelector('[data-drawer]')?.classList.remove('open');
  });

  load().then(paint);
})();
