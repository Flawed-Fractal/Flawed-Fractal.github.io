(() => {
  "use strict";

  const hero = document.querySelector(".hero-reactive");
  const canvas = hero?.querySelector(".hero-canvas");
  const prefersStillness = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

  if (!hero || !canvas || prefersStillness || !hasFinePointer) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const GRID = 30;
  const GLOW_RADIUS = 180;
  const TRAIL_LIFETIME = 680;
  const TRAIL_SPACING = 9;
  const MAX_TRAIL_POINTS = 78;
  const accent = "236, 120, 79";

  let width = 0;
  let height = 0;
  let density = 1;
  let frame = 0;
  let visibleStrength = 0;
  let lastMovement = 0;
  let hasLanded = false;
  let previousPointer = null;

  const target = { x: 0, y: 0, inside: false };
  const trail = [];
  const pulses = [];

  function resize() {
    const bounds = hero.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    density = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(density, 0, 0, density, 0, 0);
  }

  function wake() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function locate(event) {
    const bounds = hero.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  }

  function appendTrail(from, to, now) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    if (distance < 1.5) return;

    const steps = Math.min(32, Math.max(1, Math.ceil(distance / TRAIL_SPACING)));
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      trail.push({
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
        born: now - (steps - step) * 2,
      });
    }

    if (trail.length > MAX_TRAIL_POINTS) {
      trail.splice(0, trail.length - MAX_TRAIL_POINTS);
    }
  }

  hero.addEventListener("pointerenter", (event) => {
    const point = locate(event);
    target.x = point.x;
    target.y = point.y;
    target.inside = true;
    previousPointer = point;
    lastMovement = performance.now();
    wake();
  });

  hero.addEventListener("pointermove", (event) => {
    const point = locate(event);
    const now = performance.now();

    if (previousPointer) appendTrail(previousPointer, point, now);

    if (!previousPointer || Math.hypot(point.x - previousPointer.x, point.y - previousPointer.y) > 1.5) {
      lastMovement = now;
      hasLanded = false;
    }

    target.x = point.x;
    target.y = point.y;
    target.inside = true;
    previousPointer = point;
    wake();
  });

  hero.addEventListener("pointerleave", () => {
    target.inside = false;
    previousPointer = null;
    hasLanded = false;
    wake();
  });

  function drawGridLights() {
    if (visibleStrength < 0.01) return;

    const startX = Math.floor((target.x - GLOW_RADIUS) / GRID) * GRID;
    const endX = Math.ceil((target.x + GLOW_RADIUS) / GRID) * GRID;
    const startY = Math.floor((target.y - GLOW_RADIUS) / GRID) * GRID;
    const endY = Math.ceil((target.y + GLOW_RADIUS) / GRID) * GRID;

    context.save();
    context.shadowColor = `rgba(${accent}, 0.54)`;
    context.shadowBlur = 7;

    for (let x = startX; x <= endX; x += GRID) {
      for (let y = startY; y <= endY; y += GRID) {
        const distance = Math.hypot(x - target.x, y - target.y);
        if (distance > GLOW_RADIUS) continue;

        const proximity = 1 - distance / GLOW_RADIUS;
        const gradient = proximity ** 1.55;
        const alpha = gradient * 0.64 * visibleStrength;
        context.beginPath();
        context.fillStyle = `rgba(${accent}, ${alpha})`;
        context.arc(x, y, 0.5 + gradient * 0.9, 0, Math.PI * 2);
        context.fill();
      }
    }

    context.restore();
  }

  function drawTrail(now) {
    context.save();
    context.shadowColor = `rgba(${accent}, 0.34)`;
    context.shadowBlur = 7;

    for (let index = trail.length - 1; index >= 0; index -= 1) {
      const point = trail[index];
      const age = now - point.born;
      if (age >= TRAIL_LIFETIME) {
        trail.splice(index, 1);
        continue;
      }

      const remaining = 1 - age / TRAIL_LIFETIME;
      const alpha = remaining ** 1.8 * 0.48;
      const radius = 0.55 + remaining * 1.15;
      context.beginPath();
      context.fillStyle = `rgba(${accent}, ${alpha})`;
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  function addLandingPulse(now) {
    if (!target.inside || hasLanded || now - lastMovement < 180) return;

    pulses.push({
      x: Math.round(target.x / GRID) * GRID,
      y: Math.round(target.y / GRID) * GRID,
      started: now,
    });
    hasLanded = true;
  }

  function drawPulses(now) {
    for (let index = pulses.length - 1; index >= 0; index -= 1) {
      const pulse = pulses[index];
      const progress = (now - pulse.started) / 1100;
      if (progress >= 1) {
        pulses.splice(index, 1);
        continue;
      }

      const eased = 1 - (1 - progress) ** 3;
      context.beginPath();
      context.strokeStyle = `rgba(${accent}, ${(1 - progress) * 0.2})`;
      context.lineWidth = 0.8;
      context.arc(pulse.x, pulse.y, 4 + eased * 21, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function draw(now) {
    frame = 0;
    context.clearRect(0, 0, width, height);

    const desiredStrength = target.inside ? 1 : 0;
    visibleStrength += (desiredStrength - visibleStrength) * 0.075;

    addLandingPulse(now);
    drawGridLights();
    drawTrail(now);
    drawPulses(now);

    if (target.inside || visibleStrength > 0.015 || trail.length || pulses.length) {
      frame = requestAnimationFrame(draw);
    }
  }

  new ResizeObserver(resize).observe(hero);
  resize();
})();
