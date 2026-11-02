/* Juego del tatú corredor (franja bajo la sección de plugins).
   El tatú cruza la página de izquierda a derecha. W / ↑ salta las piedras; S / ↓ lo enrolla en bola y rueda para pasar bajo los murciélagos.
   3 intentos (estrellas) · 5 golpes por intento. Corre solo mientras la franja se ve en pantalla y se detiene al salir de ella o al cambiar de pestaña. */
(function () {
  var box = document.getElementById('tatuGame');
  if (!box) return;
  var cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  var starsEl = box.querySelectorAll('.tg-star'), pipsEl = box.querySelectorAll('.tg-pip');
  var okEl = box.querySelector('[data-ok]'), hpEl = box.querySelector('[data-hp]');
  var msg = box.querySelector('.tg-msg'), msgT = msg.querySelector('[data-msg]'), msgS = msg.querySelector('[data-sub]'), msgB = msg.querySelector('[data-again]');
  var T = function (s) { return window.t ? window.t(s) : s; };
  var BASE = 'assets/tatu-game/', S = 0.5, H = 160, LAP = 24, SPEED = 150, JUMP_T = 0.7, ROLL_T = 1.0, MAXHP = 5, LIVES0 = 3;
  var meta = null, im = {}, ready = false, loading = false;
  var calm = false; try { calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var visible = false, running = false, hover = false, started = !calm;
  var W = 600, dpr = 1, last = 0, raf = 0, lives = LIVES0;
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
    var f = meta.frames;
    Object.keys(f).forEach(function (n) { bb[n] = f[n].bbox.map(function (v) { return v * S; }); });
    axOff = meta.anchor_x * S;
    var walkH = 0; for (var k = 0; k < meta.n_walk; k++) walkH = Math.max(walkH, bb['walk' + k][3] - bb['walk' + k][1]);
    var mid = Math.floor(meta.n_roll / 2), ballH = 0;
    for (var j = mid - 2; j < mid + 2; j++) { var b = bb['roll' + (j < 10 ? '0' : '') + j]; ballH = Math.max(ballH, b[3] - b[1]); }
    batBottom = ballH * 1.16 + 3;
    apex = walkH * 0.62; v0 = 4 * apex / JUMP_T; grav = 8 * apex / (JUMP_T * JUMP_T);
    ready = true; resize(); newRun(); updateRun();
  }

  /* ---------- estado ---------- */
  function newRun() {
    g = { state: 'run', t: 0, y: 0, vy: 0, jt: null, rt: null, hurt: 0, obst: [], next: 380, ok: 0, hp: MAXHP, seed: 7, ax: 40, scroll: 0, fall: 0, spin: 0, parts: [] };
    msg.hidden = true; hud(); draw();
  }
  function rnd() { g.seed = (g.seed * 16807) % 2147483647; return (g.seed - 1) / 2147483646; }

  function hud() {
    for (var i = 0; i < starsEl.length; i++) starsEl[i].classList.toggle('off', i >= lives);
    for (var k = 0; k < pipsEl.length; k++) pipsEl[k].classList.toggle('off', k >= g.hp);
    okEl.textContent = g.ok; hpEl.textContent = g.hp;
  }

  function show(title, sub, btn) {
    msgT.textContent = T(title); msgS.textContent = sub ? sub : ''; msgB.textContent = btn ? T(btn) : ''; msgB.hidden = !btn; msg.hidden = false;
  }

  function die() {
    g.state = 'dead'; g.vy = 330; g.fall = 0; lives--; hud();
  }
  function afterDeath() {
    if (lives > 0) {
      var s = lives === 1 ? T('Te queda 1 intento') : T('Te quedan') + ' ' + lives + ' ' + T('intentos');
      show('¡Auch! Intenta de nuevo', s, 'Reintentar'); g.state = 'retry';
    } else {
      show('GAME OVER', T('Recarga la página para volver a jugar'), null); g.state = 'over';
    }
  }
  function win() {
    g.state = 'win'; g.ax = W - 60;
    for (var i = 0; i < 40; i++) g.parts.push({ x: W - 60 + (rnd() - 0.5) * 60, y: H - 60, vx: (rnd() - 0.5) * 220, vy: -120 - rnd() * 220, c: ['#e53935', '#ffdd57', '#f4f5f9', '#ff5a4f'][i % 4], life: 1.6 });
    show('¡Llegaste a la meta!', T('Esquivaste') + ' ' + g.ok + ' ' + T('obstáculos'), 'Correr otra vez');
  }

  /* ---------- entrada ---------- */
  function jump() { if (g.state === 'run' && g.y <= 0.01 && g.rt === null) { g.vy = v0; g.jt = 0; } }
  function roll() { if (g.state === 'run' && g.rt === null && g.y <= 0.01) g.rt = 0; }
  function again() { if (g.state === 'retry' || g.state === 'win') newRun(); }
  function act(fn) {
    if (!ready) return;
    if (!started) { started = true; updateRun(); }
    if (g.state === 'retry' || g.state === 'win') { again(); return; }
    fn();
  }
  function typing(e) { var t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
  window.addEventListener('keydown', function (e) {
    if (!visible || !ready || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k === 'w' || k === 'W') { e.preventDefault(); act(jump); }
    else if (k === 's' || k === 'S') { e.preventDefault(); act(roll); }
    else if ((k === 'ArrowUp' || k === 'ArrowDown') && hover) { e.preventDefault(); act(k === 'ArrowUp' ? jump : roll); }
  });
  box.addEventListener('mouseenter', function () { hover = true; });
  box.addEventListener('mouseleave', function () { hover = false; });
  cv.addEventListener('pointerdown', function (e) { e.preventDefault(); act(jump); });
  box.querySelector('[data-jump]').addEventListener('click', function () { act(jump); });
  box.querySelector('[data-roll]').addEventListener('click', function () { act(roll); });
  msgB.addEventListener('click', function () { act(function () {}); });
  box.querySelector('.tg-start').addEventListener('click', function () { started = true; box.querySelector('.tg-start').hidden = true; updateRun(); });

  /* ---------- bucle ---------- */
  function resize() {
    var r = cv.getBoundingClientRect(); W = Math.max(Math.round(r.width), 240);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (g) draw();
  }

  function frameName() {
    if (g.rt !== null) return 'roll' + ('0' + Math.min(Math.floor(g.rt / ROLL_T * meta.n_roll), meta.n_roll - 1)).slice(-2);
    if (g.y > 0 || g.state === 'dead') return 'jump' + Math.min(Math.floor((g.jt || 0) / JUMP_T * meta.n_jump), meta.n_jump - 1);
    return 'walk' + (Math.floor(g.t * 3 * meta.n_walk) % meta.n_walk);
  }

  function step(dt) {
    if (g.state === 'dead') {                       // como en Mario: salta un poco y cae por debajo del suelo; el paisaje se detiene
      g.vy -= 900 * dt; g.fall += g.vy * dt; g.spin += dt * 4;
      if (g.fall < -H - 40) afterDeath();
      return;
    }
    if (g.state === 'win') {
      g.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.life -= dt; });
      g.parts = g.parts.filter(function (p) { return p.life > 0; });
      g.t += dt;
      return;
    }
    if (g.state !== 'run') return;
    g.t += dt;
    var p = Math.min(g.t / LAP, 1);
    var target = 40 + p * (W - 40 - 70);
    g.ax += (target - g.ax) * Math.min(dt * 4, 1);
    if (g.y > 0 || g.vy > 0) {
      g.vy -= grav * dt; g.y += g.vy * dt; if (g.jt !== null) g.jt += dt;
      if (g.y <= 0) { g.y = 0; g.vy = 0; g.jt = null; }
    }
    if (g.rt !== null) { g.rt += dt; if (g.rt >= ROLL_T) g.rt = null; }
    g.scroll += SPEED * dt;
    g.obst.forEach(function (o) { o.x -= SPEED * dt; });
    g.next -= SPEED * dt;
    if (g.next <= 0 && p < 0.93 && g.ax < W - 120) { g.obst.push({ x: W + 20, k: rnd() < 0.38 ? 'bat' : 'rock', s: null }); g.next = 230 + rnd() * 130; }
    else if (g.next <= 0) g.next = 120;
    var name = frameName(), b = bb[name], w = b[2] - b[0], h = b[3] - b[1], left = g.ax - axOff;
    var body = [left + b[0] + w * 0.14, left + b[2] - w * 0.14, g.y + h * 0.06, g.y + h * 0.9];
    g.obst.forEach(function (o) {
      var r = o.k === 'rock' ? bb.rock : bb.bat0, bw = r[2] - r[0], bh = r[3] - r[1];
      var hb = o.k === 'rock' ? [o.x - bw * 0.4, o.x + bw * 0.4, 0, bh * 0.85] : [o.x - bw * 0.4, o.x + bw * 0.4, batBottom, batBottom + bh * 0.8];
      if (o.s === null && hb[0] < body[1] && hb[1] > body[0] && hb[2] < body[3] && hb[3] > body[2]) {
        o.s = 'hit'; g.hp--; g.hurt = 0.7; hud();
        if (g.hp <= 0) die();
      } else if (o.s === null && o.x + 12 < body[0]) { o.s = 'ok'; g.ok++; hud(); }
    });
    g.obst = g.obst.filter(function (o) { return o.x > -50; });
    if (g.hurt > 0) g.hurt -= dt;
    if (g.state === 'run' && p >= 1 && Math.abs(g.ax - target) < 6) win();
  }

  function draw() {
    if (!ready || !g) return;
    var gy = H - 28;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#2b2e3c'; ctx.fillRect(8, gy + 6, W - 16, 6);
    ctx.fillStyle = '#e53935'; ctx.fillRect(8, gy + 6, Math.max(g.ax - 8, 2), 6);
    ctx.strokeStyle = '#f4f5f9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W - 34, gy + 8); ctx.lineTo(W - 34, gy - 34); ctx.stroke();
    ctx.fillStyle = '#ff5a4f'; ctx.beginPath(); ctx.moveTo(W - 34, gy - 34); ctx.lineTo(W - 16, gy - 28); ctx.lineTo(W - 34, gy - 22); ctx.fill();
    ctx.strokeStyle = '#2b2e3c'; ctx.lineWidth = 2;
    var n = Math.ceil(W / 74) + 2;
    for (var i = 0; i < n; i++) { var x = (((i * 74 - g.scroll) % (n * 74)) + n * 74) % (n * 74) - 40; ctx.beginPath(); ctx.moveTo(x, gy + 3); ctx.lineTo(x + 16, gy + 3); ctx.stroke(); }
    g.obst.forEach(function (o) {
      if (o.k === 'rock') { var r = im.rock; ctx.drawImage(r, o.x - r.width * S / 2, gy + 2 - r.height * S, r.width * S, r.height * S); }
      else { var bt = im['bat' + (Math.floor(g.t * 8) % 2)]; ctx.drawImage(bt, o.x - bt.width * S / 2, gy - batBottom - bt.height * S, bt.width * S, bt.height * S); }
    });
    var name = frameName(), spr = im[name], b = bb[name];
    var blink = g.hurt > 0 && g.state === 'run' && Math.floor(g.hurt * 18) % 2 === 0;
    if (!blink) {
      if (g.state === 'dead') {
        ctx.save(); ctx.translate(g.ax - axOff + spr.width * S / 2, gy + 3 - b[3] - g.fall - spr.height * S / 2 + 0); ctx.rotate(g.spin);
        ctx.drawImage(spr, -spr.width * S / 2, -spr.height * S / 2, spr.width * S, spr.height * S); ctx.restore();
      } else ctx.drawImage(spr, g.ax - axOff, gy + 3 - b[3] - g.y, spr.width * S, spr.height * S);
    }
    g.parts.forEach(function (p) { ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 4, 4); });
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
