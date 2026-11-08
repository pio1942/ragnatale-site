/* Zoom de imagens por clique e filtros do Bestiário/NPCs. Sem rede, sem rastreadores. */
(function () {
  var lb = document.getElementById('lb');
  if (lb) {
    var stage, img, cap, scale = 1, last = null;
    lb.innerHTML = '<div class="lbbar"><span id="lb-cap"></span><a id="lb-orig" href="#" target="_blank" rel="noopener">Abrir original</a><button type="button" id="lb-out" aria-label="Diminuir">&minus;</button>' +
      '<button type="button" id="lb-in" aria-label="Aumentar">+</button><button type="button" id="lb-fit">Ajustar</button>' +
      '<button type="button" id="lb-x" aria-label="Fechar">Fechar</button></div><div class="stage" id="lb-stage"><img id="lb-img" alt=""></div>';
    stage = document.getElementById('lb-stage'); img = document.getElementById('lb-img'); cap = document.getElementById('lb-cap');
    var apply = function () {
      if (scale === 1) { stage.classList.remove('full'); img.style.width = ''; }
      else { stage.classList.add('full'); img.style.width = Math.round(img.naturalWidth * scale) + 'px'; }
    };
    var close = function () { lb.hidden = true; document.body.style.overflow = ''; if (last) last.focus(); };
    var open = function (a) {
      last = a; scale = 1; img.src = a.getAttribute('href'); img.alt = a.getAttribute('data-cap') || '';
      cap.textContent = img.alt; var o = document.getElementById('lb-orig'); o.href = a.getAttribute('data-full') || a.getAttribute('href'); lb.hidden = false; document.body.style.overflow = 'hidden'; apply();
      document.getElementById('lb-x').focus();
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.zoom');
      if (a) { e.preventDefault(); open(a); }
    });
    document.getElementById('lb-x').onclick = close;
    document.getElementById('lb-in').onclick = function () { scale = Math.min(4, (scale === 1 ? 1 : scale) * 1.4); apply(); };
    document.getElementById('lb-out').onclick = function () { scale = Math.max(1, scale / 1.4); if (scale < 1.05) scale = 1; apply(); };
    document.getElementById('lb-fit').onclick = function () { scale = 1; apply(); };
    img.addEventListener('click', function () { scale = scale === 1 ? 1.8 : 1; apply(); });
    stage.addEventListener('wheel', function (e) {
      e.preventDefault(); scale = Math.min(4, Math.max(1, scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); if (scale < 1.05) scale = 1; apply();
    }, { passive: false });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target === stage) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) close(); });
  }
  var box = document.querySelector('[data-filter]');
  if (box) {
    var q = document.getElementById('q'), z = document.getElementById('zsel'), b = document.getElementById('onlyboss'), n = document.getElementById('count');
    var cards = Array.prototype.slice.call(box.children);
    var run = function () {
      var t = (q.value || '').toLowerCase().trim(), zz = z.value, bb = b && b.checked, c = 0;
      cards.forEach(function (el) {
        var ok = (!t || el.getAttribute('data-name').indexOf(t) >= 0) && (!zz || el.getAttribute('data-zone') === zz) && (!bb || el.getAttribute('data-boss') === '1');
        el.hidden = !ok; if (ok) c++;
      });
      n.textContent = c + ' de ' + cards.length;
    };
    q.addEventListener('input', run); z.addEventListener('change', run); if (b) b.addEventListener('change', run); run();
  }
})();
