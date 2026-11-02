/* Gentle 2D petal dynamics. No state is persisted between page loads. */
(function (global) {
  'use strict';
  class PetalWorld {
    constructor(width, height, random = Math.random) {
      this.width = width; this.height = height; this.random = random;
      this.petals = []; this.base = []; this.time = 0; this.nextPetal = 0;
      this.limit = width < 600 ? 350 : 650;
    }
    spawn() {
      const r = this.random;
      if (this.petals.length >= this.limit) {
        const index = this.petals.findIndex(p => p.sleeping);
        if (index < 0) return;
        // Retain the compressed base surface when recycling a buried petal.
        const old = this.petals[index];
        this.base.push({ x: old.x / this.width, y: this.height - old.y, r: old.r, angle: old.angle, flatten: old.flatten, flutter: old.flutter });
        if (this.base.length > this.limit) this.base.shift();
        this.petals.splice(index, 1);
      }
      const radius = 2.6 + r() * 1.7;
      this.petals.push({ x: radius + r() * Math.max(0, this.width - radius * 2), y: -15 - r() * 35,
        vx: (r() - .5) * 8, vy: 8 + r() * 8, r: radius,
        angle: r() * Math.PI * 2, phase: r() * Math.PI * 2, spin: (r() - .5) * .9,
        restAngle: (r() - .5) * .45, grounded: false, sleeping: false,
        settle: 0, flatten: 0, flutter: .4 + r() * .6, age: 0 });
    }
    resize(width, height) {
      const scale = width / this.width;
      for (const p of this.petals) {
        const floorDistance = this.height - p.y;
        p.x = Math.max(p.r * 2, Math.min(width - p.r * 2, p.x * scale));
        p.y = p.grounded ? height - floorDistance : p.y * height / this.height;
      }
      this.width = width; this.height = height;
      this.limit = width < 600 ? 350 : 650;
    }
    support(p) {
      let surface = this.height - 1;
      // Thin overlapping layers, rather than circles that roll and bounce.
      const contact = (x, y, r) => {
        const halfWidth = r * 1.7;
        const distance = Math.abs(p.x - x);
        if (distance >= halfWidth + p.r * .65) return;
        const overlap = 1 - Math.min(1, distance / (halfWidth + p.r * .65));
        const top = y - r * (.4 + .35 * overlap);
        if (top >= p.y - p.r * 2 && top < surface) surface = top;
      };
      for (const q of this.petals) if (q !== p && q.sleeping) contact(q.x, q.y, q.r);
      for (const q of this.base) contact(q.x * this.width, this.height - q.y, q.r);
      return surface;
    }
    extent(p) {
      const width = p.r * 3.4 * p.flutter;
      const height = p.r * (4.1 - 2.7 * p.flatten);
      return Math.sqrt(Math.pow(Math.sin(p.angle) * width / 2, 2) + Math.pow(Math.cos(p.angle) * height / 2, 2));
    }
    step(dt) {
      this.time += dt; this.nextPetal -= dt;
      if (this.nextPetal <= 0) { this.spawn(); this.nextPetal = .9 + this.random() * .8; }
      const wind = Math.sin(this.time * .17) * 5 + Math.sin(this.time * .43) * 2;
      for (const p of this.petals) {
        p.age += dt;
        if (p.sleeping) continue;
        const surface = this.support(p);
        const distance = surface - p.y - this.extent(p);
        const approaching = Math.max(0, 1 - Math.max(0, distance) / 30);
        const landing = p.grounded ? 1 : approaching * approaching;
        // Feather into the landing pose before contact; never snap on a boolean.
        p.flatten += (landing - p.flatten) * (1 - Math.exp(-dt * 4));
        const flutterTarget = .4 + Math.abs(Math.cos(this.time * 1.6 + p.phase)) * .6;
        p.flutter += ((1 - p.flatten) * flutterTarget + p.flatten - p.flutter) * (1 - Math.exp(-dt * 6));
        p.angle += p.spin * dt * (1 - landing);
        const delta = Math.atan2(Math.sin(p.restAngle - p.angle), Math.cos(p.restAngle - p.angle));
        p.angle += delta * (1 - Math.exp(-dt * 4 * landing));
        if (!p.grounded) {
          p.vy += (42 - .035 * p.vy * Math.abs(p.vy)) * dt;
          p.vx += ((wind + Math.sin(this.time * 1.2 + p.phase) * 5) * (1 - landing) - p.vx) * .8 * dt;
          p.y += p.vy * dt;
        } else {
          p.vy = 0;
          p.vx *= Math.exp(-dt * 7);
        }
        p.x = Math.max(p.r * 2, Math.min(this.width - p.r * 2, p.x + p.vx * dt));
        const floor = this.support(p) - this.extent(p);
        if (p.grounded && floor > p.y + .6) {
          // Sliding off an edge resumes the fall instead of snapping downward.
          p.grounded = false; p.settle = 0;
        }
        if (p.y >= floor || p.grounded) {
          p.y = floor;
          p.grounded = true; p.vy = 0;
          p.vx *= Math.exp(-dt * 5);
          p.settle += dt;
          if (p.settle > 1.8 && Math.abs(p.vx) < .15 && Math.abs(delta) < .01) {
            // A settled petal keeps its exact pose until the viewport changes.
            p.sleeping = true;
          }
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
    const compressed = world.base.map(p => ({ ...p, x: p.x * world.width, y: world.height - p.y, age: 1 }));
    for (const p of [...compressed, ...world.petals]) {
      const width = p.r * 3.4, height = p.r * (4.1 - 2.7 * p.flatten);
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.scale(p.flutter, 1);
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
