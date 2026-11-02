/* Juego del tatú corredor (ficha del plugin TATU). El tatú corre por una pista que avanza sola; ↑ salta las piedras y ↓ lo enrolla en bola para pasar bajo los murciélagos.
   Se carga cuando la ficha entra en pantalla y se pausa al salir de ella o al cambiar de pestaña. */
(function () {
  var box = document.getElementById('tatuGame');
  if (!box) return;
  var cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  var scoreOk = box.querySelector('[data-ok]'), scoreHit = box.querySelector('[data-hit]');
  var overlay = box.querySelector('.tg-over');
  var BASE = 'assets/tatu-game/', S = 0.5, H = 150, LAP = 50, SPEED = 150, JUMP_T = 0.7, ROLL_T = 1.0;
  var meta = null, im = {}, ready = false, loading = false;
  var calm = false; try { calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var visible = false, running = false, hover = false, focus = false, started = !calm;
  var W = 400, dpr = 1, last = 0, raf = 0;
  var g = null, bb = {}, apex = 0, v0 = 0, grav = 0, batBottom = 0, axOff = 0;

  function load() {
    if (loading) return; loading = true;
    fetch(BASE + 'meta.json').then(function (r) { return r.json(); }).then(function (m) {
      meta = m; var names = Object.keys(m.frames), left = names.length;
      names.forEach(function (n) {
        var i = new Image(); i.onload = i.onerror = function () { if (--left === 0) setup(); };
        i.src = BASE + n + '.png'; im[n] = i;
      });
    }).catch(function () { loading = false; });
  }

  function setup() {
    names();
    ready = true; reset(); resize(); updateRun();
  }

  function names() {
    var f = meta.frames;
    bb = {}; Object.keys(f).forEach(function (n) { bb[n] = f[n].bbox.map(function (v) { return v * S; }); });
    axOff = meta.anchor_x * S;
    var walkH = 0; for (var k = 0; k < meta.n_walk; k++) walkH = Math.max(walkH, bb['walk' + k][3] - bb['walk' + k][1]);
    var mid = Math.floor(meta.n_roll / 2), ballH = 0;
    for (var j = mid - 2; j < mid + 2; j++) { var b = bb['roll' + (j < 10 ? '0' : '') + j]; ballH = Math.max(ballH, b[3] - b[1]); }
    batBottom = ballH * 1.16 + 3;
    apex = walkH * 0.62; v0 = 4 * apex / JUMP_T; grav = 8 * apex / (JUMP_T * JUMP_T);
  }

  function reset() {
    g = { t: 0, y: 0, vy: 0, jt: null, rt: null, hurt: 0, obst: [], next: 420, ok: 0, hit: 0, seed: 7, ax: 30, scroll: 0 };
    score();
  }
  function rnd() { g.seed = (g.seed * 16807) % 2147483647; return (g.seed - 1) / 2147483646; }
  function score() { scoreOk.textContent = g.ok; scoreHit.textContent = g.hit; }

  function jump() { if (ready && started && g.y <= 0.01 && g.rt === null) { g.vy = v0; g.jt = 0; } }
  function roll() { if (ready && started && g.rt === null && g.y <= 0.01) g.rt = 0; }

  function resize() {
    var r = cv.getBoundingClientRect(); W = Math.max(Math.round(r.width), 200);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function frameName() {
    if (g.rt !== null) return 'roll' + ('0' + Math.min(Math.floor(g.rt / ROLL_T * meta.n_roll), meta.n_roll - 1)).slice(-2);
    if (g.y > 0) return 'jump' + Math.min(Math.floor((g.jt || 0) / JUMP_T * meta.n_jump), meta.n_jump - 1);
    return 'walk' + (Math.floor(g.t * 3 * meta.n_walk) % meta.n_walk);
  }

  function step(dt) {
    var gy = H - 26, p = (g.t % LAP) / LAP;
    g.t += dt;
    var target = 14 + axOff + p * (W - 28 - axOff * 2 - 20);
    g.ax += (target - g.ax) * Math.min(dt * 3, 1);
    if (p > 0.995 || (g.t % LAP) < dt) g.ax = 30;
    if (g.y > 0 || g.vy > 0) {
      g.vy -= grav * dt; g.y += g.vy * dt; if (g.jt !== null) g.jt += dt;
      if (g.y <= 0) { g.y = 0; g.vy = 0; g.jt = null; }
    }
    if (g.rt !== null) { g.rt += dt; if (g.rt >= ROLL_T) g.rt = null; }
    g.scroll += SPEED * dt;
    g.obst.forEach(function (o) { o.x -= SPEED * dt; });
    g.next -= SPEED * dt;
    if (g.next <= 0 && g.ax < W - 110) { g.obst.push({ x: W + 20, k: rnd() < 0.38 ? 'bat' : 'rock', s: null }); g.next = 220 + rnd() * 120; }
    else if (g.next <= 0) g.next = 120;
    var name = frameName(), b = bb[name], w = b[2] - b[0], h = b[3] - b[1], left = g.ax - axOff;
    var body = [left + b[0] + w * 0.14, left + b[2] - w * 0.14, g.y + h * 0.06, g.y + h * 0.9];
    g.obst.forEach(function (o) {
      var r = o.k === 'rock' ? bb.rock : bb.bat0, bw = r[2] - r[0], bh = r[3] - r[1];
      var hb = o.k === 'rock' ? [o.x - bw * 0.4, o.x + bw * 0.4, 0, bh * 0.85] : [o.x - bw * 0.4, o.x + bw * 0.4, batBottom, batBottom + bh * 0.8];
      if (o.s === null && hb[0] < body[1] && hb[1] > body[0] && hb[2] < body[3] && hb[3] > body[2]) { o.s = 'hit'; g.hit++; g.hurt = 0.45; score(); }
      else if (o.s === null && o.x + 12 < body[0]) { o.s = 'ok'; g.ok++; score(); }
    });
    g.obst = g.obst.filter(function (o) { return o.x > -50; });
    if (g.hurt > 0) g.hurt -= dt;
  }

  function draw() {
    if (!ready || !g) return;
    var gy = H - 26, p = (g.t % LAP) / LAP;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#2b2e3c'; ctx.fillRect(8, gy + 6, W - 16, 6);
    ctx.fillStyle = '#e53935'; ctx.fillRect(8, gy + 6, Math.max(g.ax - 8, 2), 6);
    ctx.strokeStyle = '#f4f5f9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W - 22, gy + 8); ctx.lineTo(W - 22, gy - 30); ctx.stroke();
    ctx.fillStyle = '#ff5a4f'; ctx.beginPath(); ctx.moveTo(W - 22, gy - 30); ctx.lineTo(W - 8, gy - 25); ctx.lineTo(W - 22, gy - 20); ctx.fill();
    ctx.strokeStyle = '#2b2e3c'; ctx.lineWidth = 2;
    for (var i = 0; i < 14; i++) { var x = ((i * 74 - g.scroll) % (W + 40) + (W + 40)) % (W + 40) - 20; ctx.beginPath(); ctx.moveTo(x, gy + 3); ctx.lineTo(x + 16, gy + 3); ctx.stroke(); }
    g.obst.forEach(function (o) {
      if (o.k === 'rock') { var r = im.rock; ctx.drawImage(r, o.x - r.width * S / 2, gy + 2 - r.height * S, r.width * S, r.height * S); }
      else { var bt = im['bat' + (Math.floor(g.t * 8) % 2)]; ctx.drawImage(bt, o.x - bt.width * S / 2, gy - batBottom - bt.height * S, bt.width * S, bt.height * S); }
    });
    var name = frameName(), spr = im[name], b = bb[name];
    var blink = g.hurt > 0 && Math.floor(g.hurt * 18) % 2 === 0;
    if (!blink) ctx.drawImage(spr, g.ax - axOff, gy + 3 - b[3] - g.y, spr.width * S, spr.height * S);
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
    overlay.hidden = started;
    if (ready && !running) draw();
  }

  // entrada
  function act(n) { if (!started) { started = true; updateRun(); } n(); }
  box.addEventListener('mouseenter', function () { hover = true; });
  box.addEventListener('mouseleave', function () { hover = false; });
  box.addEventListener('focusin', function () { focus = true; });
  box.addEventListener('focusout', function () { focus = false; });
  window.addEventListener('keydown', function (e) {
    if (!(hover || focus) || !visible) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); act(jump); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); act(roll); }
  });
  cv.addEventListener('pointerdown', function (e) { e.preventDefault(); box.focus({ preventScroll: true }); act(jump); });
  box.querySelector('[data-jump]').addEventListener('click', function () { act(jump); });
  box.querySelector('[data-roll]').addEventListener('click', function () { act(roll); });
  overlay.addEventListener('click', function () { started = true; updateRun(); });
  document.addEventListener('visibilitychange', updateRun);
  window.addEventListener('resize', function () { if (ready) resize(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { visible = e.isIntersecting; if (visible) load(); updateRun(); }); }, { threshold: 0.25 }).observe(box);
  } else { visible = true; load(); }
})();
