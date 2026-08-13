(() => {
  "use strict";

  const hero = document.querySelector(".hero-reactive");
  const canvas = hero?.querySelector(".hero-canvas");
  const prefersStillness = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

  if (!hero || !canvas || prefersStillness || !hasFinePointer) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const GRID = 44;
  const TRAIL_LENGTH = 24;
  const GLOW_RADIUS = 165;
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
  const trail = Array.from({ length: TRAIL_LENGTH }, () => ({ x: 0, y: 0 }));
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

  function seedTrail(x, y) {
    trail.forEach((point) => {
      point.x = x;
      point.y = y;
    });
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

  hero.addEventListener("pointerenter", (event) => {
    const point = locate(event);
    target.x = point.x;
    target.y = point.y;
    target.inside = true;
    previousPointer = point;
    lastMovement = performance.now();
    seedTrail(point.x, point.y);
    wake();
  });

  hero.addEventListener("pointermove", (event) => {
    const point = locate(event);
    const movement = previousPointer
      ? Math.hypot(point.x - previousPointer.x, point.y - previousPointer.y)
      : 0;

    target.x = point.x;
    target.y = point.y;
    target.inside = true;
    previousPointer = point;

    if (movement > 1.5) {
      lastMovement = performance.now();
      hasLanded = false;
    }

    wake();
  });

  hero.addEventListener("pointerleave", () => {
    target.inside = false;
    previousPointer = null;
    hasLanded = false;
    wake();
  });

  function drawGridLights() {
    const startX = Math.floor((target.x - GLOW_RADIUS) / GRID) * GRID;
    const endX = Math.ceil((target.x + GLOW_RADIUS) / GRID) * GRID;
    const startY = Math.floor((target.y - GLOW_RADIUS) / GRID) * GRID;
    const endY = Math.ceil((target.y + GLOW_RADIUS) / GRID) * GRID;

    context.save();
    context.shadowColor = `rgba(${accent}, 0.7)`;
    context.shadowBlur = 9;

    for (let x = startX; x <= endX; x += GRID) {
      for (let y = startY; y <= endY; y += GRID) {
        const distance = Math.hypot(x - target.x, y - target.y);
        if (distance > GLOW_RADIUS) continue;

        const proximity = 1 - distance / GLOW_RADIUS;
        const alpha = proximity * proximity * 0.72 * visibleStrength;
        context.beginPath();
        context.fillStyle = `rgba(${accent}, ${alpha})`;
        context.arc(x, y, 1 + proximity * 1.35, 0, Math.PI * 2);
        context.fill();
      }
    }

    context.restore();
  }

  function drawTrail() {
    trail[0].x += (target.x - trail[0].x) * 0.38;
    trail[0].y += (target.y - trail[0].y) * 0.38;

    for (let index = 1; index < trail.length; index += 1) {
      const leader = trail[index - 1];
      const point = trail[index];
      const pull = 0.31 + index * 0.002;
      point.x += (leader.x - point.x) * pull;
      point.y += (leader.y - point.y) * pull;
    }

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.shadowColor = `rgba(${accent}, 0.46)`;
    context.shadowBlur = 11;

    for (let index = trail.length - 1; index > 0; index -= 1) {
      const age = 1 - index / trail.length;
      context.beginPath();
      context.moveTo(trail[index].x, trail[index].y);
      context.lineTo(trail[index - 1].x, trail[index - 1].y);
      context.lineWidth = 0.5 + age * 2.4;
      context.strokeStyle = `rgba(${accent}, ${age * 0.52 * visibleStrength})`;
      context.stroke();
    }

    context.beginPath();
    context.fillStyle = `rgba(${accent}, ${0.68 * visibleStrength})`;
    context.arc(trail[0].x, trail[0].y, 2.4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function addLandingPulse(now) {
    if (!target.inside || hasLanded || now - lastMovement < 150) return;

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
      const progress = (now - pulse.started) / 900;
      if (progress >= 1) {
        pulses.splice(index, 1);
        continue;
      }

      const eased = 1 - (1 - progress) ** 3;
      context.beginPath();
      context.strokeStyle = `rgba(${accent}, ${(1 - progress) * 0.34})`;
      context.lineWidth = 1;
      context.arc(pulse.x, pulse.y, 5 + eased * 32, 0, Math.PI * 2);
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
    drawTrail();
    drawPulses(now);

    if (target.inside || visibleStrength > 0.015 || pulses.length) {
      frame = requestAnimationFrame(draw);
    } else {
      context.clearRect(0, 0, width, height);
    }
  }

  new ResizeObserver(resize).observe(hero);
  resize();
})();
