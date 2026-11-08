/* Tema claro/escuro e menu do celular. Sem rastreadores, sem rede. */
(function () {
  var root = document.documentElement;
  function stored() { try { return localStorage.getItem('site-theme'); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem('site-theme', v); } catch (e) {} }
  function current() { return root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
  var t = stored(); if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
  root.classList.add('js');
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('sb-theme');
    if (b) {
      var sync = function () { var d = current() === 'dark'; b.setAttribute('aria-pressed', String(d)); b.textContent = d ? 'Tema: escuro' : 'Tema: claro'; };
      sync();
      b.addEventListener('click', function () { var n = current() === 'dark' ? 'light' : 'dark'; root.setAttribute('data-theme', n); save(n); sync(); });
    }
    var bar = document.querySelector('.sb');
    var setH = function () { if (bar) root.style.setProperty('--sbh', bar.offsetHeight + 'px'); };
    setH(); addEventListener('resize', setH);
    var m = document.getElementById('sb-menu'), l = document.getElementById('sb-links');
    if (m && l) m.addEventListener('click', function () { var o = l.classList.toggle('open'); m.setAttribute('aria-expanded', String(o)); setH(); });
  });
})();
