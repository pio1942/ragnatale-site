/* Ragna Tale · site v2: menu, seletor de classes, vídeos, sons e ampliação. Sem biblioteca. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var top = $('.top'), nav = $('.nav'), burger = $('.burger');
  function onScroll() { if (top) top.classList.toggle('solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (burger) burger.addEventListener('click', function () { var o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });

  // classes
  var cards = $$('.cl'), btns = $$('.cb');
  function show(id, push) {
    var found = cards.some(function (c) { return c.dataset.c === id; });
    if (!found) return;
    cards.forEach(function (c) {
      var on = c.dataset.c === id;
      if (on && c.hidden) { c.classList.remove('entra'); void c.offsetWidth; c.classList.add('entra'); }   // o selo novo se forma
      c.hidden = !on;
    });
    btns.forEach(function (b) { b.classList.toggle('on', b.dataset.c === id); });
    if (push && history.replaceState) history.replaceState(null, '', '#' + id);
  }
  // homem × mulher: troca a imagem grande e o avatar da classe
  $$('.gsw button[data-g]').forEach(function (b) {
    b.addEventListener('click', function () {
      var art = b.closest('.cl'), g = b.dataset.g, id = art.dataset.c;
      art.dataset.g = g;
      $$('.gsw button[data-g]', art).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      $$('.hero-img', art).forEach(function (im) { im.classList.toggle('off', !im.classList.contains('g-' + g)); });
      $$('.cb[data-c="' + id + '"] .av').forEach(function (im) { im.classList.toggle('off', !im.classList.contains('g-' + g)); });
    });
  });
  if (cards.length) {
    btns.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.c, true); if (window.innerWidth < 1100) { var w = $('.cl-wrap'); window.scrollTo({ top: w.getBoundingClientRect().top + window.scrollY - 76, behavior: 'smooth' }); } }); });
    show((location.hash || '').slice(1) || cards[0].dataset.c, false);
    window.addEventListener('hashchange', function () { show(location.hash.slice(1), false); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var i = cards.findIndex(function (c) { return !c.hidden; });
      show(cards[(i + (e.key === 'ArrowRight' ? 1 : cards.length - 1)) % cards.length].dataset.c, true);
    });
  }

  // vídeos: toca no clique, pausa fora da tela
  $$('.vid-box').forEach(function (box) {
    var v = $('video', box);
    function toggle() { if (v.paused) { v.play(); box.classList.add('playing'); } else { v.pause(); box.classList.remove('playing'); } }
    box.addEventListener('click', toggle);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { if (!es[0].isIntersecting && !v.paused) { v.pause(); box.classList.remove('playing'); } }).observe(box);
  });

  // sons: um player só, com barra de progresso própria
  var audio = null, cur = null;
  $$('.snd-play').forEach(function (b) {
    b.addEventListener('click', function () {
      var bar = $('.wave i', b.parentNode);
      if (cur === b && audio && !audio.paused) { audio.pause(); b.classList.remove('on'); return; }
      if (audio) { audio.pause(); if (cur) { cur.classList.remove('on'); $('.wave i', cur.parentNode).style.width = '0'; } }
      audio = new Audio(b.dataset.src); cur = b; b.classList.add('on');
      audio.addEventListener('timeupdate', function () { bar.style.width = (100 * audio.currentTime / (audio.duration || 1)) + '%'; });
      audio.addEventListener('ended', function () { b.classList.remove('on'); bar.style.width = '0'; });
      audio.play();
    });
  });

  // ampliar imagem
  var lb = $('.lb');
  if (lb) {
    var im = $('img', lb), cap = $('figcaption', lb);
    function close() { lb.hidden = true; im.removeAttribute('src'); }
    $$('a.zoom').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); im.src = a.href; cap.textContent = a.dataset.cap || ''; lb.hidden = false; }); });
    lb.addEventListener('click', function (e) { if (e.target !== im) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
})();

/* Bestiário: filtros por região e elemento, e ficha técnica de cada criatura (dados em assets/bestiario.json). */
(function () {
  var box = document.querySelector('.ficha');
  if (!box) return;
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var R = document.querySelector('link[href$="assets/v2.css"]').getAttribute('href').replace('assets/v2.css', '');
  var EL = { neutral: 'Neutro', flame: 'Brasa', tide: 'Maré', gale: 'Vendaval', stone: 'Rocha', sap: 'Seiva', crystal: 'Cristal', dawn: 'Aurora', dusk: 'Crepúsculo' };
  var data = null, cont = box.querySelector('.ficha-c'), last = null;
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function val(v, suf) { return (v === null || v === undefined || v === '') ? '<span class="nd">a definir</span>' : esc(String(v).replace('.', ',')) + (suf || ''); }
  function stat(l, v, suf) { return '<li><i>' + l + '</i><b>' + val(v, suf) + '</b></li>'; }
  function render(m) {
    var h = '<header class="fh' + (m.ok ? '' : ' prod') + (m.b ? ' blend' : '') + '">' +
      '<div class="fa">' + (m.a ? '<img src="' + R + m.a + '" alt="' + esc(m.n) + '">' : '<i class="mp-x big"></i>') + (m.ok ? '' : '<span class="fprod">Arte em produção</span>') + '</div>' +
      '<div class="fi"><p class="kicker">' + esc(m.t) + (m.jogo ? ' · já no jogo' : '') + '</p><h2>' + esc(m.n) + '</h2><p class="fchips">' +
      '<span>Nível ' + m.lv + '</span>' + (m.e ? '<span class="el el-' + m.e + '">' + EL[m.e] + ' ' + m.el + '</span>' : '') + (m.r ? '<span>' + esc(m.r) + '</span>' : '') + (m.s ? '<span>' + esc(m.s) + '</span>' : '') + '</p>' +
      '<p class="freg">' + (m.zn ? 'Vive em <a href="' + R + 'mundo/#mapa">' + esc(m.zn) + '</a>' + (m.zr ? ' (níveis ' + esc(m.zr) + ')' : '') : 'Região a definir') + '</p>' +
      (m.aparencia ? '<p class="flore">' + esc(m.aparencia) + '</p>' : '') + '</div></header>';
    h += '<section><h3>Status</h3><ul class="fst">' + stat('Vida', m.hp) + stat('Ataque', m.atk) + stat('Defesa', m.def) + stat('XP', m.xp) +
      stat('Velocidade', m.vel, ' m/s') + stat('Alcance', m.alc, ' m') + stat('Intervalo de ataque', m.int, ' s') + stat('Percepção', m.perc, ' m') + '</ul></section>';
    h += '<section><h3>Comportamento e golpes</h3>' +
      '<p>' + (m.arq ? '<b>' + esc(m.arq) + '.</b> ' : '') + (m.comp && m.comp.length ? esc(m.comp.join('. ')) + '.' : (m.arq ? '' : '<span class="nd">Comportamento a definir.</span>')) + '</p>' +
      (m.golpes ? '<p>' + esc(m.golpes) + '</p>' : '') +
      (m.fases && m.fases.length ? '<ol class="ffases">' + m.fases.map(function (f) { return '<li><b>A partir de ' + esc(f.vida) + ' de vida</b>' + esc(f.licao) + '</li>'; }).join('') + '</ol>' : '') + '</section>';
    h += '<section><h3>Espectro elemental</h3>';
    if (m.sp) {
      h += '<p class="fnote">Quanto de dano cada elemento causa nesta criatura (' + EL[m.e] + ' nível ' + m.el + ').</p><ul class="fsp">' + m.sp.map(function (r) {
        var v = r[1], cls = v > 1 ? 'fraco' : v < 1 ? 'res' : 'neu', w = Math.min(100, v * 50);
        return '<li class="' + cls + '"><i class="el el-' + r[0] + '">' + EL[r[0]] + '</i><span class="bar2"><b style="width:' + w + '%"></b><u></u></span><em>×' + String(v).replace('.', ',') + '</em></li>';
      }).join('') + '</ul><p class="fleg"><span class="fraco">fraqueza</span><span class="res">resistência</span></p>';
    } else h += '<p class="nd">Elemento a definir.</p>';
    h += '</section><section><h3>Drops</h3>';
    if (m.d && m.d.length) {
      h += '<ul class="fdr">' + m.d.map(function (d) {
        return '<li class="k-' + d.k + '">' + (d.i ? '<img src="' + R + d.i + '" alt="" loading="lazy">' : '<i class="dico"></i>') + '<span><b>' + esc(d.n) + '</b><small>' + (d.k === 'carta' ? 'Carta da criatura' : d.k === 'ultra' ? 'Ultra raro' : d.k === 'raro' ? 'Raro' : 'Comum') + '</small></span><em>' + esc(d.c) + '</em><u>×' + esc(d.q) + '</u></li>';
      }).join('') + '</ul>';
    } else if (m.previsto) h += '<p class="fnote">Previsto no design; chances a definir.</p><p>' + esc(m.previsto) + '</p>';
    else h += '<p class="nd">A definir.</p>';
    h += '</section><section><h3>Onde aparece</h3><p>' + (m.zn ? esc(m.zn) + (m.zr ? ', níveis ' + esc(m.zr) : '') + '.' : '<span class="nd">A definir.</span>') + ' Horário e condição: <span class="nd">a definir</span>.</p></section>';
    if (m.par && m.par.length) {
      h += '<section><h3>Criaturas parecidas</h3><p class="fpar">' + m.par.map(function (id) { var x = data[id]; return x ? '<a href="#' + id + '" data-m="' + id + '">' + esc(x.n) + '<small>nível ' + x.lv + '</small></a>' : ''; }).join('') + '</p></section>';
    }
    cont.innerHTML = h; box.scrollTop = 0; box.querySelector('.ficha-in').scrollTop = 0;
  }
  function open(id) {
    function go() { if (!data[id]) return; render(data[id]); box.hidden = false; document.body.style.overflow = 'hidden'; if (history.replaceState) history.replaceState(null, '', '#' + id); }
    if (data) return go();
    fetch(R + 'assets/bestiario.json').then(function (r) { return r.json(); }).then(function (j) { data = j; go(); });
  }
  function close() { box.hidden = true; document.body.style.overflow = ''; if (history.replaceState) history.replaceState(null, '', location.pathname); if (last) last.focus(); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-m]');
    if (a) { e.preventDefault(); if (!box.contains(a)) last = a; open(a.dataset.m); return; }
    if (e.target === box || e.target.closest('.ficha-x')) close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
  if (location.hash.length > 1 && !/^#z-/.test(location.hash)) open(location.hash.slice(1));

  var zb = document.getElementById('bf-z'), bs = document.getElementById('bf-b'), cnt = document.getElementById('bf-n'), els = {}, zv = '', onlyB = false;
  function apply() {
    var anyE = Object.keys(els).some(function (k) { return els[k]; }), n = 0;
    $$('.bz').forEach(function (s) {
      var vis = 0;
      $$('[data-m]', s).forEach(function (c) {
        var ok = (!zv || s.dataset.z === zv) && (!onlyB || c.dataset.t === 'Chefe') && (!anyE || els[c.dataset.e]);
        c.hidden = !ok; if (ok) vis++;
      });
      $$('.mps', s).forEach(function (p) { p.hidden = !$$('[data-m]:not([hidden])', p).length; });
      s.hidden = !vis; n += vis;
    });
    cnt.textContent = n;
  }
  if (zb) {
    var list = zb.parentNode.querySelector('.rsel-l'), opts = $$('li', list);
    function toggle(o) { list.hidden = !o; zb.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o) (list.querySelector('.on') || opts[0]).focus(); }
    function pick(li) {
      zv = li.dataset.z; opts.forEach(function (x) { x.classList.toggle('on', x === li); x.setAttribute('aria-selected', x === li ? 'true' : 'false'); });
      zb.querySelector('span').textContent = li.querySelector('span').textContent; zb.querySelector('i').textContent = li.querySelector('i').textContent;
      toggle(false); zb.focus(); apply();
      if (zv) { var t = document.getElementById('z-' + zv); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 150, behavior: 'smooth' }); }
    }
    zb.addEventListener('click', function () { toggle(list.hidden); });
    opts.forEach(function (li, i) {
      li.addEventListener('click', function () { pick(li); });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(li); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); (opts[i + 1] || opts[0]).focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (opts[i - 1] || opts[opts.length - 1]).focus(); }
        else if (e.key === 'Escape') { toggle(false); zb.focus(); }
      });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.rsel')) toggle(false); });
    bs.addEventListener('click', function () { onlyB = !onlyB; bs.setAttribute('aria-pressed', onlyB ? 'true' : 'false'); apply(); });
    $$('.ef').forEach(function (b) { b.addEventListener('click', function () { els[b.dataset.e] = !els[b.dataset.e]; b.setAttribute('aria-pressed', els[b.dataset.e] ? 'true' : 'false'); apply(); }); });
  }
})();
