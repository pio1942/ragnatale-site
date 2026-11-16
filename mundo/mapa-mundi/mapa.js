/* Mapa-múndi interativo de Ermândia. Sem bibliotecas. Dados em #mm-data (gerados por tools/world/mapa_mundi/build.py).
   Links diretos: #map=<id> (ou #local=<id>) · #camadas=tribos,rota,sinos · #nivel=45 · #tribo=Ironroot · #ver=x,y,largura · #analise */
(() => {
  'use strict';
  const D = JSON.parse(document.getElementById('mm-data').textContent);
  const P = D.places, M = D.mons, AN = D.an;
  const root = document.getElementById('mm'), stage = document.getElementById('mm-stage'), svg = stage.querySelector('svg');
  const tip = document.getElementById('mm-tip'), detail = document.getElementById('mm-detail');
  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, at, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const H = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KIND = { capital: 'Capital de tribo', cidade: 'Cidade', vila: 'Vila', campo: 'Campo', campo_risco: 'Campo de risco', calabouco_mar: 'Calabouço no mar', raide: 'Raide final' };
  const EL = { flame: ['Brasa', '#d2552b'], tide: ['Maré', '#2f7fb5'], gale: ['Vendaval', '#5fae8c'], stone: ['Rocha', '#8b7a5c'], sap: ['Seiva', '#4e9a5f'],
    crystal: ['Cristal', '#3fa9d6'], dawn: ['Aurora', '#d9a521'], dusk: ['Crepúsculo', '#6a4c93'], neutral: ['Neutro', '#8d8d8d'] };
  const ST = { pronto: 'Pronto', producao: 'Em produção', nao: 'Não iniciado' };
  const isField = p => p.k === 'campo' || p.k === 'campo_risco' || p.k === 'calabouco_mar';
  const heat = lv => { const t = Math.min(1, lv / 140); const h = t < .5 ? 125 - t * 2 * 110 : (15 - (t - .5) * 2 * 95 + 360) % 360; return `hsl(${h.toFixed(0)} 62% ${t > .75 ? 42 : 46}%)`; };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ camadas */
  const LAYERS = [
    ['História', [
      ['tribos', 'Tribos e territórios', 0, '<i class="sw sw-tribos"></i>'],
      ['rota', 'Rota do herói', 0, '<i class="sw sw-rota"></i>'],
      ['cristais', 'Cristais', 1, '<i class="sw sw-cristal"></i>'],
      ['sinos', 'Sinos e o domo', 0, '<i class="sw sw-sino"></i>']]],
    ['Jogo', [
      ['cidades', 'Cidades e vilas', 1, '<i class="sw sw-cidade"></i>'],
      ['campos', 'Campos', 1, '<i class="sw sw-campo"></i>'],
      ['niveis', 'Faixa de nível', 0, '<i class="sw sw-niveis"></i>'],
      ['calaboucos', 'Calabouços', 0, '<i class="sw sw-dg"></i>'],
      ['portais', 'Portais', 1, '<i class="sw sw-portal"></i>'],
      ['barcos', 'Rotas de barco', 1, '<i class="sw sw-barco"></i>'],
      ['monstros', 'Monstros', 0, '<i class="sw sw-mon">7</i>'],
      ['lacunas', 'Lacunas', 0, '<i class="sw sw-gap"></i>']]],
    ['Carta', [
      ['relevo', 'Relevo e cotas', 1, '<i class="sw sw-relevo"></i>'],
      ['grade', 'Grade A–J × 1–10', 1, '<i class="sw sw-grade"></i>'],
      ['rotulos', 'Rótulos', 1, '<i class="sw sw-rot">Aa</i>'],
      ['legenda', 'Legenda e cartucho', 1, '<i class="sw sw-leg"></i>']]]];
  const on = {};
  const setLayer = (k, v) => {
    on[k] = !!v; svg.classList.toggle('off-' + k, !v); root.classList.toggle('on-' + k, !!v);
    const cb = document.querySelector(`#mm-layers input[data-k="${k}"]`); if (cb) cb.checked = !!v;
  };
  const layersEl = document.getElementById('mm-layers');
  LAYERS.forEach(([g, items]) => {
    const box = H('fieldset', 'mm-lg', `<legend>${g}</legend>`);
    items.forEach(([k, label, def, sw]) => {
      const l = H('label', 'mm-l', `<input type="checkbox" data-k="${k}">${sw}<span>${label}</span>`);
      l.firstChild.addEventListener('change', e => setLayer(k, e.target.checked));
      box.appendChild(l); on[k] = !!def;
    });
    layersEl.appendChild(box);
  });
  const tribeBox = H('div', 'mm-tribes');
  Object.entries(D.tribos).forEach(([n, t]) => {
    const b = H('button', 'mm-tribe', `<i style="background:${t.cor}"></i><b>${n}</b><small>${esc(t.sig)}</small>`);
    b.type = 'button'; b.addEventListener('click', () => openTribe(n)); tribeBox.appendChild(b);
  });
  layersEl.appendChild(tribeBox);
  layersEl.appendChild(H('p', 'mm-hint', 'Clique num local para abrir a ficha. Roda do mouse ou pinça dão zoom; arrastar move o mapa.'));

  /* ------------------------------------------------------------------ sobreposições */
  const before = (id, g) => { const ref = svg.querySelector('#' + id); ref.parentNode.insertBefore(g, ref); return g; };
  const after = (id, g) => { const ref = svg.querySelector('#' + id); ref.parentNode.insertBefore(g, ref.nextSibling); return g; };
  const defs = svg.querySelector('defs');
  defs.insertAdjacentHTML('beforeend',
    '<radialGradient id="mm-dome" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0"/><stop offset=".72" stop-color="#ffd978" stop-opacity=".02"/><stop offset=".96" stop-color="#ffcf5a" stop-opacity=".28"/><stop offset="1" stop-color="#fff3c4" stop-opacity=".0"/></radialGradient>' +
    '<radialGradient id="mm-tglow"><stop offset="0" stop-color="#b98cff" stop-opacity=".85"/><stop offset="1" stop-color="#6a4c93" stop-opacity="0"/></radialGradient>' +
    '<filter id="mm-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>');
  const clipD = id => { const p = svg.querySelector(`#wm-clip-${id} path`); return p ? p.getAttribute('d') : ''; };

  // tribos e territórios
  const gTr = after('relief', S('g', { id: 'ov-tribos', 'pointer-events': 'none' }));
  D.terr.forEach(t => {
    const d = clipD(t.id); if (!d) return;
    const names = Object.keys(D.tribos).filter(n => t.tr.includes(n));
    if (names.length === 1) S('path', { d, fill: D.tribos[names[0]].cor, 'fill-opacity': .34, stroke: D.tribos[names[0]].cor, 'stroke-width': 2.2, 'stroke-opacity': .9 }, gTr);
    else if (names.length === 2) {
      const id = 'mm-st-' + t.id;
      defs.insertAdjacentHTML('beforeend', `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="10" fill="${D.tribos[names[0]].cor}"/><rect x="5" width="5" height="10" fill="${D.tribos[names[1]].cor}"/></pattern>`);
      S('path', { d, fill: `url(#${id})`, 'fill-opacity': .34, stroke: '#5A4A3A', 'stroke-width': 1.2, 'stroke-dasharray': '5 3' }, gTr);
    } else S('path', { d, fill: '#2F2A26', 'fill-opacity': .05, stroke: '#2F2A26', 'stroke-width': .8, 'stroke-opacity': .35, 'stroke-dasharray': '2 4' }, gTr);
  });
  const gTrL = before('frame', S('g', { id: 'ov-tribos-l', 'pointer-events': 'none' }));
  Object.entries(D.tribos).forEach(([n, t]) => {
    const cap = Object.values(P).find(p => p.k === 'capital' && p.n === t.cidade); if (!cap) return;
    const g = S('g', { transform: `translate(${cap.x},${cap.y + 31})` }, gTrL);
    const w = n.length * 7.4 + 26;
    S('rect', { x: -w / 2, y: -9, width: w, height: 16, rx: 8, fill: t.cor, stroke: '#FBF8F0', 'stroke-width': 1.2 }, g);
    S('path', { d: 'M0,-4 L3,0 L0,4 L-3,0Z', fill: '#FBF8F0', transform: `translate(${-w / 2 + 10},-1)` }, g);
    S('text', { x: 6, y: 2.8, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 'bold', 'letter-spacing': 1.6, fill: '#FBF8F0' }, g).textContent = n.toUpperCase();
  });

  // faixa de nível (calor) sobre as áreas dos campos
  const gNv = before('regions', S('g', { id: 'ov-niveis', 'pointer-events': 'none' }));
  svg.querySelectorAll('.wm-r').forEach(r => {
    const p = r.querySelector('path'), pl = P[r.dataset.map]; if (!p || !pl) return;
    const at = { d: p.getAttribute('d'), fill: heat(pl.lv[0]), 'fill-opacity': .62, stroke: heat(pl.lv[0]), 'stroke-width': 1.6 };
    if (p.getAttribute('clip-path')) at['clip-path'] = p.getAttribute('clip-path');
    S('path', at, gNv);
  });

  // cristais (posição por semente fixa; mais densos e sinistros ao norte)
  const gCr = before('places', S('g', { id: 'ov-cristais', 'pointer-events': 'none' }));
  const crG = [0, 1, 2, 3, 4, 5].map(k => S('g', { class: 'cr cr' + k }, gCr));
  const mix = t => { const a = [86, 200, 232], b = [150, 84, 214]; return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')'; };
  D.crystals.forEach(([x, y, s, t, k]) => {
    const g = S('g', { transform: `translate(${x},${y}) scale(${(s * 1.4).toFixed(2)})`, opacity: (.5 + .5 * t).toFixed(2) }, crG[k]);
    S('path', { d: 'M0,-5.4 L2,-1 L1.1,3.4 L-1.1,3.4 L-2,-1Z', fill: mix(t), stroke: t > .6 ? '#3b1f66' : '#1f5d78', 'stroke-width': .5 }, g);
    S('path', { d: 'M0,-5.4 L0,3.4', stroke: '#fff', 'stroke-width': .45, opacity: .7 }, g);
  });
  S('circle', { cx: D.torre.x, cy: D.torre.y - 12, r: 34, fill: 'url(#mm-tglow)', class: 'mm-tglow' }, gCr);

  // domo e sinos
  const gDm = before('frame', S('g', { id: 'ov-sinos' }));
  const DC = [600, 592, 560, 548];
  const dome = S('ellipse', { cx: DC[0], cy: DC[1], rx: DC[2], ry: DC[3], fill: 'url(#mm-dome)', 'pointer-events': 'none', class: 'mm-domefill' }, gDm);
  const arc = sw => `M${DC[0]},${DC[1] + DC[3]} A${DC[2]},${DC[3]} 0 0 ${sw} ${DC[0]},${DC[1] - DC[3]}`;
  [0, 1].forEach(sw => S('path', { d: arc(sw), fill: 'none', stroke: '#8a6a2a', 'stroke-width': 1.2, 'stroke-dasharray': '2 6', opacity: .55, 'pointer-events': 'none' }, gDm));
  const domeArcs = [0, 1].map(sw => S('path', { d: arc(sw), pathLength: 100, fill: 'none', stroke: '#f4c95d', 'stroke-width': 3.2, 'stroke-linecap': 'round', filter: 'url(#mm-glow)', 'stroke-dasharray': '0 100', 'pointer-events': 'none', class: 'mm-domearc' }, gDm));
  const bells = [];
  Object.entries(P).filter(([, p]) => p.pt).sort((a, b) => a[1].lv[0] - b[1].lv[0]).forEach(([id, p]) => {
    const g = S('g', { class: 'mm-bell', transform: `translate(${p.x + 14.5},${p.y - 15.5}) scale(1.25)`, 'data-go': id, 'data-tip': 'Sino-portal: afinado quando o herói chega ao nível ' + p.lv[0] }, gDm);
    S('circle', { r: 8, class: 'ring' }, g);
    S('circle', { r: 6.6, class: 'bg' }, g);
    S('path', { class: 'b', d: 'M0,-4.6 C2.6,-4.6 3.2,-1.6 3.3,.8 L4.4,2.6 H-4.4 L-3.3,.8 C-3.2,-1.6 -2.6,-4.6 0,-4.6Z M-1.1,3.3 A1.1,1.1 0 0 0 1.1,3.3Z' }, g);
    bells.push([p.lv[0], g, id]);
  });

  // rota do herói
  const gRt = before('frame', S('g', { id: 'ov-rota', 'pointer-events': 'none' }));
  const pos = id => id === 'crystal_tower' ? D.torre : P[id];
  const smooth = pts => {
    if (pts.length < 2) return '';
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, k = .18;
      d += ` C${(p1.x + (p2.x - p0.x) * k).toFixed(1)},${(p1.y + (p2.y - p0.y) * k).toFixed(1)} ${(p2.x - (p3.x - p1.x) * k).toFixed(1)},${(p2.y - (p3.y - p1.y) * k).toFixed(1)} ${p2.x},${p2.y}`;
    }
    return d;
  };
  let tribe = 'Vowborn', level = 1;
  const routeIds = () => D.rota.inicios[tribe].concat(D.rota.tronco.slice(1));
  const rGhostO = S('g', {}, gRt), rGhost = S('path', { class: 'rt-ghost' }, gRt), rDone = S('path', { class: 'rt-done', filter: 'url(#mm-glow)' }, gRt), rDots = S('g', {}, gRt);
  const hero = S('g', { class: 'rt-hero' }, gRt);
  S('circle', { r: 11, class: 'halo' }, hero); S('path', { d: 'M0,-8 L6,0 L0,8 L-6,0Z', class: 'h' }, hero); S('path', { d: 'M0,-3.6 L2.7,0 L0,3.6 L-2.7,0Z', fill: '#fff8e0' }, hero);
  const drawRoute = () => {
    const ids = routeIds(), pts = ids.map(pos);
    rGhostO.innerHTML = '';
    Object.keys(D.rota.inicios).filter(n => n !== tribe).forEach(n => S('path', { class: 'rt-other', d: smooth(D.rota.inicios[n].map(pos)) }, rGhostO));
    rGhost.setAttribute('d', smooth(pts));
    let idx = 0;
    for (let i = 1; i < ids.length; i++) { const lv = ids[i] === 'crystal_tower' ? 150 : P[ids[i]].lv[0]; if (lv > level) break; idx = i; }
    rDone.setAttribute('d', idx ? smooth(pts.slice(0, idx + 1)) : '');
    rDots.innerHTML = '';
    pts.forEach((p, i) => S('circle', { cx: p.x, cy: p.y, r: i <= idx ? 2.6 : 2, class: i <= idx ? 'rt-dot on' : 'rt-dot' }, rDots));
    hero.setAttribute('transform', `translate(${pts[idx].x},${pts[idx].y})`);
    return ids[idx];
  };

  // raide final: a Torre de Cristal é a porta
  const gRd = before('frame', S('g', { id: 'ov-raide' }));
  { const t = D.torre, g = S('g', { class: 'mm-raid', transform: `translate(${t.x},${t.y - 12})`, 'data-go': 'crystal_tower', 'data-tip': 'Raide final: O Sonhador Corrompido (nível 150)', tabindex: 0, role: 'link', 'aria-label': 'Torre de Cristal, raide final' }, gRd);
    S('circle', { r: 19, class: 'halo' }, g); S('circle', { r: 15, fill: 'transparent' }, g);
    S('path', { d: 'M-9,-21 L-10.5,-28 L-5.5,-24.5 L0,-30 L5.5,-24.5 L10.5,-28 L9,-21Z', class: 'crown' }, g); }

  // calabouços, monstros e lacunas
  const gDg = before('frame', S('g', { id: 'ov-calaboucos' }));
  const gMo = before('frame', S('g', { id: 'ov-monstros' }));
  const gGap = before('places', S('g', { id: 'ov-lacunas', 'pointer-events': 'none' }));
  const warn = {}; AN.fora.forEach(f => { warn[f.id] = f.p; });
  Object.entries(P).forEach(([id, p]) => {
    if (p.dg) {
      const g = S('g', { class: 'mm-dg', transform: `translate(${p.x - 14},${p.y + 13})`, 'data-go': id, 'data-tip': `Calabouço: ${p.dgn}` }, gDg);
      S('path', { d: 'M-5.5,5 V-1.5 A5.5,5.5 0 0 1 5.5,-1.5 V5Z', class: 'a' }, g); S('path', { d: 'M-2.4,5 V0 A2.4,2.4 0 0 1 2.4,0 V5Z', class: 'd' }, g);
    }
    if (p.mons.length) {
      const cnt = {}; p.mons.forEach(k => { cnt[M[k].e] = (cnt[M[k].e] || 0) + 1; });
      const dom = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0], nb = p.mons.filter(k => M[k].b).length;
      const g = S('g', { class: 'mm-mon', transform: `translate(${p.x + 14},${p.y + 13})`, 'data-go': id, 'data-tip': `${p.mons.length} monstros${nb ? ' · ' + nb + (nb > 1 ? ' chefes' : ' chefe') : ''} · ${EL[dom][0]} domina` }, gMo);
      S('circle', { r: 7.6, fill: '#221d2b', stroke: EL[dom][1], 'stroke-width': 2.2 }, g);
      S('text', { y: 2.9, 'text-anchor': 'middle', 'font-size': 8.2, 'font-weight': 'bold', fill: '#fff', 'font-family': 'system-ui,sans-serif' }, g).textContent = p.mons.length;
      if (nb) S('path', { d: 'M-4.6,-7.4 L-5.6,-12 L-2.6,-9.6 L0,-13 L2.6,-9.6 L5.6,-12 L4.6,-7.4Z', fill: '#f4c95d', stroke: '#5a3d0a', 'stroke-width': .6 }, g);
    }
    if (isField(p) && !p.mons.length) { S('circle', { cx: p.x, cy: p.y, r: 21, class: 'gap red' }, gGap); S('text', { x: p.x, y: p.y - 24, class: 'gap-t' }, gGap).textContent = 'sem monstros'; }
    else if (warn[id]) S('circle', { cx: p.x, cy: p.y, r: 18, class: 'gap amber' }, gGap);
  });

  /* ------------------------------------------------------------------ navegação (viewBox) */
  const BASE = { x: 0, y: 0, w: 1200, h: 1260 };
  let vb = { x: 0, y: 0, w: 1200, h: 1260 }, fitW = 1200, anim = 0;
  const size = () => { const r = stage.getBoundingClientRect(); return { w: Math.max(50, r.width), h: Math.max(50, r.height), l: r.left, t: r.top }; };
  const apply = () => { svg.setAttribute('viewBox', `${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`); root.classList.toggle('z-near', vb.w < 520); };
  const clamp = v => {
    const s = size(), ar = s.w / s.h;
    v.w = Math.max(110, Math.min(fitW, v.w)); v.h = v.w / ar;
    if (v.w >= fitW - .5) { v.x = BASE.w / 2 - v.w / 2; v.y = BASE.h / 2 - v.h / 2; }
    else { v.x = Math.max(BASE.x - v.w * .45, Math.min(BASE.x + BASE.w - v.w * .55, v.x)); v.y = Math.max(BASE.y - v.h * .45, Math.min(BASE.y + BASE.h - v.h * .55, v.y)); }
    return v;
  };
  const fit = () => { const s = size(), ar = s.w / s.h; fitW = ar > BASE.w / BASE.h ? BASE.h * ar : BASE.w; return clamp({ x: 0, y: 0, w: fitW, h: fitW / ar }); };
  const go = (t, ms = 520) => {
    cancelAnimationFrame(anim); t = clamp(t);
    if (reduce || !ms) { vb = t; apply(); return; }
    const a = { ...vb }, t0 = performance.now();
    const step = now => { let k = Math.min(1, (now - t0) / ms); k = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      vb = { x: a.x + (t.x - a.x) * k, y: a.y + (t.y - a.y) * k, w: a.w + (t.w - a.w) * k, h: a.h + (t.h - a.h) * k }; apply(); if (k < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  };
  const zoomAt = (f, px, py, ms = 0) => {
    const s = size(), fx = px == null ? .5 : (px - s.l) / s.w, fy = py == null ? .5 : (py - s.t) / s.h;
    const w = Math.max(110, Math.min(fitW, vb.w / f)), h = w * s.h / s.w;
    const t = { x: vb.x + fx * (vb.w - w), y: vb.y + fy * (vb.h - h), w, h };
    if (ms) go(t, ms); else { cancelAnimationFrame(anim); vb = clamp(t); apply(); }
  };
  const focus = (x, y, w = 330) => {
    const s = size(); w = Math.min(w, fitW); const h = w * s.h / s.w;
    const off = (!detail.hidden && s.w > 760) ? w * (Math.min(400, s.w * .4) / s.w) / 2 : 0;
    const offY = (!detail.hidden && s.w <= 760) ? h * .3 : 0;
    go({ x: x - w / 2 + off, y: y - h / 2 + offY, w, h });
  };
  svg.removeAttribute('width'); svg.removeAttribute('height');
  vb = fit(); apply();
  let rsz = 0; addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(() => { const full = vb.w >= fitW - 1; const f = fit(); vb = full ? f : clamp(vb); apply(); }, 80); });
  document.querySelectorAll('.mm-zoom [data-z]').forEach(b => b.addEventListener('click', () => { const z = b.dataset.z; if (z === 'fit') go(fit()); else zoomAt(z === 'in' ? 1.6 : 1 / 1.6, null, null, 260); }));
  stage.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * (e.deltaMode ? .05 : .0016)), e.clientX, e.clientY); }, { passive: false });
  const ptrs = new Map(); let drag = null, moved = 0, pinch = null;
  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); cancelAnimationFrame(anim);
    if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, vb: { ...vb } }; moved = 0; }
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), vb: { ...vb } }; drag = null; moved = 9; }
  });
  addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = size();
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const w = Math.max(110, Math.min(fitW, pinch.vb.w * pinch.d / d)), h = w * s.h / s.w, fx = (mx - s.l) / s.w, fy = (my - s.t) / s.h;
      vb = clamp({ x: pinch.vb.x + fx * (pinch.vb.w - w), y: pinch.vb.y + fy * (pinch.vb.h - h), w, h }); apply();
    } else if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      if (moved > 5) { stage.classList.add('drag'); tip.hidden = true; vb = clamp({ x: drag.vb.x - dx * vb.w / s.w, y: drag.vb.y - dy * vb.h / s.h, w: vb.w, h: vb.h }); apply(); }
    }
  });
  const up = e => { if (!ptrs.delete(e.pointerId)) return; if (ptrs.size < 2) pinch = null; if (!ptrs.size) { drag = null; stage.classList.remove('drag'); } };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  const hit = e => { const el = e.target.closest ? e.target.closest('[data-map],[data-go]') : null; return el ? (el.dataset.map || el.dataset.go) : null; };
  stage.addEventListener('click', e => { if (moved > 5) return; const id = hit(e); if (id) openPlace(id); });
  stage.addEventListener('dblclick', e => { if (!hit(e)) zoomAt(1.8, e.clientX, e.clientY, 260); });
  stage.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const id = hit(e); if (id) { e.preventDefault(); openPlace(id); } } });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!document.getElementById('mm-an').hidden) closeAn(); else closeDetail(); }
    if (e.target.tagName === 'INPUT') return;
    if (e.key === '+' || e.key === '=') zoomAt(1.4, null, null, 200); if (e.key === '-') zoomAt(1 / 1.4, null, null, 200); if (e.key === '0') go(fit());
  });
  // dica
  stage.addEventListener('pointermove', e => {
    if (drag && moved > 5 || e.pointerType === 'touch') { tip.hidden = true; return; }
    const el = e.target.closest('[data-map],[data-go]'); if (!el) { tip.hidden = true; return; }
    const id = el.dataset.map || el.dataset.go, p = P[id]; if (!p) return;
    tip.innerHTML = el.dataset.tip ? `<b>${esc(p.n)}</b><span>${esc(el.dataset.tip)}</span>` :
      `<b>${esc(p.n)}</b><span>${KIND[p.k] || p.k} · nível ${p.lv[0]}–${p.lv[1]} · ${p.c}${p.mons.length ? ' · ' + p.mons.length + ' monstros' : ''}</span>`;
    tip.hidden = false;
    const s = size(); let x = e.clientX - s.l + 16, y = e.clientY - s.t + 16;
    if (x + tip.offsetWidth > s.w - 8) x = e.clientX - s.l - tip.offsetWidth - 12;
    if (y + tip.offsetHeight > s.h - 8) y = e.clientY - s.t - tip.offsetHeight - 12;
    tip.style.transform = `translate(${Math.max(6, x)}px,${Math.max(6, y)}px)`;
  });
  stage.addEventListener('pointerleave', () => { tip.hidden = true; });

  /* ------------------------------------------------------------------ painel do local */
  const spr = k => { const m = M[k]; if (m.s == null || m.s < 0) return `<i class="mm-spr none" style="--e:${EL[m.e][1]}">${m.pr ? '?' : ''}</i>`; const c = D.sprite.cols; return `<i class="mm-spr" style="background-position:-${(m.s % c) * 44}px -${Math.floor(m.s / c) * 44}px"></i>`; };
  const DEN = { M: 'muitos', m: 'médios', p: 'poucos', 'M/m': 'muitos', boss: 'chefe', miniboss: 'mini-chefe' };
  const monRow = (k, sp, raid) => {
    const m = M[k], d = sp && sp[k], prop = m.pr || (d && d[2] === 'proposto' && d[4] === 'gdd');
    const info = `nível ${m.l} · <i class="dot" style="background:${EL[m.e][1]}"></i>${EL[m.e][0]}${d && d[3] ? (raid ? ' · no raide' : ' · no calabouço') : ''}${d && d[0] && d[1] > 1 ? ` · ${DEN[d[0]] || d[0]}, ${d[1]} vivos` : ''}`;
    const tags = (m.b ? '<em>Chefe</em>' : '') + (prop ? `<em class="prop" title="${m.pr ? 'Espécie nova proposta; ainda sem ficha no bestiário' : 'Presença neste mapa é proposta'}">Proposta</em>` : '');
    const body = `${spr(k)}<span><b>${esc(m.n)}</b><small>${info}</small>${m.idea ? `<small class="idea">${esc(m.idea)}</small>` : ''}</span><span class="tg">${tags}</span>`;
    return m.pr ? `<div class="mm-mrow${m.b ? ' boss' : ''}">${body}</div>` : `<a class="mm-mrow${m.b ? ' boss' : ''}" href="${D.href.bestiario}#mon-${k}">${body}</a>`;
  };
  let sel = null;
  const mark = id => { svg.querySelectorAll('.mm-sel').forEach(e => e.classList.remove('mm-sel')); if (id) svg.querySelectorAll(`[data-map="${id}"]`).forEach(e => e.classList.add('mm-sel')); };
  const showDetail = html => { detail.innerHTML = '<button class="mm-x" type="button" aria-label="Fechar">×</button>' + html; detail.hidden = false; detail.scrollTop = 0; root.classList.add('has-detail'); detail.querySelector('.mm-x').addEventListener('click', closeDetail); };
  function closeDetail() { detail.hidden = true; root.classList.remove('has-detail'); sel = null; mark(null); setHash(); }
  function openPlace(id, quiet) {
    const p = P[id]; if (!p) return;
    sel = id; mark(id);
    const step = routeIds().indexOf(id);
    const chips = [`<span class="chip lv" style="--c:${heat(p.lv[0])}">nível ${p.lv[0]}–${p.lv[1]}</span>`, `<span class="chip st-${p.st}" title="${esc(p.stn)}">${ST[p.st]}</span>`];
    if (p.pt) chips.push('<span class="chip bell">Sino-portal</span>');
    if (p.ms) chips.push(`<span class="chip">${esc(p.ms)}</span>`);
    const tn = Object.keys(D.tribos).filter(n => p.tr.includes(n));
    if (tn.length) chips.push(`<span class="chip tr">${tn.map(n => `<i style="background:${D.tribos[n].cor}"></i>`).join('')}${tn.length > 1 ? 'Fronteira ' : ''}${tn.join(' · ')}</span>`);
    let pics = '';
    if (p.pics.length) pics = `<figure class="mm-fig"><img src="${p.pics[0][0]}" alt="${esc(p.pics[0][1])}: ${esc(p.n)}" loading="lazy" width="760" height="428"><figcaption>${esc(p.pics[0][1])}</figcaption>` +
      (p.pics.length > 1 ? `<div class="mm-thumbs">${p.pics.map((x, i) => `<button type="button" data-i="${i}"${i ? '' : ' class="on"'} aria-label="${esc(x[1])}"><img src="${x[0]}" alt="" loading="lazy"></button>`).join('')}</div>` : '') + '</figure>';
    else pics = '<div class="mm-fig none">Conceito em preparo</div>';
    const story = p.ideia || p.nota || (p.bio ? p.bio + '.' : '');
    const facts = [];
    if (p.bio && story !== p.bio + '.') facts.push(['Cenário', p.bio]);
    if (p.el && p.el !== '—' && p.el !== 'a definir') facts.push(['Elemento', p.el]);
    if (p.boss && !p.boss.startsWith('—') && p.boss !== 'a definir') facts.push(['Chefe da zona', p.boss]);
    if (p.dg) facts.push([p.k === 'raide' ? 'Raide' : 'Calabouço', p.dgn + (p.k === 'raide' ? ' · entra-se pela Torre' : ' · entra-se por portal e cai noutro mapa; lá dentro não há mapa')]);
    if (step >= 0) facts.push(['Na jornada', `passo ${step + 1} de ${routeIds().length} (rota ${tribe})`]);
    if (p.mtipo && /group/.test(p.mtipo)) facts.push(['Farm', 'pensado para grupo']);
    if (p.vivos) facts.push(['Monstros vivos (alvo)', p.vivos + ' ao mesmo tempo']);
    facts.push(['Produção', ST[p.st] + ' · ' + p.stn]);
    let gaps = '';
    if (isField(p) && !p.mons.length) gaps = '<p class="mm-warn red">Lacuna: nenhum monstro do bestiário está alocado neste local.</p>';
    if (p.falta) gaps += `<p class="mm-warn red">Falta criar (GDD de distribuição): ${esc(p.falta.join('; '))}.</p>`;
    if (!gaps && warn[id]) gaps = `<p class="mm-warn">Ressalva de balanceamento: ${esc(warn[id].join('; '))}.</p>`;
    const hs = (p.hs || []).length ? `<h3>Spawns disputados <small>${p.hs.length}</small></h3><ul class="mm-hs">${p.hs.map(h => `<li><b>${h[0].length ? h[0].map(k => esc(M[k].n)).join(' + ') : 'espécies a definir'}</b><small>${esc(h[1])} · nível ${esc(h[2])} · ${h[3]} vivos no anel${h[5] ? ' · no calabouço' : ''}${h[4] === 'lacuna' ? ' · em aberto' : h[4] === 'proposto' ? ' · proposta' : ''}</small></li>`).join('')}</ul>` : '';
    const nprop = p.mons.filter(k => M[k].pr).length;
    const mons = (p.mons.length ? `<h3>Monstros que vivem aqui <small>${p.mons.length}${nprop ? ' · ' + nprop + (nprop > 1 ? ' propostas' : ' proposta') : ''}</small></h3><div class="mm-mons">${p.mons.map(k => monRow(k, p.sp, p.k === 'raide')).join('')}</div>` : (isField(p) ? '' : '<p class="mm-mute">Área segura: sem monstros.</p>')) + hs;
    showDetail(`<p class="mm-eyebrow">${KIND[p.k] || p.k} · célula ${p.c}</p><h2>${esc(p.n)}</h2><div class="chips">${chips.join('')}</div>${pics}` +
      (story ? `<p class="mm-story">${esc(story)}</p>` : '') + `<dl class="mm-facts">${facts.map(f => `<dt>${f[0]}</dt><dd>${esc(f[1])}</dd>`).join('')}</dl>${gaps}${mons}` +
      `<div class="mm-go">${p.ficha ? `<a class="mm-btn gold" href="${D.href.mundo}#z-${id}">Abrir a página do mapa na wiki</a>` : ''}<button class="mm-btn" type="button" data-center>Centralizar no mapa</button></div>`);
    detail.querySelectorAll('.mm-thumbs button').forEach(b => b.addEventListener('click', () => {
      const x = p.pics[+b.dataset.i], im = detail.querySelector('.mm-fig > img'); im.src = x[0]; im.alt = x[1] + ': ' + p.n; detail.querySelector('figcaption').textContent = x[1];
      detail.querySelectorAll('.mm-thumbs button').forEach(o => o.classList.toggle('on', o === b));
    }));
    detail.querySelector('[data-center]').addEventListener('click', () => focus(p.x, p.y, 300));
    if (!quiet) focus(p.x, p.y, Math.min(vb.w, 420));
    setHash();
  }
  function openTribe(n) {
    const t = D.tribos[n], cap = Object.entries(P).find(([, p]) => p.k === 'capital' && p.n === t.cidade);
    const lands = D.terr.filter(x => x.tr.includes(n));
    const locais = Object.entries(P).filter(([, p]) => p.tr.includes(n));
    setLayer('tribos', true); sel = null; mark(null);
    showDetail(`<p class="mm-eyebrow">Tribo</p><h2><i class="mm-tsw" style="background:${t.cor}"></i>${n}</h2><div class="chips"><span class="chip">${esc(t.sig)}</span><span class="chip">Capital: ${esc(t.cidade)}</span></div>` +
      `<p class="mm-story">${esc(t.tema)}</p><dl class="mm-facts"><dt>Linhas de classe</dt><dd>${esc(t.linhas.join(', '))}</dd><dt>Território</dt><dd>${esc(lands.map(x => x.n + (x.tr.startsWith('Fronteira') ? ' (fronteira)' : '')).join(', '))}</dd></dl>` +
      `<h3>Locais do território <small>${locais.length}</small></h3><div class="mm-plist">${locais.sort((a, b) => a[1].lv[0] - b[1].lv[0]).map(([i, p]) => `<button type="button" data-p="${i}"><b>${esc(p.n)}</b><small>${KIND[p.k]} · ${p.lv[0]}–${p.lv[1]}</small></button>`).join('')}</div>` +
      `<div class="mm-go"><a class="mm-btn gold" href="${D.href.mundo}#tribos">Tribos na wiki</a><button class="mm-btn" type="button" data-start>Começar a jornada por aqui</button></div>`);
    detail.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => openPlace(b.dataset.p)));
    detail.querySelector('[data-start]').addEventListener('click', () => { setTribe(n); setLayer('rota', true); });
    if (cap) focus(cap[1].x, cap[1].y - 60, 520);
  }

  /* ------------------------------------------------------------------ jornada */
  const lvIn = document.getElementById('mm-lv'), jTxt = document.getElementById('mm-j-txt'), jTr = document.querySelector('.mm-j-tribe');
  Object.keys(D.tribos).forEach(n => { const b = H('button', '', `<i style="background:${D.tribos[n].cor}"></i>${n}`); b.type = 'button'; b.dataset.t = n; b.addEventListener('click', () => { setTribe(n); setLayer('rota', true); }); jTr.appendChild(b); });
  function setTribe(n) { tribe = n; jTr.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === n)); journey(); }
  function journey() {
    const at = drawRoute(); let n = 0;
    bells.forEach(([lv, g]) => { const a = lv <= level; g.classList.toggle('on', a); n += a; });
    const pct = Math.round(100 * n / bells.length);
    domeArcs.forEach(a => a.setAttribute('stroke-dasharray', `${pct} 100`));
    dome.style.opacity = (.15 + .85 * pct / 100).toFixed(2);
    root.classList.toggle('dome-full', pct === 100);
    jTxt.innerHTML = `nível <b>${level}</b> · ${esc(at === 'crystal_tower' ? 'Torre de Cristal' : P[at].n)} · sinos <b>${n}/${bells.length}</b> · domo <b>${pct}%</b>`;
    lvIn.style.setProperty('--p', ((level - 1) / 149 * 100).toFixed(1) + '%');
  }
  lvIn.addEventListener('input', () => { level = +lvIn.value; if (!on.rota && !on.sinos) { setLayer('rota', true); setLayer('sinos', true); } journey(); });
  lvIn.addEventListener('change', setHash);

  /* ------------------------------------------------------------------ busca */
  const q = document.getElementById('mm-q'), res = document.getElementById('mm-res');
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const IDX = Object.entries(P).map(([i, p]) => ({ t: norm(p.n), h: `<b>${esc(p.n)}</b><small>${KIND[p.k]} · ${p.lv[0]}–${p.lv[1]}</small>`, go: () => openPlace(i) }))
    .concat(Object.entries(M).map(([k, m]) => ({ t: norm(m.n), h: `<b>${esc(m.n)}</b><small>${m.pr ? 'proposta' : 'monstro'} · nível ${m.l} · ${m.z.length ? esc(P[m.z[0]].n) : 'sem local'}</small>`, go: () => { if (m.z.length) { setLayer('monstros', true); openPlace(m.z[0]); } } })));
  q.addEventListener('input', () => {
    const v = norm(q.value.trim()); res.innerHTML = '';
    if (v.length < 2) { res.hidden = true; return; }
    IDX.filter(x => x.t.includes(v)).slice(0, 8).forEach(x => { const li = H('li', '', `<button type="button">${x.h}</button>`); li.firstChild.addEventListener('click', () => { res.hidden = true; q.value = ''; x.go(); }); res.appendChild(li); });
    if (!res.children.length) res.innerHTML = '<li class="none">Nada encontrado</li>';
    res.hidden = false;
  });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = res.querySelector('button'); if (b) b.click(); } });
  document.addEventListener('click', e => { if (!e.target.closest('.mm-search')) res.hidden = true; });

  /* ------------------------------------------------------------------ análise */
  const anEl = document.getElementById('mm-an'), anBody = document.getElementById('mm-an-body');
  const pl = i => `<button type="button" class="lk" data-p="${i}">${esc(P[i].n)}</button>`;
  const rng = r => r.map(([a, b]) => a === b ? a : `${a}–${b}`).join(', ') || 'nenhum';
  function buildAn() {
    const maxm = Math.max(...AN.nm), W = 150 * 5, bars = AN.nm.map((n, i) => `<rect x="${i * 5}" y="${70 - n / maxm * 66}" width="4" height="${n / maxm * 66}" fill="${n ? heat(i + 1) : 'none'}"/>` +
      (AN.nb[i] ? `<path d="M${i * 5 + 2},${66 - n / maxm * 66} l2.4,-4 l-4.8,0z" fill="#b8860b"/>` : '') + (n ? '' : `<rect x="${i * 5}" y="0" width="4" height="70" fill="#c0392b" opacity=".16"/>`) +
      `<rect x="${i * 5}" y="76" width="4" height="9" fill="#2f6e8f" opacity="${Math.min(1, AN.nf[i] / 4)}"/>` + (AN.nf[i] ? '' : `<rect x="${i * 5}" y="76" width="4" height="9" fill="#c0392b"/>`)).join('');
    const ticks = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150].map(l => `<text x="${(l - 1) * 5 + 2}" y="98" text-anchor="middle" font-size="8" fill="currentColor">${l}</text>`).join('');
    const maxd = Math.max(...AN.dec.map(d => d.mons));
    const elBar = el => { const tot = Object.values(el).reduce((a, b) => a + b, 0) || 1; return '<span class="elbar">' + Object.keys(EL).filter(k => el[k]).map(k => `<i style="width:${el[k] / tot * 100}%;background:${EL[k][1]}" title="${EL[k][0]}: ${el[k]}"></i>`).join('') + '</span>'; };
    const semLocal = AN.sem_local.map(k => `<span class="tag">${esc(M[k].n)} <small>nv ${M[k].l}${M[k].zid ? ' · ' + esc(M[k].zid) : ''}</small></span>`).join('') || '<span class="ok">Todos os monstros têm local.</span>';
    anBody.innerHTML =
      `<div class="kpis"><div><b>${AN.total}</b>espécies no mapa</div><div><b>${AN.bestiario}</b>do bestiário</div><div class="warnk"><b>${AN.propostas}</b>propostas (a aprovar)</div><div><b>${AN.chefes}</b>chefes e mini-chefes</div><div><b>${AN.hs}</b>spawns disputados</div><div class="${AN.sem_local.length + AN.vazios.length + AN.dg_vazios.length ? 'bad' : ''}"><b>${AN.sem_local.length + AN.vazios.length + AN.dg_vazios.length}</b>lacunas duras</div></div>` +
      `<section><h3>O que as propostas fecham</h3><dl class="mm-facts"><dt>Níveis sem monstro, antes</dt><dd>${rng(AN.niveis_sem_monstro_antes)}</dd><dt>Níveis sem monstro, com as propostas</dt><dd>${rng(AN.niveis_sem_monstro)}</dd>` +
      `<dt>Campos só com espécies propostas</dt><dd>${AN.so_prop.map(pl).join(', ') || 'nenhum'}</dd><dt>Calabouços só com espécies propostas</dt><dd>${AN.dg_prop.map(i => esc(P[i].dgn) + ' (' + pl(i) + ')').join(', ') || 'nenhum'}</dd>` +
      `<dt>Spawn disputado em aberto</dt><dd>${AN.hs_lacuna.map(pl).join(', ') || 'nenhum'} (espera decisão do criador)</dd></dl></section>` +
      `<section><h3>Espinha: a rota do herói</h3><div class="tblw"><table><thead><tr><th>Parada</th><th>Tribo</th><th>Faixa</th><th>Campo</th><th>Calabouço</th><th>Níveis</th><th>Chefes</th><th>Disputados</th><th>Corrupção</th><th>Propostas</th></tr></thead><tbody>${AN.espinha.map(e => `<tr><td>${pl(e.id)}</td><td>${e.tribo || 'todas'}</td><td>${P[e.id].lv[0]}–${P[e.id].lv[1]}</td><td>${e.campo || '—'}</td><td>${e.dg || '—'}</td><td>${e.max ? e.min + '–' + e.max : '—'}</td><td>${e.chefes || '—'}</td><td>${e.hs || '—'}</td><td>${e.max ? `<span class="corr"><i style="width:${e.corr}%"></i></span>${e.corr}%` : '—'}</td><td>${e.prop || '—'}</td></tr>`).join('')}</tbody></table></div>` +
      `<p class="mm-mute">Saltos de mais de 3 níveis entre paradas do tronco: ${AN.saltos.map(x => esc(P[x.de].n) + ' → ' + esc(P[x.para].n) + ' (' + x.gap.join(' → ') + ')').join('; ') || 'nenhum'}. Campos sem chefe nem mini-chefe: ${AN.sem_chefe.length} de ${AN.campos} (o GDD aceita até ~40%).</p></section>` +
      `<section><h3>Gradiente de corrupção (sul → norte)</h3><p class="mm-mute">Fração das espécies de cada faixa de nível que são de Cristal ou Crepúsculo. O norte é o reino do mal: a fração tem de subir.</p><div class="corrs">${AN.linhas.map(l => `<div><span class="bar"><i style="height:${l.corr}%"></i></span><b>${l.corr}%</b><small>${l.faixa}</small><small>${l.mons} esp.</small></div>`).join('')}</div></section>` +
      `<section><h3>Lacunas duras</h3><div class="cols3"><div><h4>Espécies sem local <small>${AN.sem_local.length}</small></h4><p class="tags">${semLocal}</p></div>` +
      `<div><h4>Campos sem monstros <small>${AN.vazios.length}</small></h4><p class="tags">${AN.vazios.map(i => `<span class="tag">${pl(i)} <small>${P[i].lv[0]}–${P[i].lv[1]}</small></span>`).join('') || '<span class="ok">Nenhum.</span>'}</p></div>` +
      `<div><h4>Calabouços sem monstros <small>${AN.dg_vazios.length}</small></h4><p class="tags">${AN.dg_vazios.map(i => `<span class="tag">${esc(P[i].dgn)} <small>em ${pl(i)}</small></span>`).join('') || '<span class="ok">Nenhum.</span>'}</p></div></div>` +
      `<p><button class="mm-btn gold" type="button" id="mm-an-show">Mostrar as lacunas no mapa</button></p></section>` +
      (AN.gdd && AN.gdd.length ? `<section><h3>Lacunas do GDD de distribuição (MVP 1 a 50) <small>${AN.gdd.length}</small></h3><ol class="gdd">${AN.gdd.map(x => `<li>${esc(x)}</li>`).join('')}</ol><p class="mm-mute">Fonte: design/gdd/monster-spawn-distribution.md, seção 3.10, em ordem de gravidade.</p></section>` : '') +
      `<section><h3>Curva de níveis da jornada (1 a 150)</h3><p class="mm-mute">Barras: monstros por nível (triângulo dourado = chefe). Faixa azul: quantos campos cobrem o nível (mais escuro = mais sobreposição). Vermelho = nível sem monstro ou sem campo.</p>` +
      `<div class="chart"><svg viewBox="-4 -4 ${W + 8} 106" role="img" aria-label="Monstros e campos por nível">${bars}${ticks}</svg></div>` +
      `<dl class="mm-facts"><dt>Níveis sem nenhum monstro</dt><dd>${rng(AN.niveis_sem_monstro)}</dd><dt>Níveis sem nenhum campo</dt><dd>${rng(AN.niveis_sem_campo)}</dd><dt>Níveis com 4 campos ou mais ao mesmo tempo</dt><dd>${rng(AN.sobreposicao)}</dd></dl></section>` +
      `<section><h3>Campos com ressalva <small>${AN.fora.length}</small></h3><table><thead><tr><th>Campo</th><th>Faixa</th><th>O que destoa</th></tr></thead><tbody>${AN.fora.map(f => `<tr><td>${pl(f.id)}</td><td>${P[f.id].lv[0]}–${P[f.id].lv[1]}</td><td>${esc(f.p.join('; '))}</td></tr>`).join('')}</tbody></table></section>` +
      `<section><h3>Distribuição por região</h3><table><thead><tr><th>Região</th><th>Território</th><th>Locais</th><th>Campos</th><th>Monstros</th><th>Chefes</th><th>Elementos</th></tr></thead><tbody>${AN.regs.map(r => `<tr><td>${esc(r.n)}</td><td>${esc(r.tr)}</td><td>${r.locais}</td><td>${r.campos}</td><td>${r.mons}</td><td>${r.chefes}</td><td>${elBar(r.el)}</td></tr>`).join('')}</tbody></table>` +
      `<p class="ellegend">${Object.values(EL).map(e => `<span><i style="background:${e[1]}"></i>${e[0]}</span>`).join('')}</p></section>` +
      `<section><h3>Densidade de chefes por faixa de 10 níveis</h3><div class="decs">${AN.dec.map(d => `<div><span class="bar"><i style="height:${d.mons / maxd * 100}%"></i></span><b class="${d.chefes ? '' : 'zero'}">${d.chefes}</b><small>${d.de}–${d.ate}</small><small>${d.mons} mon.</small></div>`).join('')}</div><p class="mm-mute">Número em destaque: chefes na faixa; barra: total de monstros. Faixa com zero chefe aparece em vermelho.</p></section>`;
    anBody.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { closeAn(); setLayer('monstros', true); setLayer('lacunas', true); openPlace(b.dataset.p); }));
    document.getElementById('mm-an-show').addEventListener('click', () => { closeAn(); setLayer('monstros', true); setLayer('lacunas', true); setLayer('niveis', true); go(fit()); });
  }
  function openAn() { if (!anBody.innerHTML) buildAn(); anEl.hidden = false; root.classList.add('an-open'); }
  function closeAn() { anEl.hidden = true; root.classList.remove('an-open'); }
  document.getElementById('mm-b-an').addEventListener('click', openAn);
  document.getElementById('mm-an-x').addEventListener('click', closeAn);
  anEl.addEventListener('click', e => { if (e.target === anEl) closeAn(); });
  const bLay = document.getElementById('mm-b-lay');
  bLay.addEventListener('click', () => { const c = root.classList.toggle('lay-closed'); root.classList.toggle('lay-open', !c); bLay.setAttribute('aria-expanded', String(!c)); });
  if (innerWidth <= 760) { root.classList.add('lay-closed'); bLay.setAttribute('aria-expanded', 'false'); }

  /* ------------------------------------------------------------------ estado inicial e links diretos */
  function setHash() { const h = []; if (sel) h.push('map=' + sel); if (level > 1) h.push('nivel=' + level); try { history.replaceState(null, '', h.length ? '#' + h.join('&') : location.pathname + location.search); } catch (e) { /* file:// */ } }
  const hp = {}; location.hash.slice(1).split('&').forEach(s => { const [k, v] = s.split('='); if (k) hp[k] = decodeURIComponent(v || ''); });
  if (hp.camadas != null) { const want = hp.camadas.split(',').filter(Boolean); LAYERS.forEach(([, it]) => it.forEach(([k, , def]) => { if (['tribos', 'rota', 'cristais', 'sinos', 'niveis', 'calaboucos', 'monstros', 'lacunas'].includes(k)) on[k] = want.includes(k); })); }
  Object.keys(on).forEach(k => setLayer(k, on[k]));
  if (hp.nivel) { level = Math.max(1, Math.min(150, +hp.nivel || 1)); lvIn.value = level; }
  setTribe(D.tribos[hp.tribo] ? hp.tribo : 'Vowborn');
  const h0 = hp.map || hp.local; if (h0 && P[h0]) openPlace(h0);
  addEventListener('hashchange', () => { const m = /(?:^|[#&])(?:map|local)=([a-z0-9_]+)/.exec(location.hash); if (m && P[m[1]] && m[1] !== sel) openPlace(m[1]); });
  if (hp.ver) { const v = hp.ver.split(',').map(Number); if (v.length === 3 && v.every(isFinite)) { const s = size(); go({ x: v[0] - v[2] / 2, y: v[1] - v[2] * s.h / s.w / 2, w: v[2], h: v[2] * s.h / s.w }, 0); } }
  if ('analise' in hp) openAn();
  root.classList.add('ready');
})();
