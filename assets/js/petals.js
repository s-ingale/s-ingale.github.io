/* Gentle 2D petal dynamics. No state is persisted between page loads. */
(function (global) {
  'use strict';
  class PetalWorld {
    constructor(width, height, random = Math.random) {
      this.width = width; this.height = height; this.random = random;
      this.petals = []; this.time = 0; this.nextPetal = 0;
      this.limit = width < 600 ? 350 : 650;
    }
    spawn() {
      const r = this.random;
      if (this.petals.length >= this.limit) {
        // Recycle the oldest bottom petal; the pile above settles into its space.
        const index = this.petals.findIndex(p => p.y > this.height - 65);
        if (index < 0) return;
        this.petals.splice(index, 1);
      }
      const radius = 2.6 + r() * 1.7;
      this.petals.push({ x: radius + r() * Math.max(0, this.width - radius * 2), y: -15 - r() * 35,
        vx: (r() - .5) * 8, vy: 8 + r() * 8, r: radius,
        angle: r() * Math.PI * 2, phase: r() * Math.PI * 2, spin: (r() - .5) * .9,
        restAngle: (r() - .5) * .7, grounded: false, age: 0 });
    }
    resize(width, height) {
      const scale = width / this.width;
      for (const p of this.petals) {
        const floorDistance = this.height - p.y;
        p.x = Math.max(p.r, Math.min(width - p.r, p.x * scale));
        p.y = floorDistance < 80 ? height - floorDistance : p.y * height / this.height;
      }
      this.width = width; this.height = height;
      this.limit = width < 600 ? 350 : 650;
    }
    step(dt) {
      this.time += dt; this.nextPetal -= dt;
      if (this.nextPetal <= 0) { this.spawn(); this.nextPetal = .9 + this.random() * .8; }
      const wind = Math.sin(this.time * .17) * 5 + Math.sin(this.time * .43) * 2;
      for (const p of this.petals) {
        p.age += dt;
        const nearFloor = p.grounded || p.y > this.height - 45;
        p.grounded = false;
        // Gravity and quadratic air resistance produce a slow terminal descent.
        p.vy += (42 - .035 * p.vy * Math.abs(p.vy)) * dt;
        p.vx += ((nearFloor ? 0 : wind + Math.sin(this.time * 1.2 + p.phase) * 5) - p.vx) * .8 * dt;
        if (nearFloor) p.vx *= Math.exp(-5 * dt);
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.angle += p.spin * dt;
      }
      // Spatial buckets keep the collision work local as the pile grows.
      for (let pass = 0; pass < 5; pass++) {
        const buckets = new Map(); const cell = 12;
        for (let i = 0; i < this.petals.length; i++) {
          const p = this.petals[i];
          const gx = Math.floor(p.x / cell), gy = Math.floor(p.y / cell);
          for (let xx = gx - 1; xx <= gx + 1; xx++) for (let yy = gy - 1; yy <= gy + 1; yy++) {
            const neighbors = buckets.get(xx + ',' + yy);
            if (!neighbors) continue;
            for (const j of neighbors) {
              const q = this.petals[j];
              let dx = p.x - q.x, dy = p.y - q.y;
              const contact = p.r + q.r;
              const squared = dx * dx + dy * dy;
              if (squared >= contact * contact) continue;
              const distance = Math.sqrt(squared);
              const nx = distance > .0001 ? dx / distance : 1;
              const ny = distance > .0001 ? dy / distance : 0;
              const overlap = (contact - distance) * .5;
              p.x += nx * overlap; p.y += ny * overlap;
              q.x -= nx * overlap; q.y -= ny * overlap;
              const relative = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
              if (relative < 0) {
                const impulse = -relative * .51;
                p.vx += impulse * nx; p.vy += impulse * ny;
                q.vx -= impulse * nx; q.vy -= impulse * ny;
              }
              // Friction dissipates sideways motion so contacts settle softly.
              p.vx *= .86; q.vx *= .86;
              if (ny < -.35) p.grounded = true;
              if (ny > .35) q.grounded = true;
            }
          }
          if (p.y > this.height - p.r) {
            p.y = this.height - p.r;
            if (p.vy > 0) p.vy = p.vy > 7 ? -p.vy * .07 : 0;
            p.vx *= .72; p.grounded = true;
          }
          if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx) * .15; }
          if (p.x > this.width - p.r) { p.x = this.width - p.r; p.vx = -Math.abs(p.vx) * .15; }
          const key = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell);
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push(i);
        }
      }
    }
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = PetalWorld; return; }
  const canvas = document.querySelector('[data-petal-physics]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sprite = new Image();
  const script = document.currentScript;
  sprite.src = new URL('../img/falling-petal.svg', script.src).href;
  let world, frame = 0, previous = 0, accumulator = 0, ratio = 1;
  function resize() {
    const width = window.innerWidth, height = window.innerHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (world) world.resize(width, height); else world = new PetalWorld(width, height);
  }
  function draw() {
    ctx.clearRect(0, 0, world.width, world.height);
    if (!sprite.complete || !sprite.naturalWidth) return;
    for (const p of world.petals) {
      const resting = p.grounded && Math.abs(p.vy) < 8;
      const flutter = Math.cos(world.time * 1.6 + p.phase);
      const width = p.r * 3.4, height = resting ? p.r * 1.4 : p.r * 4.1;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.rotate(resting ? p.restAngle : p.angle + Math.sin(world.time + p.phase) * .3);
      ctx.scale(resting ? 1 : .4 + Math.abs(flutter) * .6, 1);
      ctx.globalAlpha = .88 * Math.min(1, p.age / .7);
      ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
      ctx.restore();
    }
  }
  function tick(now) {
    const elapsed = previous ? Math.min((now - previous) / 1000, .05) : 0;
    previous = now; accumulator += elapsed;
    while (accumulator >= 1 / 60) { world.step(1 / 60); accumulator -= 1 / 60; }
    draw(); frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); previous = 0; accumulator = 0;
    if (!document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, world.width, world.height);
  }
  resize(); sync();
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
})(globalThis);
