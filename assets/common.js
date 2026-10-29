/* =====================================================================
   Campo de celdas Voronoi (fondo), con comportamiento de moho mucilaginoso:
   las celdas derivan muy despacio y se hinchan y se encienden de forma
   gradual alrededor de puntos atractores que aparecen al azar y emiten una
   ola suave. El cursor / el dedo crea un campo más leve a su alrededor.
   ===================================================================== */
(() => {
  const cv = document.getElementById('bg'), ctx = cv.getContext('2d');
  // Si el sistema pide menos movimiento, el fondo no se apaga: se mueve a menor velocidad. Quien quiera pararlo del todo usa el botón del pie.
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let off = false; try { off = localStorage.getItem('f3de-motion') === 'off'; } catch (e) {}
  const speed = calm ? .6 : 1;
  const ACC = [255, 74, 20];
  const F = { dim: .62, target: .62, t: 2.2, grow: 0, ripples: [], beacons: [], next: 1.6, px: 0, py: 0, tx: 0, ty: 0, act: 0, seen: -9 };
  let W, H, DPR, S = [], amp, G, gcols, grows, grid = [];
  const A = [], B = [];

  function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function init() {
    W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const cols = Math.max(8, Math.min(22, Math.round(W / 88))), cw = W / cols, rows = Math.max(5, Math.round(H / cw)), ch = H / rows, r = rng(7);
    S = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++)
      S.push({ bx: (i + .5 + (r() - .5) * .9) * cw, by: (j + .5 + (r() - .5) * .9) * ch, a: .03 + r() * .06, b: .03 + r() * .06, p: r() * 6.28, q: r() * 6.28, z: r() * 6.28, sz: .7 + r() * .3, inf: 0, x: 0, y: 0, poly: null, cx: 0, cy: 0 });
    amp = Math.min(cw, ch) * .38; G = Math.max(cw, ch); gcols = Math.ceil(W / G) + 1; grows = Math.ceil(H / G) + 1;
    grid = Array.from({ length: gcols * grows }, () => []);
    F.px = F.tx = W / 2; F.py = F.ty = H / 2; F.cells = S;
  }

  function clip(src, nx, ny, d, out) {
    out.length = 0; const n = src.length / 2;
    for (let i = 0; i < n; i++) {
      const ax = src[2 * i], ay = src[2 * i + 1], k = (i + 1) % n, bx = src[2 * k], by = src[2 * k + 1];
      const da = nx * ax + ny * ay - d, db = nx * bx + ny * by - d;
      if (da <= 0) out.push(ax, ay);
      if ((da < 0 && db > 0) || (db < 0 && da > 0)) { const u = da / (da - db); out.push(ax + (bx - ax) * u, ay + (by - ay) * u); }
    }
    return out;
  }

  function build(t) {
    for (const g of grid) g.length = 0;
    for (let i = 0; i < S.length; i++) {
      const s = S[i];
      s.x = s.bx + amp * Math.sin(s.a * t + s.p); s.y = s.by + amp * Math.sin(s.b * t + s.q);
      const gx = Math.min(gcols - 1, Math.max(0, s.x / G | 0)), gy = Math.min(grows - 1, Math.max(0, s.y / G | 0));
      s.gx = gx; s.gy = gy; grid[gy * gcols + gx].push(i);
    }
    for (let i = 0; i < S.length; i++) {
      const s = S[i], cand = [];
      for (let y = s.gy - 2; y <= s.gy + 2; y++) for (let x = s.gx - 2; x <= s.gx + 2; x++)
        if (x >= 0 && y >= 0 && x < gcols && y < grows) for (const j of grid[y * gcols + x]) if (j !== i) cand.push(j);
      cand.sort((p, q) => ((S[p].x - s.x) ** 2 + (S[p].y - s.y) ** 2) - ((S[q].x - s.x) ** 2 + (S[q].y - s.y) ** 2));
      let cur = A; cur.length = 0; cur.push(0, 0, W, 0, W, H, 0, H); let oth = B;
      for (const j of cand) {
        const o = S[j], dx = o.x - s.x, dy = o.y - s.y, dist = Math.hypot(dx, dy);
        let mr = 0; for (let k = 0; k < cur.length; k += 2) mr = Math.max(mr, Math.hypot(cur[k] - s.x, cur[k + 1] - s.y));
        if (dist / 2 > mr) break;
        clip(cur, dx, dy, (o.x * o.x + o.y * o.y - s.x * s.x - s.y * s.y) / 2, oth);
        const tmp = cur; cur = oth; oth = tmp;
        if (cur.length < 6) break;
      }
      if (cur.length < 6) { s.poly = null; continue; }
      s.poly = cur.slice(); let cx = 0, cy = 0; const n = s.poly.length / 2;
      for (let k = 0; k < s.poly.length; k += 2) { cx += s.poly[k]; cy += s.poly[k + 1]; }
      s.cx = cx / n; s.cy = cy / n;
    }
  }

  const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  const bell = k => { k = Math.min(1, Math.max(0, k)); const v = Math.sin(Math.PI * k); return v * v; };   // sube y baja sin saltos

  // Atractores al azar: aparecen, crecen despacio, emiten una ola suave y se desvanecen
  function spawn(x, y, life) {
    F.beacons.push({ x: x == null ? W * (.12 + Math.random() * .76) : x, y: y == null ? H * (.12 + Math.random() * .76) : y, t0: F.t, life: life || 12 });
  }

  function draw(t, dt) {
    ctx.clearRect(0, 0, W, H);
    const R = .15 * W + 60, Rp = Math.max(.15 * W, 190), dim = F.dim, grow = ease(F.grow);
    F.beacons = F.beacons.filter(b => t - b.t0 < b.life);
    F.ripples = F.ripples.filter(r => t - r.t0 < r.life);
    ctx.lineJoin = 'round';
    // dos atractores errantes muy lentos (siempre presentes, su fuerza respira)
    const wand = [[W * (.5 + .36 * Math.sin(.07 * t)), H * (.5 + .32 * Math.sin(.11 * t + 1)), .13 + .08 * Math.sin(.22 * t)],
                  [W * (.5 + .3 * Math.sin(.05 * t + 2.3)), H * (.5 + .34 * Math.cos(.09 * t)), .13 + .08 * Math.sin(.19 * t + 2)]];
    const kUp = 1 - Math.exp(-dt / .65), kDn = 1 - Math.exp(-dt / 2.4);   // llegar despacio, irse más despacio aún
    for (const s of S) {
      if (!s.poly) continue;
      let target = 0;
      for (const [ax, ay, w] of wand) target += w * Math.exp(-((Math.hypot(s.cx - ax, s.cy - ay) / R) ** 2));
      for (const b of F.beacons) {
        const age = t - b.t0, env = bell(age / b.life), d = Math.hypot(s.cx - b.x, s.cy - b.y);
        target += .45 * env * Math.exp(-((d / (R * .8)) ** 2));
        const ring = (age * .06 * W + 20), wd = .1 * W + 40;                  // ola ancha y lenta alrededor del punto
        target += .2 * env * Math.exp(-(((d - ring) / wd) ** 2));
      }
      for (const r of F.ripples) { const age = t - r.t0, d = Math.hypot(s.cx - r.x, s.cy - r.y); target += r.k * (1 - age / r.life) * Math.exp(-(((d - age * .1 * W) / (.12 * W)) ** 2)); }
      if (F.act > .01) target += 1.2 * F.act * Math.exp(-((Math.hypot(s.cx - F.px, s.cy - F.py) / Rp) ** 2));   // cursor / dedo: campo leve
      target = Math.min(target, 1.1);
      s.inf += (target - s.inf) * (target > s.inf ? kUp : kDn);
      const i1 = Math.pow(Math.min(s.inf, 1), 1.4);
      const sc = (.3 + .55 * i1 * s.sz + .015 * Math.sin(.5 * t + s.z)) * grow;
      if (sc < .02) continue;
      const P = s.poly, n = P.length / 2, pts = new Array(P.length);
      for (let k = 0; k < n; k++) {      // contorno que se ondula muy despacio, como una membrana
        pts[2 * k] = s.cx + (P[2 * k] - s.cx) * sc + 1.6 * Math.sin(.45 * t + k * 1.9 + s.z);
        pts[2 * k + 1] = s.cy + (P[2 * k + 1] - s.cy) * sc + 1.6 * Math.cos(.4 * t + k * 2.3 + s.z);
      }
      ctx.beginPath();
      ctx.moveTo((pts[2 * n - 2] + pts[0]) / 2, (pts[2 * n - 1] + pts[1]) / 2);
      for (let k = 0; k < n; k++) { const k2 = (k + 1) % n; ctx.quadraticCurveTo(pts[2 * k], pts[2 * k + 1], (pts[2 * k] + pts[2 * k2]) / 2, (pts[2 * k + 1] + pts[2 * k2 + 1]) / 2); }
      ctx.closePath();
      ctx.fillStyle = `rgba(${ACC[0]},${ACC[1]},${ACC[2]},${(.025 + .15 * i1) * dim})`; ctx.fill();
      ctx.strokeStyle = `rgba(255,${Math.round(90 + 70 * i1)},${Math.round(50 + 60 * i1)},${(.08 + .28 * i1) * dim})`;
      ctx.lineWidth = 1 + i1 * .6; ctx.stroke();
    }
  }

  F.pulse = (x, y, k = .5) => F.ripples.push({ t0: F.t, x, y, k: Math.min(k, .6) * .6, life: 6 });
  F.spawn = spawn;
  window.__field = F;

  let prev = performance.now(), raf = 0, bacc = 1;
  function frame(now) {
    if (off) return;
    const rdt = Math.min(.05, (now - prev) / 1000), dt = rdt * speed; prev = now;
    F.t += dt; F.grow = Math.min(1, F.grow + dt / 3);
    F.dim += (F.target - F.dim) * (1 - Math.exp(-dt * 1.2));
    const k = 1 - Math.exp(-rdt * 7); F.px += (F.tx - F.px) * k; F.py += (F.ty - F.py) * k;
    { const on = F.t - F.seen < 2.4; F.act += ((on ? 1 : 0) - F.act) * (1 - Math.exp(-rdt * (on ? 6 : 1.1))); }
    if (F.t > F.next) { spawn(); F.next = F.t + 6 + Math.random() * 4; }
    bacc += rdt; if (bacc > 1 / 24) { build(F.t); bacc = 0; }
    draw(F.t, dt);
    raf = requestAnimationFrame(frame);
  }

  function point(x, y) { F.tx = x; F.ty = y; F.seen = F.t; }
  addEventListener('mousemove', e => point(e.clientX, e.clientY), { passive: true });
  addEventListener('touchstart', e => { const t = e.touches[0]; point(t.clientX, t.clientY); F.pulse(t.clientX, t.clientY, .45); }, { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; point(t.clientX, t.clientY); }, { passive: true });
  addEventListener('mousedown', e => { point(e.clientX, e.clientY); F.pulse(e.clientX, e.clientY, .5); });
  document.addEventListener('mouseleave', () => { F.seen = -9; });
  addEventListener('resize', () => { init(); build(F.t); });
  init();
  function still() { F.grow = 1; if (F.t < 3) F.t = 3; build(F.t); draw(F.t, 1); }
  window.__setMotion = on => {
    off = !on; try { localStorage.setItem('f3de-motion', on ? 'on' : 'off'); } catch (e) {}
    cancelAnimationFrame(raf);
    if (on) { prev = performance.now(); raf = requestAnimationFrame(frame); } else still();
    syncBtn();
  };
  function syncBtn() { const b = document.getElementById('motionBtn'); if (b) { b.setAttribute('aria-pressed', String(!off)); b.textContent = (window.t || (x => x))(off ? 'Fondo animado: no' : 'Fondo animado: sí'); } }
  window.__syncMotionBtn = syncBtn;
  const mb = document.getElementById('motionBtn'); if (mb) mb.addEventListener('click', () => window.__setMotion(off));
  syncBtn();
  if (off) still(); else raf = requestAnimationFrame(frame);
})();

