/* Abas do Workflow (hash na URL, sem rede). Sem JS, todos os painéis ficam visíveis em sequência. */
(function () {
  var tabs = document.querySelectorAll('.wf-tabs [role=tab]'), panels = document.querySelectorAll('.wf-panel');
  if (!tabs.length) return;
  document.documentElement.classList.add('wf-js');
  function show(k, push) {
    var ok = false;
    tabs.forEach(function (t) { var on = t.getAttribute('data-t') === k; if (on) ok = true; t.setAttribute('aria-selected', on ? 'true' : 'false'); });
    if (!ok) k = 'painel';
    panels.forEach(function (p) { p.hidden = p.getAttribute('data-tab') !== k; });
    if (push) try { history.replaceState(null, '', '#' + k); } catch (e) {}
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.getAttribute('data-t'), true); }); });
  var h = (location.hash || '').slice(1);
  var el = h && document.getElementById(h);
  if (el) { var p = el.closest('.wf-panel'); show(p ? p.getAttribute('data-tab') : 'painel'); el.scrollIntoView(); }
  else show(h || 'painel');
  window.addEventListener('hashchange', function () { var x = (location.hash || '').slice(1); if (document.querySelector('.wf-panel[data-tab="' + x + '"]')) show(x); });
})();
