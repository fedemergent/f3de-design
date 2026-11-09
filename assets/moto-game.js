/* Juego del motociclista (franja bajo la sección de plugins).
   Mantén pulsado (W / ↑ / clic / botón) para levantar la rueda delantera: ¡no te pases de 50° o te caes!
   3 intentos (estrellas). Corre solo mientras la franja se ve en pantalla y se detiene al salir de ella o al cambiar de pestaña.
   El arte del piloto es el mismo del instalador de JAGUAR (3 colores: blanco, rojo y rojo oscuro). */
(function () {
  var box = document.getElementById('motoGame');
  if (!box) return;
  var cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  var starsEl = box.querySelectorAll('.tg-star');
  var okEl = box.querySelector('[data-ok]');
  var msg = box.querySelector('.tg-msg'), msgT = msg.querySelector('[data-msg]'), msgS = msg.querySelector('[data-sub]'), msgB = msg.querySelector('[data-again]');
  var T = function (s) { return window.t ? window.t(s) : s; };
  var ART_URL = 'assets/moto-game/rider_art.json', H = 160, LAP = 20, CRASH = 50, LIVES0 = 3, K = 0.5;
  var art = null, ready = false, loading = false, paths = [];
  var calm = false; try { calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var visible = false, running = false, hover = false, started = !calm, pressed = false;
  var W = 600, dpr = 1, last = 0, raf = 0, lives = LIVES0, g = null;

  function load() {
    if (loading) return; loading = true;
    fetch(ART_URL).then(function (r) { return r.json(); }).then(function (a) {
      art = a;
      art.shapes.forEach(function (s) { if (s.t === 'path') s._p = new Path2D(s.d); });
      ready = true; resize(); newRun(); updateRun();
    }).catch(function () { loading = false; });
  }

  function newRun() {
    g = { state: 'run', t: 0, r: 0, pitch: 0, omega: 0, spin: 0, air: 0, scroll: 0, crashT: 0, parts: [] };
    msg.hidden = true; hud(); draw();
  }
  function hud() {
    for (var i = 0; i < starsEl.length; i++) starsEl[i].classList.toggle('off', i >= lives);
    okEl.textContent = Math.round(g.air * 10) / 10 + ' s';
  }
  function show(title, sub, btn) {
    msgT.textContent = T(title); msgS.textContent = sub ? sub : ''; msgB.textContent = btn ? T(btn) : ''; msgB.hidden = !btn; msg.hidden = false;
  }
  function crash() { g.state = 'crash'; g.crashT = 0; lives--; hud(); }
  function afterCrash() {
    if (lives > 0) {
      show('¡Auch! Te pasaste de 50°', lives === 1 ? T('Te queda 1 intento') : T('Te quedan') + ' ' + lives + ' ' + T('intentos'), 'Reintentar'); g.state = 'retry';
    } else { show('GAME OVER', T('Recarga la página para volver a jugar'), null); g.state = 'over'; }
  }
  function win() {
    g.state = 'win';
    for (var i = 0; i < 70; i++) g.parts.push({ x: W - 50 + (Math.random() - 0.5) * 50, y: H - 70, vx: (Math.random() - 0.5) * 260, vy: -150 - Math.random() * 240, c: ['#e53935', '#ffdd57', '#f4f5f9', '#ff5a4f'][i % 4], life: 1.7 });
    show('¡Llegaste a la meta!', T('Rueda levantada') + ' ' + (Math.round(g.air * 10) / 10) + ' s', 'Correr otra vez');
  }

  /* ---------- entrada ---------- */
  function press(v) {
    if (!ready) return;
    if (v && !started) { started = true; updateRun(); }
    if (v && (g.state === 'retry' || g.state === 'win')) { newRun(); return; }
    pressed = v;
  }
  function typing(e) { var t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
  window.addEventListener('keydown', function (e) {
    if (!visible || !ready || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k === 'w' || k === 'W') { e.preventDefault(); press(true); }
    else if (k === 'ArrowUp' && hover) { e.preventDefault(); press(true); }
  });
  window.addEventListener('keyup', function (e) { var k = e.key; if (k === 'w' || k === 'W' || k === 'ArrowUp') pressed = false; });
  box.addEventListener('mouseenter', function () { hover = true; });
  box.addEventListener('mouseleave', function () { hover = false; pressed = false; });
  cv.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') return; e.preventDefault(); press(true); });
  window.addEventListener('pointerup', function () { pressed = false; });
  var hold = box.querySelector('[data-hold]');
  ['pointerdown'].forEach(function (ev) { hold.addEventListener(ev, function (e) { e.preventDefault(); press(true); }); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { hold.addEventListener(ev, function () { pressed = false; }); });
  msgB.addEventListener('click', function () { if (g.state === 'retry' || g.state === 'win') newRun(); });
  box.querySelector('.tg-start').addEventListener('click', function () { started = true; box.querySelector('.tg-start').hidden = true; updateRun(); });

  /* ---------- bucle ---------- */
  function resize() {
    var r = cv.getBoundingClientRect(); W = Math.max(Math.round(r.width), 240);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (g) draw();
  }

  function step(dt) {
    if (g.state === 'crash') {
      g.crashT += dt; g.pitch = Math.min(105, g.pitch + 190 * dt);
      if (g.crashT >= 1.0) afterCrash();
      return;
    }
    if (g.state === 'win') {
      g.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.life -= dt; });
      g.parts = g.parts.filter(function (p) { return p.life > 0; });
      g.spin = (g.spin + 200 * dt) % 360; g.scroll += 40 * dt;
      return;
    }
    if (g.state !== 'run') return;
    g.t += dt;
    g.omega += (pressed ? 210 : -260) * dt;
    g.omega = Math.max(-220, Math.min(180, g.omega));
    g.pitch += g.omega * dt;
    if (g.pitch <= 0) { g.pitch = 0; g.omega = pressed ? Math.max(0, g.omega) : 0; }
    if (g.pitch >= CRASH) { crash(); return; }
    if (g.pitch > 8) g.air += dt;
    g.r = Math.min(1, g.r + dt / LAP);
    g.spin = (g.spin + 420 * dt) % 360;
    g.scroll += 170 * dt;
    hud();
    if (g.r >= 1) win();
  }

  function drawShape(s) {
    if (s.t === 'path') { ctx.fillStyle = s.fill; ctx.fill(s._p); }
    else if (s.t === 'circle') { ctx.fillStyle = s.fill; ctx.beginPath(); ctx.arc(s.c[0], s.c[1], s.r, 0, 6.2832); ctx.fill(); }
    else if (s.t === 'line') { ctx.strokeStyle = s.stroke; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s.p1[0], s.p1[1]); ctx.lineTo(s.p2[0], s.p2[1]); ctx.stroke(); }
  }

  function draw() {
    if (!ready || !g) return;
    var gy = H - 28;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#2b2e3c'; ctx.fillRect(8, gy + 6, W - 16, 6);
    var span = W - 16 - 100, x = -20 + g.r * span + 60;
    ctx.fillStyle = '#e53935'; ctx.fillRect(8, gy + 6, Math.max(x + 40 - 8, 2), 6);
    // meta a cuadros
    for (var i = 0; i < 4; i++) for (var j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#191c22' : '#ecedf2'; ctx.fillRect(W - 34 + j * 6, gy - 30 + i * 6, 6, 6); }
    ctx.fillStyle = '#848d9c'; ctx.fillRect(W - 36, gy - 30, 2, 38);
    ctx.strokeStyle = '#2b2e3c'; ctx.lineWidth = 2;
    var n = Math.ceil(W / 74) + 2;
    for (var d = 0; d < n; d++) { var xx = (((d * 74 - g.scroll) % (n * 74)) + n * 74) % (n * 74) - 40; ctx.beginPath(); ctx.moveTo(xx, gy + 3); ctx.lineTo(xx + 16, gy + 3); ctx.stroke(); }
    // moto: se escala el arte y se gira alrededor del eje de la rueda trasera
    var px = art.pivot[0], py = art.pivot[1];
    ctx.save();
    ctx.translate(x, gy + 3 - (art.ground - py) * K - 0);
    ctx.scale(K, K);
    ctx.rotate(-g.pitch * Math.PI / 180);
    ctx.translate(-px, -py);
    art.order.forEach(function (grp) {
      ctx.save();
      if (grp === 'rw' || grp === 'fw') {
        var c = grp === 'rw' ? art.rear : art.front;
        ctx.translate(c[0], c[1]); ctx.rotate(g.spin * Math.PI / 180); ctx.translate(-c[0], -c[1]);
      }
      art.shapes.forEach(function (s) { if (s.g === grp) drawShape(s); });
      ctx.restore();
    });
    ctx.restore();
    g.parts.forEach(function (p) { ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 4, 4); });
    // medidor de ángulo
    ctx.fillStyle = '#9ea0ad'; ctx.font = '600 11px system-ui,sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(Math.round(g.pitch) + '° / ' + CRASH + '°', 12, 18);
    ctx.fillStyle = '#2b2e3c'; ctx.fillRect(12, 24, 90, 5);
    ctx.fillStyle = g.pitch > 38 ? '#ff5a4f' : '#e53935'; ctx.fillRect(12, 24, 90 * Math.min(g.pitch / CRASH, 1), 5);
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    var dt = Math.min((now - last) / 1000, 0.08); last = now;
    step(dt); draw();
    raf = requestAnimationFrame(frame);
  }

  function updateRun() {
    var want = ready && visible && started && !document.hidden;
    if (want && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!want && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    var s = box.querySelector('.tg-start'); s.hidden = started || !ready;
    if (ready && g && !running) draw();
  }

  document.addEventListener('visibilitychange', updateRun);
  window.addEventListener('resize', function () { if (ready) resize(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { visible = e.isIntersecting; if (visible) load(); updateRun(); }); }, { threshold: 0.3 }).observe(box);
  } else { visible = true; load(); }
})();
