/* Vitrine: vídeos em loop (pausam fora da tela), vídeo ampliado, filtros, comparador, painel da forma, simulador de drop e sons.
   Sem rede, sem biblioteca. Tudo funciona sem este script, só sem a interação. */
(function () {
  var $ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var dlg = function (cls) {
    var d = el('dialog', 'vt-dlg ' + cls);
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    return d;
  };

  /* ---- vídeos: sempre em loop; só gastam CPU quando estão na tela */
  var vids = $('.vt-video video');
  vids.forEach(function (v) { v.muted = true; v.loop = true; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { var p = e.target.play(); if (p && p.catch) p.catch(function () {}); } else e.target.pause();
      });
    }, { rootMargin: '200px' });
    vids.forEach(function (v) { io.observe(v); });
  }
  var vd = null;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.vt-vbtn');
    if (!b) return;
    var v = b.querySelector('video'), cap = b.parentNode.querySelector('figcaption b');
    if (!vd) vd = dlg('vt-vdlg');
    vd.innerHTML = '<button type="button" class="vt-x" aria-label="Fechar">✕</button>';
    var big = v.cloneNode(true);
    big.controls = true; big.muted = true; big.loop = true; big.autoplay = true; big.removeAttribute('width'); big.removeAttribute('height');
    vd.appendChild(big);
    vd.appendChild(el('p', '', esc(cap ? cap.textContent : '') + ' · em loop'));
    vd.querySelector('.vt-x').onclick = function () { vd.close(); };
    vd.onclose = function () { big.pause(); vd.innerHTML = ''; };
    vd.showModal();
    var p = big.play(); if (p && p.catch) p.catch(function () {});
  });

  /* ---- filtros por etiqueta */
  $('.vt-filter').forEach(function (bar) {
    var items = $(bar.getAttribute('data-target')), count = bar.querySelector('.vt-count');
    var run = function (f, anim) {
      var n = 0;
      items.forEach(function (it) {
        var ok = !f || (' ' + (it.getAttribute('data-tags') || '') + ' ').indexOf(' ' + f + ' ') >= 0;
        it.hidden = !ok;
        if (ok) { n++; if (anim) { it.classList.remove('vt-fade'); void it.offsetWidth; it.classList.add('vt-fade'); } }
      });
      if (count) count.textContent = n + ' de ' + items.length;
      $('button', bar).forEach(function (b) { b.classList.toggle('on', (b.getAttribute('data-f') || '') === f); });
    };
    bar.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) run(b.getAttribute('data-f') || '', true); });
    var h = decodeURIComponent((location.hash.match(/filtro=([^&]+)/) || [])[1] || '');
    run(h && bar.querySelector('button[data-f="' + h + '"]') ? h : '');
  });

  /* ---- comparador deslizante */
  $('.vt-cmp').forEach(function (c) {
    var r = c.querySelector('input');
    var set = function () { c.style.setProperty('--p', r.value + '%'); };
    r.addEventListener('input', set); set();
  });

  /* ---- masculino / feminino (troca as imagens que têm as duas versões) */
  var setSex = function (scope, sex) {
    scope.setAttribute('data-sex', sex);
    $('.vt-sex button', scope).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-sex') === sex); });
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.vt-sex button');
    if (b && b.closest('[data-sexscope]')) setSex(b.closest('[data-sexscope]'), b.getAttribute('data-sex'));
  });

  /* ---- painel da forma (árvore de evolução) */
  var fd = null, cur = null, sex = 'm';
  var show = function (btn) {
    var d = JSON.parse(btn.getAttribute('data-forma'));
    var list = $('button.wk-evo-n', btn.closest('.wk-evo')), i = list.indexOf(btn);
    if (cur) cur.classList.remove('sel');
    cur = btn; btn.classList.add('sel');
    if (!fd) fd = dlg('vt-fdlg');
    var both = d.m && d.f, src = (sex === 'f' ? d.f || d.m : d.m || d.f);
    var img = src ? '<img src="' + esc(src) + '" alt="' + esc(d.n + ', traje ' + d.s) + '">'
                  : '<div class="vt-empty"><b>Aguardando arte</b><br>O conceito do traje ' + esc(d.s) + ' desta forma ainda não foi feito.</div>';
    var tog = both ? '<span class="vt-sex"><button type="button" data-sex="m" class="' + (sex === 'm' ? 'on' : '') + '">Masculino</button><button type="button" data-sex="f" class="' + (sex === 'f' ? 'on' : '') + '">Feminino</button></span>' : '';
    var only = !both && src ? ' <small>(' + (d.f ? 'versão feminina' : 'versão masculina') + '; a outra ainda não tem conceito)</small>' : '';
    var row = function (k, v) { return v ? '<p><span class="k">' + k + '</span>' + esc(v) + '</p>' : ''; };
    fd.innerHTML = '<div class="vt-panel"><div class="vt-panel-img"><button type="button" class="vt-x" aria-label="Fechar">✕</button>' + img + '</div><div class="vt-panel-tx">' +
      '<span class="vt-chips"><i class="vt-tipo t-personagem">' + esc(d.c) + '</i><i class="vt-st s-' + (src ? 'conceito' : 'provisorio') + '">' + (src ? 'Conceito em construção' : 'Sem arte') + '</i></span>' +
      '<h3>' + esc(d.n) + '</h3><p><b>' + esc(d.lv) + '</b>' + (d.r ? ' · caminho ' + esc(d.r) : ' · antes da escolha de caminho') + '</p>' +
      row('O que muda', d.muda) + row(d.r ? 'Caminho ' + d.r : 'Fantasia', d.fant) +
      '<p><span class="k">Traje</span>' + esc(d.fam) + ' das séries ' + esc(d.ss) + ' (imagem: ' + esc(d.s) + ')' + tog + only + '</p>' +
      row('Nota', d.nota) + row('Requisito', d.req) + (d.alt ? row('Nomes alternativos', d.alt) : '') +
      '<p class="vt-legend">Nomes das evoluções em proposta. O 3D do traje ainda não foi feito.</p>' +
      '<div class="vt-panel-nav"><button type="button" class="vt-btn" data-go="-1"' + (i <= 0 ? ' disabled' : '') + '>← Forma anterior</button>' +
      '<button type="button" class="vt-btn" data-go="1"' + (i >= list.length - 1 ? ' disabled' : '') + '>Próxima forma →</button></div></div></div>';
    fd.querySelector('.vt-x').onclick = function () { fd.close(); };
    $('[data-go]', fd).forEach(function (b) { b.onclick = function () { var t = list[i + (+b.getAttribute('data-go'))]; if (t) show(t); }; });
    $('.vt-sex button', fd).forEach(function (b) { b.onclick = function () { sex = b.getAttribute('data-sex'); show(btn); }; });
    fd.onkeydown = function (e) {
      var t = e.key === 'ArrowRight' ? list[i + 1] : e.key === 'ArrowLeft' ? list[i - 1] : null;
      if (t) { e.preventDefault(); show(t); }
    };
    fd.onclose = function () { if (cur) { cur.classList.remove('sel'); cur.focus(); } };
    if (!fd.open) fd.showModal();
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button.wk-evo-n[data-forma]');
    if (b) show(b);
  });

  /* ---- simulador de drop (ilustra a regra; as chances são as do GDD) */
  $('.vt-drop').forEach(function (box) {
    var F = JSON.parse(box.getAttribute('data-faixas')), S = JSON.parse(box.getAttribute('data-itens'));
    var card = box.querySelector('.vt-drop-card'), stats = box.querySelector('.vt-drop-stats'), tot = 0, cnt = {};
    var roll = function () {
      var r = Math.random() * 100, acc = 0, f = F[0];
      for (var k = 0; k < F.length; k++) { acc += F[k].p; if (r < acc) { f = F[k]; break; } }
      var it = S[Math.floor(Math.random() * S.length)], spec = Math.random() < it.spec ? it.classes[Math.floor(Math.random() * it.classes.length)] : null;
      var rows = it.st.map(function (s) {
        var lo = s[1], hi = s[2], a = lo + (hi - lo) * f.lo, b = lo + (hi - lo) * f.hi, v = f.id === 'perfeito' ? hi : Math.round(a + Math.random() * (b - a));
        return '<tr><td>' + esc(s[0]) + ' <small>(' + lo + '~' + hi + ')</small></td><td><b>' + v + '</b></td></tr>';
      }).join('');
      card.className = 'vt-drop-card q-b-' + f.id + ' vt-fade';
      card.innerHTML = '<span class="f">' + esc(f.n) + '</span><b>' + esc(it.n) + '</b><table>' + rows + '</table>' +
        (spec ? '<p style="margin:.5em 0 0;font-size:.84rem">Spec de <b>' + esc(spec) + '</b>: +5% no status principal só para essa classe.</p>' : '<p style="margin:.5em 0 0;font-size:.84rem;opacity:.7">Sem spec de classe.</p>');
      tot++; cnt[f.id] = (cnt[f.id] || 0) + 1;
      stats.textContent = tot + ' drops: ' + F.map(function (x) { return x.n + ' ' + (cnt[x.id] || 0); }).join(' · ');
      return f.id;
    };
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-roll]');
      if (!b) return;
      var n = +b.getAttribute('data-roll');
      if (n === 1) { roll(); return; }
      var i = 0, stop = b.hasAttribute('data-until');
      var step = function () {
        for (var k = 0; k < 25 && i < n; k++, i++) { if (roll() === 'perfeito' && stop) { i = n; break; } }
        if (i < n) requestAnimationFrame(step);
      };
      step();
    });
  });

  /* ---- sons */
  var playing = null, pb = null;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.vt-play');
    if (!b) return;
    if (playing) { playing.pause(); if (pb) { pb.classList.remove('on'); pb.textContent = '▶'; } if (pb === b) { playing = pb = null; return; } }
    playing = b.parentNode.querySelector('audio') || new Audio(b.getAttribute('data-snd'));
    pb = b; playing.currentTime = 0; b.classList.add('on'); b.textContent = '■';
    playing.onended = function () { b.classList.remove('on'); b.textContent = '▶'; playing = pb = null; };
    var p = playing.play(); if (p && p.catch) p.catch(function () {});
  });
})();
