/* Ragna Tale · área do criador: decifra assets/../area/dados.bin no navegador (PBKDF2-SHA256 + AES-GCM, Web Crypto). Sem biblioteca. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var form = $('#pv-login'), app = $('#pv-app'), msg = $('#pv-msg'), LS = 'ragna_area_k1';
  if (!form || !crypto || !crypto.subtle) { if (msg) msg.textContent = 'Este navegador não tem Web Crypto.'; return; }
  var b64 = function (u) { var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
  var unb64 = function (t) { var s = atob(t), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  var blob = null;
  function load() {
    if (blob) return Promise.resolve(blob);
    return fetch('dados.bin', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('fetch'); return r.arrayBuffer(); }).then(function (b) {
      var u = new Uint8Array(b), dv = new DataView(b);
      if (String.fromCharCode(u[0], u[1], u[2], u[3]) !== 'RTA1') throw new Error('formato');
      blob = { iter: dv.getUint32(4), salt: u.slice(8, 24), iv: u.slice(24, 36), ct: u.slice(36) };
      return blob;
    });
  }
  function deriveRaw(pw, b) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
      .then(function (k) { return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: b.salt, iterations: b.iter }, k, 256); });
  }
  function open(raw, b) {
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']).then(function (k) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.iv, additionalData: new TextEncoder().encode('RTA1') }, k, b.ct);
    }).then(function (plain) {
      var s = new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip')));
      return s.text();
    }).then(JSON.parse);
  }
  function remember(raw) { try { localStorage.setItem(LS, b64(new Uint8Array(raw))); } catch (e) {} }
  function forget() { try { localStorage.removeItem(LS); } catch (e) {} }
  function stored() { try { var v = localStorage.getItem(LS); return v ? unb64(v) : null; } catch (e) { return null; } }

  function render(D) {
    form.hidden = true; app.hidden = false;
    var secs = [['docs', 'Documentos'], ['bal', 'Balanceamento'], ['eap', 'EAP']];
    var groups = {}, order = [];
    D.docs.forEach(function (d) { if (!groups[d.g]) { groups[d.g] = []; order.push(d.g); } groups[d.g].push(d); });
    app.innerHTML = '<div class="pv-bar-top"><nav class="pv-tabs">' + secs.map(function (s) { return '<button data-s="' + s[0] + '">' + s[1] + '</button>'; }).join('') +
      '</nav><button class="pv-out" type="button">Sair</button></div><div class="pv-body"></div>';
    var body = $('.pv-body', app);
    function esc(t) { return t.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function showDocs(slug) {
      var cur = slug && D.docs.filter(function (d) { return d.s === slug; })[0];
      var list = '<aside class="pv-list"><input type="search" placeholder="Filtrar documentos" aria-label="Filtrar documentos">' + order.map(function (g) {
        return '<h3>' + esc(g) + '</h3><ul>' + groups[g].map(function (d) { return '<li data-t="' + esc((d.t + ' ' + d.r).toLowerCase()) + '"><a href="#docs/' + d.s + '"' + (cur && cur === d ? ' class="on"' : '') + '>' + esc(d.t) + '</a></li>'; }).join('') + '</ul>';
      }).join('') + '</aside>';
      body.innerHTML = '<div class="pv-split">' + list + '<article class="pv-doc">' + (cur ? '<h1 class="pv-h1">' + esc(cur.t) + '</h1>' + cur.h : '<h1 class="pv-h1">Documentos</h1><p class="lead">' + D.docs.length + ' documentos: GDDs, bíblia do mundo, ADRs, planos e decisões. Escolha um na lista.</p>') + '</article></div>';
      var f = $('input', body);
      f.addEventListener('input', function () { var q = f.value.toLowerCase(); body.querySelectorAll('.pv-list li').forEach(function (li) { li.hidden = q && li.dataset.t.indexOf(q) < 0; }); });
      window.scrollTo(0, 0);
    }
    function route() {
      var h = location.hash.replace(/^#/, ''), p = h.split('/'), s = p[0] || 'docs';
      if (s !== 'docs' && s !== 'bal' && s !== 'eap') s = 'docs';
      app.querySelectorAll('.pv-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === s); });
      if (s === 'docs') showDocs(p[1]); else { body.innerHTML = '<article class="pv-doc">' + D[s] + '</article>'; window.scrollTo(0, 0); }
    }
    app.querySelectorAll('.pv-tabs button').forEach(function (b) { b.addEventListener('click', function () { location.hash = b.dataset.s; }); });
    $('.pv-out', app).addEventListener('click', function () { forget(); location.hash = ''; location.reload(); });
    window.addEventListener('hashchange', route); route();
  }

  function tryOpen(raw, b) { return open(raw, b).then(render); }
  var k = stored();
  if (k) load().then(function (b) { return tryOpen(k.buffer, b); }).catch(function () { forget(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = $('#pv-pw').value, btn = $('button', form);
    msg.textContent = 'Abrindo...'; btn.disabled = true;
    var raw;
    load().then(function (b) { return deriveRaw(pw, b).then(function (r) { raw = r; return open(r, b); }); }).then(function (D) {
      if ($('#pv-rem').checked) remember(raw); else forget();
      $('#pv-pw').value = ''; render(D);
    }).catch(function () { msg.textContent = 'Senha incorreta.'; btn.disabled = false; });
  });
})();
