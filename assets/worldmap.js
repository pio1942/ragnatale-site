// Mapa-múndi interativo da wiki: zoom (roda, pinça, botões), arrastar, dica ao passar, painel de detalhe ao clicar, lista com destaque cruzado.
(() => {
  const host = document.getElementById('wmap');
  if (!host) return;
  const svg = host.querySelector('#wm-svg'), frame = host.querySelector('.wm-frame'), scroller = host.querySelector('.wm-scroll');
  const tip = host.querySelector('.wm-tip'), detail = host.querySelector('.wm-detail');
  if (!svg) return;
  const PL = JSON.parse(host.querySelector('#wm-data').textContent);
  const BASE = [0, 0, 1200, 1260];
  let vb = BASE.slice();
  const setVB = () => svg.setAttribute('viewBox', vb.join(' '));
  const clamp = () => { vb[0] = Math.min(Math.max(0, vb[0]), BASE[2] - vb[2]); vb[1] = Math.min(Math.max(0, vb[1]), BASE[3] - vb[3]); };
  const zoomAt = (f, fx, fy) => {
    const w = Math.min(BASE[2], Math.max(150, vb[2] / f)), h = w * BASE[3] / BASE[2];
    vb = [vb[0] + (fx ?? .5) * (vb[2] - w), vb[1] + (fy ?? .5) * (vb[3] - h), w, h]; clamp(); setVB();
  };
  host.querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.z === 'reset') { vb = BASE.slice(); setVB(); } else zoomAt(b.dataset.z === 'in' ? 1.5 : 1 / 1.5);
  }));
  svg.addEventListener('wheel', ev => {
    ev.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(ev.deltaY < 0 ? 1.25 : 0.8, (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height);
  }, { passive: false });
  // arrastar (mouse e toque) e pinça
  const ptrs = new Map(); let drag = null, moved = false, pinch = null;
  svg.addEventListener('pointerdown', ev => {
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; drag = null; return; }
    drag = { x: ev.clientX, y: ev.clientY, vb: vb.slice() }; moved = false;
  });
  window.addEventListener('pointermove', ev => {
    if (!ptrs.has(ev.pointerId)) return;
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = svg.getBoundingClientRect();
      if (pinch.d > 0 && Math.abs(d - pinch.d) > 6) { zoomAt(d / pinch.d, ((a.x + b.x) / 2 - r.left) / r.width, ((a.y + b.y) / 2 - r.top) / r.height); pinch.d = d; moved = true; }
      return;
    }
    if (!drag) return;
    const r = svg.getBoundingClientRect();
    const dx = (ev.clientX - drag.x) * vb[2] / r.width, dy = (ev.clientY - drag.y) * vb[3] / r.height;
    if (Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 5) moved = true;
    if (!moved) return;
    scroller.classList.add('wm-drag'); tip.hidden = true;
    vb[0] = drag.vb[0] - dx; vb[1] = drag.vb[1] - dy; clamp(); setVB();
  });
  const up = ev => { ptrs.delete(ev.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { drag = null; scroller.classList.remove('wm-drag'); } };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  // dica
  const KIND = { capital: 'capital de tribo', cidade: 'cidade', vila: 'vila', campo: 'campo', campo_risco: 'campo de risco', calabouco_mar: 'calabouço no mar' };
  const show = (el, ev) => {
    const d = el.dataset;
    tip.innerHTML = '<b></b><span></span>';
    tip.firstChild.textContent = d.name;
    tip.lastChild.textContent = 'nível ' + d.lv + ' · ' + d.coord + ' · ' + (KIND[d.kind] || d.kind);
    tip.hidden = false;
    const fr = frame.getBoundingClientRect();
    let x = ev.clientX - fr.left + 14, y = ev.clientY - fr.top + 14;
    if (x + 270 > fr.width) x = ev.clientX - fr.left - 270;
    tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
  };
  svg.addEventListener('pointermove', ev => { if (ev.pointerType !== 'mouse') return; const el = ev.target.closest('[data-map]'); if (el && !drag) show(el, ev); else tip.hidden = true; });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  // seleção
  let selEl = null;
  const select = (id, fly) => {
    const p = PL[id]; if (!p) return;
    svg.querySelectorAll('.wm-sel').forEach(e => e.classList.remove('wm-sel'));
    selEl = svg.querySelector('[data-map="' + id + '"]'); if (selEl) selEl.classList.add('wm-sel');
    detail.innerHTML = '';
    const h = document.createElement('h3'); h.textContent = p.nome;
    const m = document.createElement('p'); m.className = 'meta'; m.textContent = (KIND[p.tipo] || p.tipo) + ' · nível ' + p.niveis + ' · célula ' + p.coord + ' · linha ' + p.linha;
    detail.append(h, m);
    if (p.nota) { const n = document.createElement('p'); n.textContent = p.nota; detail.append(n); }
    if (p.ficha) { const a = document.createElement('a'); a.className = 'btn'; a.href = '#' + p.ficha; a.textContent = 'Abrir a ficha desta zona'; detail.append(a); }
    if (fly && selEl) {
      const bb = selEl.getBBox(), w = Math.max(320, Math.min(520, bb.width * 2.2)), h2 = w * BASE[3] / BASE[2];
      vb = [bb.x + bb.width / 2 - w / 2, bb.y + bb.height / 2 - h2 / 2, w, h2]; clamp(); setVB();
    }
  };
  svg.addEventListener('click', ev => { if (moved) { moved = false; return; } const el = ev.target.closest('[data-map]'); if (el) select(el.dataset.map, false); });
  svg.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { const el = ev.target.closest('[data-map]'); if (el) { ev.preventDefault(); select(el.dataset.map, false); } } });
  host.querySelectorAll('.wm-index a').forEach(a => {
    const on = v => () => { const t = svg.querySelector('[data-map="' + a.dataset.map + '"]'); if (t) t.classList.toggle('wm-hl', v); a.classList.toggle('wm-hl', v); };
    a.addEventListener('pointerenter', on(true)); a.addEventListener('pointerleave', on(false));
    a.addEventListener('click', ev => { ev.preventDefault(); select(a.dataset.map, true); frame.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  });
  // abrir já com um local selecionado: #map=<id>
  const fromHash = () => { const m = location.hash.match(/map=([a-z0-9_]+)/); if (m && PL[m[1]]) select(m[1], true); };
  window.addEventListener('hashchange', fromHash); fromHash();
})();
