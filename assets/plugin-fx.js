/* Animaciones de la sección de plugins:
   - TATU: celdas Voronoi vivas (las del instalador del programa) detrás de la ficha, que laten de vez en cuando.
   - TMS Cabinet Tools: el barrido de brillo sobre el icono de la empresa se hace con CSS (ver site.css).
   Solo se animan mientras la tarjeta se ve en pantalla; con «movimiento reducido» o «Fondo animado: no» queda un cuadro fijo. */
(function () {
  var cvs = document.querySelectorAll('canvas.vor');
  if (!cvs.length) return;
  var calm = false; try { calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var off = false; try { off = localStorage.getItem('f3de-motion') === 'off'; } catch (e) {}
  var DARK = [22, 13, 17], EDGE = [120, 36, 42], RED = [229, 57, 53];

  function mix(a, b, k) { k = Math.max(0, Math.min(1, k)); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function rgb(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }
  function ease(k) { k = Math.max(0, Math.min(1, k)); return 1 - Math.pow(1 - k, 3); }
  function clip(poly, nx, ny, d) {                 // Sutherland-Hodgman: conserva nx*x + ny*y <= d
    var out = [], n = poly.length;
    for (var i = 0; i < n; i++) {
      var a = poly[i], b = poly[(i + 1) % n], da = nx * a[0] + ny * a[1] - d, db = nx * b[0] + ny * b[1] - d;
      if (da <= 0) out.push(a);
      if ((da < 0 && db > 0) || (db < 0 && da > 0)) { var k = da / (da - db); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
    }
    return out;
  }
  function rng(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  function Vor(cv) {
    var ctx = cv.getContext('2d'), W = 0, H = 0, cells = [], t = 0, visible = false, running = false, last = 0, raf = 0, nextPulse = 1.2, rnd = rng(11);
    function build() {
      var r = cv.getBoundingClientRect(); W = Math.max(Math.round(r.width), 200); H = Math.max(Math.round(r.height), 120);
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var cols = Math.max(Math.round(W / 85), 4), rows = Math.max(Math.round(H / 75), 3), cw = W / cols, ch = H / rows;
      cells = [];
      for (var r2 = 0; r2 < rows; r2++) for (var c = 0; c < cols; c++) {
        cells.push({ bx: (c + 0.5 + (rnd() - 0.5) * 0.6) * cw, by: (r2 + 0.5 + (rnd() - 0.5) * 0.6) * ch, fx: 0.12 + rnd() * 0.2, fy: 0.12 + rnd() * 0.2, px: rnd() * 6.3, py: rnd() * 6.3, pb: rnd() * 6.3, heat: 0 });
      }
      cells.amp = Math.min(cw, ch) * 0.38;
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var n = cells.length, pts = cells.map(function (c) { return [c.bx + cells.amp * Math.sin(c.fx * t + c.px), c.by + cells.amp * Math.sin(c.fy * t + c.py)]; });
      var grow = ease(t / 2.2), rect = [[0, 0], [W, 0], [W, H], [0, H]];
      for (var i = 0; i < n; i++) {
        var sx = pts[i][0], sy = pts[i][1], order = [];
        for (var j = 0; j < n; j++) if (j !== i) order.push(j);
        order.sort(function (a, b) { return Math.hypot(pts[a][0] - sx, pts[a][1] - sy) - Math.hypot(pts[b][0] - sx, pts[b][1] - sy); });
        var poly = rect;
        for (var q = 0; q < order.length; q++) {
          var o = pts[order[q]], dx = o[0] - sx, dy = o[1] - sy, dist = Math.hypot(dx, dy), far = 0;
          for (var m = 0; m < poly.length; m++) far = Math.max(far, Math.hypot(poly[m][0] - sx, poly[m][1] - sy));
          if (dist / 2 > far) break;
          poly = clip(poly, dx, dy, (o[0] * o[0] + o[1] * o[1] - sx * sx - sy * sy) / 2);
          if (!poly.length) break;
        }
        if (poly.length < 3) continue;
        var cx = 0, cy = 0; poly.forEach(function (p) { cx += p[0]; cy += p[1]; }); cx /= poly.length; cy /= poly.length;
        var heat = cells[i].heat; cells[i].heat *= 0.95;
        var s = (0.80 + 0.09 * Math.sin(1.2 * t + cells[i].pb) + 0.07 * heat) * grow;
        ctx.beginPath();
        poly.forEach(function (p, k) {
          var x = cx + (p[0] - cx) * s + 1.4 * Math.sin(2.6 * t + k * 1.7 + i), y = cy + (p[1] - cy) * s + 1.4 * Math.cos(2.2 * t + k * 2.1 + i);
          if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        });
        ctx.closePath();
        var glow = Math.min(1, heat);
        ctx.fillStyle = rgb(mix(DARK, RED, 0.10 + 0.6 * glow), 0.55 + 0.3 * glow);
        ctx.strokeStyle = rgb(mix(EDGE, RED, 0.35 + 0.65 * glow), 0.9);
        ctx.lineWidth = 1 + glow * 1.6;
        ctx.fill(); ctx.stroke();
      }
    }
    function frame(now) {
      raf = 0; if (!running) return;
      var dt = Math.min((now - last) / 1000, 0.1); last = now; t += dt;
      nextPulse -= dt; if (nextPulse <= 0) { nextPulse = 1.4 + rnd() * 1.6; for (var k = 0; k < 3; k++) cells[Math.floor(rnd() * cells.length)].heat = 1; }
      draw(); raf = requestAnimationFrame(frame);
    }
    function update() {
      var want = visible && !document.hidden && !calm && !off;
      if (want && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!want && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    }
    build(); t = 3; draw();                    // cuadro fijo si no hay animacion
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (e) { visible = e.isIntersecting; update(); }); }, { threshold: 0.05 }).observe(cv);
    else { visible = true; update(); }
    document.addEventListener('visibilitychange', update);
    window.addEventListener('resize', function () { build(); draw(); });
    var prev = window.__syncMotionBtn;
    window.__vorMotion = function () { try { off = localStorage.getItem('f3de-motion') === 'off'; } catch (e) {} update(); };
  }
  cvs.forEach(Vor);
  var mb = document.getElementById('motionBtn'); if (mb) mb.addEventListener('click', function () { setTimeout(function () { if (window.__vorMotion) window.__vorMotion(); }, 0); });
})();
