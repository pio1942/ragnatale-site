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
