// 系列教學模式：狀態（待確認／要修改／確定使用／已上架）、YouTube 網址、修改備註、上架清單；分區頁依狀態即時篩選
// 存檔：用「啟動展示網頁.bat」開時存到 <科目>/展示紀錄.json（/api/state?s=<科目>）；直接開檔時只暫存在瀏覽器
(() => {
  const C = window.SERIES || {subject: '', items: {}, checks: [], total: 0};
  const IDS = Object.keys(C.items);
  const API = location.protocol.startsWith('http') ? '/api/state?s=' + encodeURIComponent(C.subject) : null;
  const LS = 'series-state-' + C.subject;
  let S = {狀態: {}, YouTube: {}, 修改備註: {}, 上架清單: {}};
  let timer = null;

  const st = id => S.狀態[id] || '待確認';
  const norm = s => ({狀態: (s && s.狀態) || {}, YouTube: (s && s.YouTube) || {}, 修改備註: (s && s.修改備註) || {}, 上架清單: (s && s.上架清單) || {}});
  async function load() {
    if (API) { try { const r = await fetch(API, {cache: 'no-store'}); S = norm(await r.json()); return; } catch (e) {} }
    try { S = norm(JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
  }
  function save(now) {
    try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {}
    if (!API) return;
    clearTimeout(timer);
    timer = setTimeout(() => fetch(API, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(S)}).catch(() => {}), now ? 0 : 500);
  }

  function paint() {
    const cnt = {待確認: 0, 要修改: 0, 確定使用: 0, 已上架: 0, 全部節次: C.total};
    IDS.forEach(id => cnt[st(id)]++);
    document.querySelectorAll('[data-count]').forEach(e => e.textContent = cnt[e.dataset.count] ?? 0);
    document.querySelectorAll('[data-status]').forEach(d => {
      const v = st(d.dataset.status);
      d.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    });
    document.querySelectorAll('.card').forEach(c => {
      const id = c.dataset.id, v = st(id), b = c.querySelector('[data-st-badge]');
      c.dataset.st = v; if (b) b.textContent = v === '待確認' ? '' : v;
      const y = c.querySelector('[data-yt]'); if (y) { y.hidden = !S.YouTube[id]; y.dataset.url = S.YouTube[id] || ''; }
    });
    document.querySelectorAll('[data-stcell]').forEach(e => { e.textContent = st(e.dataset.stcell); e.className = 'stcell s-' + st(e.dataset.stcell); });   // 進度表的狀態格（不能用 data-st：卡片也有）
    document.querySelectorAll('[data-st-text]').forEach(e => e.textContent = st(e.dataset.stText));
    document.querySelectorAll('[data-fixbox]').forEach(e => e.hidden = st(e.dataset.fixbox) !== '要修改');
    document.querySelectorAll('[data-note]').forEach(e => { if (document.activeElement !== e) e.value = S.修改備註[e.dataset.note] || ''; });
    document.querySelectorAll('[data-ytin]').forEach(e => {
      if (document.activeElement !== e) e.value = S.YouTube[e.dataset.ytin] || '';
      const a = e.parentElement.querySelector('[data-yt]'); if (a) { a.hidden = !S.YouTube[e.dataset.ytin]; a.href = S.YouTube[e.dataset.ytin] || '#'; }
    });
    document.querySelectorAll('[data-check]').forEach(e => e.checked = !!(S.上架清單[e.dataset.check] || [])[+e.dataset.i]);
    document.querySelectorAll('[data-pick-count]').forEach(x => x.textContent = cnt.要修改 + cnt.確定使用 + cnt.已上架);
    document.querySelectorAll('.picks-btn').forEach(b => b.classList.toggle('has', cnt.要修改 > 0));
    if (document.querySelector('[data-drawer].open')) paintDrawer();
    const p = document.querySelector('[data-progress-yt]'); if (p) p.style.width = (cnt.已上架 / Math.max(1, C.total) * 100) + '%';
    const bar = document.querySelector('[data-savebar]'); if (bar) bar.hidden = !!API;
    applyFilter();
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-status] button');
    if (b) {
      e.preventDefault(); const id = b.closest('[data-status]').dataset.status;
      if (st(id) === b.dataset.v) delete S.狀態[id]; else S.狀態[id] = b.dataset.v;      // 再按一次＝回到待確認
      paint(); save(true);
      if (S.狀態[id] === '已上架' && !S.YouTube[id]) { const u = prompt('貼上這一節的 YouTube 網址（可以之後再貼）：'); if (u && u.trim().startsWith('http')) { S.YouTube[id] = u.trim(); paint(); save(true); } }
      return;
    }
    const y = e.target.closest('.thumb [data-yt]');
    if (y && y.dataset.url) { e.preventDefault(); window.open(y.dataset.url, '_blank'); }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.note) { S.修改備註[t.dataset.note] = t.value; save(); }
    if (t.dataset.ytin) { const v = t.value.trim(); if (v) S.YouTube[t.dataset.ytin] = v; else delete S.YouTube[t.dataset.ytin]; save(); paint(); }
    if (t.dataset.check) { const a = S.上架清單[t.dataset.check] = S.上架清單[t.dataset.check] || []; a[+t.dataset.i] = t.checked; save(true); }
  });

  // 滑過縮圖播 6 秒預覽
  document.querySelectorAll('.card').forEach(c => {
    const v = c.querySelector('.thumb video'); if (!v) return;
    c.addEventListener('mouseenter', () => { if (!v.src) v.src = v.dataset.src; v.currentTime = 0; v.play().then(() => c.classList.add('playing')).catch(() => {}); });
    c.addEventListener('mouseleave', () => { v.pause(); c.classList.remove('playing'); });
  });

  // 進度抽屜（同 REEL 的「挑選進度」）：要修改（附備註）／確定使用／已上架（附網址）／待確認
  const el = (tag, txt, cls) => { const e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; };
  const pageOf = id => (document.querySelector('link[href="site.css"]') ? '' : '展示網頁素材/') + (C.items[id].頁 || '');
  function paintDrawer() {
    const box = document.querySelector('[data-pick-list]'); if (!box) return;
    box.replaceChildren();
    const group = (title, ids, note, extra) => {
      const sec = el('section', null, 'dgroup'); sec.append(el('h4', `${title}（${ids.length}）`));
      if (note && ids.length) sec.append(el('p', note, 'hint'));
      const ol = el('ol');
      ids.forEach(id => { const li = el('li'); const a = el('a', `${C.items[id].節次} ${C.items[id].主題}`); a.href = pageOf(id); li.append(a); const x = extra && extra(id); if (x) li.append(el('div', x, 'to')); ol.append(li); });
      if (ids.length) sec.append(ol); box.append(sec);
    };
    group('要修改', IDS.filter(id => st(id) === '要修改'), '跟 Claude 說「看完了」，Claude 會照備註去改', id => S.修改備註[id] ? '備註：' + S.修改備註[id] : '（還沒寫哪裡要改）');
    group('確定使用', IDS.filter(id => st(id) === '確定使用'), '上傳時照單支頁的上架清單一項一項勾');
    group('已上架', IDS.filter(id => st(id) === '已上架'), null, id => S.YouTube[id] || '（還沒貼網址）');
    group('待確認', IDS.filter(id => st(id) === '待確認'));
    const h = document.querySelector('[data-save-hint]'); if (h) h.textContent = API ? '按鈕會自動存到 展示紀錄.json' : '直接開檔：只暫存在這個瀏覽器';
  }
  document.addEventListener('click', e => {
    const dr = document.querySelector('[data-drawer]'); if (!dr) return;
    if (e.target.closest('[data-open-picks]')) { paintDrawer(); dr.classList.add('open'); }
    else if (e.target.closest('[data-close-picks]')) dr.classList.remove('open');
  });

  // 分區頁：只顯示這個狀態的影片；章節／類型篩選；搜尋
  const grid = document.querySelector('[data-grid]');
  let q = '', tag = '';
  document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(x => x.classList.remove('on')); b.classList.add('on'); tag = b.dataset.filter; applyFilter();
  }));
  function applyFilter() {
    if (!grid) return; let n = 0; const sec = grid.dataset.section;
    grid.querySelectorAll('.card').forEach(c => { const ok = (!sec || c.dataset.st === sec) && (!tag || (c.dataset.tags || '').includes(tag)) && (!q || c.textContent.toLowerCase().includes(q)); c.hidden = !ok; n += ok; });
    const em = document.querySelector('[data-empty]'); if (em) em.hidden = n > 0;
  }
  const sb = document.querySelector('[data-search]');
  if (sb) sb.addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); applyFilter(); });

  // 單支頁：← → 換節
  document.addEventListener('keydown', e => {
    if (e.target.closest('video,input,textarea')) return;
    const k = e.key === 'ArrowLeft' ? 'prev' : e.key === 'ArrowRight' ? 'next' : '';
    const a = k && document.querySelector(`[data-key="${k}"]`); if (a) location.href = a.href;
    if (e.key === 'Escape') document.querySelector('[data-drawer]')?.classList.remove('open');
  });

  load().then(paint);
})();
