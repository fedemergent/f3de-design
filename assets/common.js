/* =====================================================================
   Campo de atractores Voronoi (fondo). Misma idea que el de TATU:
   celdas cuyas semillas derivan lentamente y que se hinchan y se
   encienden cerca de atractores: dos autónomos, el cursor / el dedo y
   las ondas que dejan los clics y toques.
   ===================================================================== */
(() => {
  const cv = document.getElementById('bg'), ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches && !/motion/.test(location.search);   // ?motion fuerza la animación (pruebas)
  const ACC = [255, 74, 20];
  const F = { dim: 1, target: 1, t: 2.2, grow: 0, ripples: [], px: 0, py: 0, tx: 0, ty: 0, act: 0, seen: -9, last: 0 };
  let W, H, DPR, S = [], amp, G, gcols, grows, grid = [];
  const A = [], B = [];

  function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function init() {
    W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const cols = Math.max(6, Math.min(15, Math.round(W / 118))), cw = W / cols, rows = Math.max(4, Math.round(H / cw)), ch = H / rows, r = rng(7);
    S = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++)
      S.push({ bx: (i + .5 + (r() - .5) * .9) * cw, by: (j + .5 + (r() - .5) * .9) * ch, a: .1 + r() * .2, b: .1 + r() * .2, p: r() * 6.28, q: r() * 6.28, z: r() * 6.28, sz: .72 + r() * .28, x: 0, y: 0, poly: null, cx: 0, cy: 0 });
    amp = Math.min(cw, ch) * .3; G = Math.max(cw, ch); gcols = Math.ceil(W / G) + 1; grows = Math.ceil(H / G) + 1;
    grid = Array.from({ length: gcols * grows }, () => []);
    F.px = F.tx = W / 2; F.py = F.ty = H / 2;
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

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const R = .2 * W, Rp = Math.max(.13 * W, 150), dim = F.dim, grow = ease(F.grow);
    const att = [[W * (.5 + .38 * Math.sin(.55 * t)), H * (.5 + .34 * Math.sin(.83 * t + 1))], [W * (.5 + .3 * Math.sin(.41 * t + 2.3)), H * (.5 + .38 * Math.cos(.67 * t))]];
    F.ripples = F.ripples.filter(r => t - r.t0 < 2.4);
    ctx.lineJoin = 'round';
    for (const s of S) {
      if (!s.poly) continue;
      let infl = 0;
      for (const [ax, ay] of att) infl += .55 * Math.exp(-((Math.hypot(s.cx - ax, s.cy - ay) / R) ** 2));
      if (F.act > .01) infl += 1.1 * F.act * Math.exp(-((Math.hypot(s.cx - F.px, s.cy - F.py) / Rp) ** 2));
      for (const r of F.ripples) { const age = t - r.t0; infl += r.k * Math.exp(-(((Math.hypot(s.cx - r.x, s.cy - r.y) - age * .42 * W) / (.06 * W)) ** 2)) * (1 - age / 2.4); }
      infl = Math.min(infl, 1.35);
      const sc = (.13 + .78 * Math.min(infl, 1) * s.sz + .03 * Math.sin(1.4 * t + s.z)) * grow;
      if (sc < .02) continue;
      const P = s.poly, n = P.length / 2, pts = new Array(P.length);
      for (let k = 0; k < n; k++) {
        pts[2 * k] = s.cx + (P[2 * k] - s.cx) * sc + .9 * sc * Math.sin(2.4 * t + k * 1.9);
        pts[2 * k + 1] = s.cy + (P[2 * k + 1] - s.cy) * sc + .9 * sc * Math.cos(2.1 * t + k * 2.3);
      }
      ctx.beginPath();
      ctx.moveTo((pts[2 * n - 2] + pts[0]) / 2, (pts[2 * n - 1] + pts[1]) / 2);
      for (let k = 0; k < n; k++) { const k2 = (k + 1) % n; ctx.quadraticCurveTo(pts[2 * k], pts[2 * k + 1], (pts[2 * k] + pts[2 * k2]) / 2, (pts[2 * k + 1] + pts[2 * k2 + 1]) / 2); }
      ctx.closePath();
      const i1 = Math.min(infl, 1);
      ctx.fillStyle = `rgba(${ACC[0]},${ACC[1]},${ACC[2]},${(.012 + .24 * i1) * dim})`; ctx.fill();
      ctx.strokeStyle = `rgba(${255},${Math.round(90 + 80 * i1)},${Math.round(50 + 70 * i1)},${(.07 + .55 * i1) * dim})`;
      ctx.lineWidth = 1 + i1 * .8; ctx.stroke();
    }
  }

  F.pulse = (x, y, k = .9) => F.ripples.push({ t0: F.t, x, y, k });
  window.__field = F;

  let prev = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    F.t += dt; F.grow = Math.min(1, F.grow + dt / 2.2);
    F.dim += (F.target - F.dim) * (1 - Math.exp(-dt * 1.6));
    const k = 1 - Math.exp(-dt * 9); F.px += (F.tx - F.px) * k; F.py += (F.ty - F.py) * k;
    F.act += ((F.t - F.seen < 1.8 ? 1 : 0) - F.act) * (1 - Math.exp(-dt * 3));
    build(F.t); draw(F.t);
    requestAnimationFrame(frame);
  }

  function point(x, y) { F.tx = x; F.ty = y; F.seen = F.t; }
  addEventListener('mousemove', e => point(e.clientX, e.clientY), { passive: true });
  addEventListener('touchstart', e => { const t = e.touches[0]; point(t.clientX, t.clientY); F.pulse(t.clientX, t.clientY, .7); }, { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; point(t.clientX, t.clientY); }, { passive: true });
  addEventListener('mousedown', e => { point(e.clientX, e.clientY); F.pulse(e.clientX, e.clientY, .8); });
  document.addEventListener('mouseleave', () => { F.seen = -9; });
  addEventListener('resize', () => { init(); });
  init();
  if (reduce) { F.grow = 1; F.t = 3; build(F.t); draw(F.t); } else requestAnimationFrame(frame);
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
