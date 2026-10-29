/* Contadores de visitas y descargas (servicio gratuito Abacus). Solo cuentan en el sitio publicado, no al probarlo en tu PC. */
(function () {
  var NS = 'f3de-design', B = 'https://abacus.jasoncameron.dev';
  var prod = location.hostname === 'fedemergent.github.io' && !/[?&]nocount/.test(location.search);
  var fmt = function (n) { try { return Number(n).toLocaleString('es'); } catch (e) { return String(n); } };
  var call = function (kind, key) { return fetch(B + '/' + kind + '/' + NS + '/' + key).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { return j.value; }); };
  var paint = function (key, v) { document.querySelectorAll('[data-count=' + key + ']').forEach(function (b) { b.textContent = fmt(v); }); };
  var show = function (sel) { document.querySelectorAll(sel).forEach(function (el) { el.hidden = false; el.classList.add('on'); }); };
  var seen = false; try { seen = sessionStorage.getItem('f3de-visit') === '1'; } catch (e) {}
  var visit = (prod && !seen) ? call('hit', 'visitas') : call('get', 'visitas');
  visit.then(function (v) { if (prod && !seen) { try { sessionStorage.setItem('f3de-visit', '1'); } catch (e) {} } paint('visitas', v); show('#visitsIntro,#footStats'); }).catch(function () {});
  call('get', 'descargas-tatu').then(function (v) { paint('descargas', v); show('#dlCount'); }).catch(function () {});
  window.countDownload = function () {
    if (!prod) return;
    call('hit', 'descargas-tatu').then(function (v) { paint('descargas', v); show('#dlCount'); }).catch(function () {});
  };
})();
