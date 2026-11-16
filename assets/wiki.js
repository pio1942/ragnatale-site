/* Busca da wiki (search.json, sem rede externa) e caixa compacta no menu. */
(function () {
  var s = document.currentScript || document.querySelector('script[src$="assets/wiki.js"]');
  var base = s ? s.src.replace(/assets\/wiki\.js.*$/, '') : '';
  var data = null, loading = false;
  function load(cb) {
    if (data) return cb();
    if (loading) return;
    loading = true;
    fetch(base + 'search.json').then(function (r) { return r.json(); }).then(function (d) { data = d; cb(); }).catch(function () { loading = false; });
  }
  function norm(x) { return (x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function bind(input, box) {
    var run = function () {
      var q = norm(input.value.trim());
      if (q.length < 2) { box.hidden = true; return; }
      load(function () {
        var hit = data.filter(function (i) { return norm(i.t).indexOf(q) >= 0; }).slice(0, 12);
        box.innerHTML = hit.length ? hit.map(function (i) {
          return '<a href="' + base + i.u + '"><b>' + i.t.replace(/</g, '&lt;') + '</b><span>' + i.k + '</span></a>';
        }).join('') : '<p>Nada encontrado.</p>';
        box.hidden = false;
      });
    };
    input.addEventListener('input', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') box.hidden = true; });
    document.addEventListener('click', function (e) { if (!box.contains(e.target) && e.target !== input) box.hidden = true; });
  }
  var q = document.getElementById('wk-q'), r = document.getElementById('wk-res');
  if (q && r) bind(q, r);
  var bar = document.querySelector('.sb .wrap'), theme = document.getElementById('sb-theme');
  if (bar && theme && !q) {
    var f = document.createElement('form');
    f.className = 'wk-search mini'; f.setAttribute('role', 'search'); f.onsubmit = function () { return false; };
    f.innerHTML = '<input type="search" aria-label="Buscar na wiki" placeholder="Buscar…" autocomplete="off"><div class="wk-res" hidden></div>';
    bar.insertBefore(f, theme);
    bind(f.querySelector('input'), f.querySelector('.wk-res'));
  }
})();
