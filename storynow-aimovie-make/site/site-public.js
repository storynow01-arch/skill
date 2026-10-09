// 網路儀表板的互動（唯讀）：滑過播示範片、顯示片長、篩選、搜尋、← → 換頁
(() => {
  document.querySelectorAll('.card').forEach((c) => {
    const v = c.querySelector('.thumb video'); if (!v) return;
    c.addEventListener('mouseenter', () => { if (!v.src) v.src = v.dataset.src; v.currentTime = 0; v.play().then(() => c.classList.add('playing')).catch(() => {}); });
    c.addEventListener('mouseleave', () => { v.pause(); c.classList.remove('playing'); });
  });
  document.querySelectorAll('[data-dur]').forEach((e) => {          // 片長：讀影片的 metadata（不用預先算）
    const v = document.createElement('video'); v.preload = 'metadata'; v.src = e.dataset.dur;
    v.onloadedmetadata = () => { const t = v.duration; e.textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; };
  });
  const grid = document.querySelector('[data-grid]'); let tag = '', q = '';
  const apply = () => { if (!grid) return; let n = 0;
    grid.querySelectorAll('.card').forEach((c) => { const ok = (!tag || (c.dataset.tags || '').includes(tag)) && (!q || c.textContent.toLowerCase().includes(q)); c.hidden = !ok; n += ok; });
    const em = document.querySelector('[data-empty]'); if (em) em.hidden = n > 0; };
  document.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((x) => x.classList.remove('on')); b.classList.add('on'); tag = b.dataset.filter; apply(); }));
  const sb = document.querySelector('[data-search]'); if (sb) sb.addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); apply(); });
  document.addEventListener('keydown', (e) => { if (e.target.closest('video,input,textarea')) return;
    const k = e.key === 'ArrowLeft' ? 'prev' : e.key === 'ArrowRight' ? 'next' : ''; const a = k && document.querySelector(`[data-key="${k}"]`); if (a) location.href = a.href; });
})();
