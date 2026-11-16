// Índice do Bestiário: filtros (mapa, nível, elemento, raça, chefe), busca por nome e "onde caçar" (mapas ordenados pela contagem de spawn conhecida).
(() => {
  const el = document.getElementById('bz-data');
  if (!el) return;
  const D = JSON.parse(el.textContent), M = D.mons, names = D.maps, world = new Set(D.world);
  const $ = id => document.getElementById(id);
  const grid = $('bz-grid'), tiles = {}; grid.querySelectorAll('.bz-tile').forEach(t => { tiles[t.dataset.id] = t; });
  const hm = location.hash.match(/^#mon-([a-z0-9_]+)$/); if (hm && tiles[hm[1]]) { location.replace(hm[1] + '/index.html'); return; }
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const apply = () => {
    const q = norm($('bz-q').value.trim()), mp = $('bz-map').value, el_ = $('bz-elem').value, rc = $('bz-race').value;
    const lo = parseInt($('bz-lmin').value) || 0, hi = parseInt($('bz-lmax').value) || 999, boss = $('bz-boss').checked;
    let n = 0; const hit = [];
    M.forEach(m => {
      const ok = (!q || norm(m.n).includes(q)) && (!mp || m.mp.some(x => x.i === mp)) && (!el_ || m.e === el_) && (!rc || m.r === rc) &&
        m.l >= lo && m.l <= hi && (!boss || m.b);
      tiles[m.id].hidden = !ok; if (ok) { n++; hit.push(m); }
    });
    $('bz-count').textContent = n + ' de ' + M.length + ' monstros';
    const box = $('bz-where');
    if (q && hit.length) {
      const by = {};
      hit.forEach(m => m.mp.forEach(x => { const o = by[x.i] = by[x.i] || { c: 0, w: 0, known: false, ms: [], ds: [] }; if (x.c || x.w) { o.c += x.c; o.w += x.w; o.known = true; } if (x.d) o.ds.push(m.n + ': ' + x.d); o.ms.push(m); }));
      const rows = Object.entries(by).sort((a, b) => (b[1].w - a[1].w) || (b[1].c - a[1].c) || (b[1].ms.length - a[1].ms.length) || names[a[0]].localeCompare(names[b[0]], 'pt'));
      box.hidden = false; box.innerHTML = '';
      const h = document.createElement('h2'); h.textContent = 'Onde caçar: ' + $('bz-q').value.trim(); box.append(h);
      const p = document.createElement('p'); p.className = 'wk-meta';
      p.textContent = 'Mapas em ordem de densidade (muitos, médios, poucos) segundo o GDD de distribuição. Onde a contagem ainda não existe em dados aparece "densidade a definir".'; box.append(p);
      const ul = document.createElement('ul'); ul.className = 'wk-list';
      rows.forEach(([id, o]) => {
        const li = document.createElement('li');
        const a = document.createElement(world.has(id) ? 'a' : 'b'); a.textContent = names[id];
        if (world.has(id)) a.href = '../mundo/mapa-mundi/index.html#map=' + id;
        li.append(a, document.createTextNode(' · ' + (o.known ? (o.ds.length ? o.ds.join('; ') : o.c + ' pontos de spawn') : 'densidade a definir') + ' · ' + o.ms.map(m => m.n + ' (nv ' + m.l + ')').join(', ')));
        ul.append(li);
      });
      box.append(ul);
    } else box.hidden = true;
  };
  ['bz-q', 'bz-map', 'bz-elem', 'bz-race', 'bz-lmin', 'bz-lmax', 'bz-boss'].forEach(i => $(i).addEventListener('input', apply));
  apply();
})();