/* ============================ nav ============================ */
(() => {
  const nav = document.getElementById('nav'), menu = document.getElementById('menu'), burger = document.getElementById('burger');
  const links = [...menu.querySelectorAll('a.l')], secs = links.map(a => { const h = a.getAttribute('href'); return h.startsWith('#') ? document.querySelector(h) : null; });
  const onScroll = () => {
    nav.classList.toggle('solid', scrollY > 30);
    let cur = 0; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * .4) cur = i; });
    links.forEach((a, i) => a.classList.toggle('on', i === cur && scrollY > 200));
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  burger.addEventListener('click', () => { const o = menu.classList.toggle('open'); burger.classList.toggle('open', o); burger.setAttribute('aria-expanded', o); });
  menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.classList.remove('open'); burger.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });
})();


(() => {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  window.__observe = el => io.observe(el);
})();

/* ============================ visor de imágenes ============================ */
(() => {
  // Visor de imágenes (certificados, afiches y galería) con navegación dentro de cada grupo
  const lb = document.getElementById('lb');
  let grp = [], gi = 0;
  const show = () => {
    const f = grp[gi], img = f.querySelector('img'), label = f.dataset.label || '';
    lb.innerHTML = `<img src="${img.src}" alt="${img.alt || ''}"><div class="cp">${label}${grp.length > 1 ? ` · ${gi + 1}/${grp.length}` : ''}</div>` +
      (grp.length > 1 ? '<button class="nv p" aria-label="Anterior">‹</button><button class="nv n" aria-label="Siguiente">›</button>' : '');
    lb.classList.add('on');
  };
  const step = d => { gi = (gi + d + grp.length) % grp.length; show(); };
  document.querySelectorAll('.frame,.cthumb').forEach(f => f.addEventListener('click', () => {
    grp = [...document.querySelectorAll(`[data-group="${f.dataset.group}"]`)].filter(x => x.querySelector('img'));
    gi = Math.max(0, grp.indexOf(f)); if (f.querySelector('img')) show();
  }));
  lb.addEventListener('click', e => {
    if (e.target.classList.contains('nv')) { e.stopPropagation(); step(e.target.classList.contains('p') ? -1 : 1); return; }
    lb.classList.remove('on');
  });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') lb.classList.remove('on');
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });
})();
