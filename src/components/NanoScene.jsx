import React, { useRef, useEffect, useCallback } from 'react';
import { registerAnimation, unregisterAnimation } from '../utils/animationLoop';

// ── Fibonacci sphere distribution ──
function fibonacciSphere(count) {
  const points = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    points.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return points;
}

// Dense shell counts for tightly-packed ball coverage
const SHELL_L = fibonacciSphere(350);
const SHELL_M = fibonacciSphere(220);
const SHELL_S = fibonacciSphere(120);

// Pre-allocate transform/sort buffers (avoids per-frame GC)
function createSortBuffer(count) {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0 }));
}
const SORT_BUF_L = createSortBuffer(350);
const SORT_BUF_M = createSortBuffer(220);
const SORT_BUF_S = createSortBuffer(120);

function sortByZ(a, b) { return a.z - b.z; }

// Pre-compute light vector lengths
const L1_X = -0.4, L1_Y = -0.6, L1_Z = 0.65;
const L1_LEN = Math.sqrt(L1_X * L1_X + L1_Y * L1_Y + L1_Z * L1_Z);
const L2_X = 0.5, L2_Y = 0.4, L2_Z = 0.3;
const L2_LEN = Math.sqrt(L2_X * L2_X + L2_Y * L2_Y + L2_Z * L2_Z);

// ── Sphere definitions ──
const SPHERES = [
  { xr: 0.20, yr: 0.50, sizeR: 0.24, shell: SHELL_L, sortBuf: SORT_BUF_L, rotMulY: 0.5, rotMulX: 0.25, rotOffY: 0, rotOffX: 0.4, floatA: 10, floatB: 4, floatSpdA: 1.1, floatSpdB: 0.7, floatPhA: 0, floatPhB: 0 },
  { xr: 0.70, yr: 0.28, sizeR: 0.12, shell: SHELL_M, sortBuf: SORT_BUF_M, rotMulY: 0.7, rotMulX: 0.35, rotOffY: 2, rotOffX: 1.2, floatA: 7, floatB: 3, floatSpdA: 1.4, floatSpdB: 0.9, floatPhA: 1.2, floatPhB: 0.5 },
  { xr: 0.84, yr: 0.64, sizeR: 0.06, shell: SHELL_S, sortBuf: SORT_BUF_S, rotMulY: 0.9, rotMulX: 0.45, rotOffY: 4, rotOffX: 2.5, floatA: 5, floatB: 2, floatSpdA: 1.7, floatSpdB: 1.1, floatPhA: 2.8, floatPhB: 1.8 },
];

// ── Background particle config ──
const P_COUNT = 55;
const P_COUNT_SAFARI = 22; // Reduced particle count for Safari performance (595→231 comparisons)
const CONN_DIST = 120;
const CONN_DIST_SAFARI = 100; // Shorter connection distance on Safari for fewer lines
const CONN_DIST_SQ = CONN_DIST * CONN_DIST;
const CONN_DIST_SAFARI_SQ = CONN_DIST_SAFARI * CONN_DIST_SAFARI;
const MOUSE_R = 180;
const MOUSE_R_SQ = MOUSE_R * MOUSE_R;

// Offscreen canvas padding as multiple of sphere radius (must contain shadow + outer glow)
const OC_PAD = 1.8;

// Safari's createRadialGradient is 2-3x slower — throttle entire animation loop to 30fps
const IS_SAFARI = typeof navigator !== 'undefined'
  && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

function createParticle(w, h) {
  const size = Math.random() * 2.2 + 0.8;
  return {
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
    size, baseSize: size,
    opacity: Math.random() * 0.35 + 0.15,
    pulseOff: Math.random() * Math.PI * 2,
    pulseSp: 0.008 + Math.random() * 0.012,
    hue: 215 + Math.random() * 15,
  };
}

// ── Draw a single nanoemulsion sphere (renders to any 2d context) ──
function drawSphere(ctx, cx, cy, R, rya, rxa, isDark, shell, sortBuf) {
  const N = shell.length;
  const spacing = 2 * Math.sqrt(Math.PI / N);
  const subR = R * spacing * 0.55;

  // Soft shadow
  const shG = ctx.createRadialGradient(cx, cy + R * 0.88, 0, cx, cy + R * 0.88, R * 1.2);
  shG.addColorStop(0, isDark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.08)');
  shG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.ellipse(cx, cy + R * 0.88, R * 1.15, R * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = shG; ctx.fill();

  // Base fill
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.93, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? 'hsla(225, 50%, 8%, 0.8)' : 'hsla(220, 35%, 18%, 0.45)';
  ctx.fill();

  // Golden core
  const cR = R * 0.68;
  ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? 'rgb(220,170,35)' : 'rgb(210,160,30)';
  ctx.fill();

  // 7-stop core gradient for rich detail
  const cG = ctx.createRadialGradient(cx - cR * 0.2, cy - cR * 0.2, cR * 0.05, cx, cy, cR * 1.4);
  if (isDark) {
    cG.addColorStop(0, 'rgba(255,245,110,1.0)');
    cG.addColorStop(0.15, 'rgba(252,235,85,0.92)');
    cG.addColorStop(0.3, 'rgba(245,200,50,0.78)');
    cG.addColorStop(0.45, 'rgba(235,182,40,0.55)');
    cG.addColorStop(0.6, 'rgba(220,165,30,0.30)');
    cG.addColorStop(0.8, 'rgba(210,155,27,0.12)');
    cG.addColorStop(1, 'rgba(200,148,24,0)');
  } else {
    cG.addColorStop(0, 'rgba(255,235,85,1.0)');
    cG.addColorStop(0.15, 'rgba(248,218,60,0.92)');
    cG.addColorStop(0.3, 'rgba(238,190,42,0.78)');
    cG.addColorStop(0.45, 'rgba(225,175,35,0.55)');
    cG.addColorStop(0.6, 'rgba(212,158,28,0.30)');
    cG.addColorStop(0.8, 'rgba(203,150,25,0.12)');
    cG.addColorStop(1, 'rgba(195,142,22,0)');
  }
  ctx.beginPath(); ctx.arc(cx, cy, cR * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = cG; ctx.fill();

  // Inner glow
  const iG = ctx.createRadialGradient(cx, cy, cR * 0.5, cx, cy, R * 0.85);
  iG.addColorStop(0, isDark ? 'rgba(40,80,180,0.08)' : 'rgba(30,60,140,0.05)');
  iG.addColorStop(1, 'rgba(20,50,120,0)');
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = iG; ctx.fill();

  // Transform in-place and depth-sort
  const cosY = Math.cos(rya), sinY = Math.sin(rya);
  const cosX = Math.cos(rxa), sinX = Math.sin(rxa);
  for (let i = 0; i < N; i++) {
    const p = shell[i];
    const rx = p.x * cosY + p.z * sinY;
    const rz = -p.x * sinY + p.z * cosY;
    const buf = sortBuf[i];
    buf.x = rx;
    buf.y = p.y * cosX - rz * sinX;
    buf.z = p.y * sinX + rz * cosX;
  }
  sortBuf.sort(sortByZ);

  for (let idx = 0; idx < N; idx++) {
    const pt = sortBuf[idx];
    const depth = (pt.z + 1) * 0.5;
    if (depth < 0.3) continue;

    const persp = 1 + pt.z * 0.25;
    const px = cx + pt.x * R * persp;
    const py = cy + pt.y * R * persp;
    const sz = subR * (0.7 + pt.z * 0.3);
    if (sz < 0.5) continue;

    const dot = (pt.x * L1_X + pt.y * L1_Y + pt.z * L1_Z) / L1_LEN;
    const lit = dot > 0 ? dot : 0;
    const dot2 = (pt.x * L2_X + pt.y * L2_Y + pt.z * L2_Z) / L2_LEN;
    const fill = dot2 > 0 ? dot2 * 0.25 : 0;

    const hue = 232 - lit * 20 - fill * 8;
    const sat = 58 + lit * 25 + fill * 10;
    const light = isDark
      ? 16 + lit * 35 + fill * 12 + depth * 8
      : 15 + lit * 30 + fill * 10 + depth * 6;

    // Mid-depth: solid fill (no gradient — cheaper)
    if (depth < 0.55) {
      ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light + 4}%, 1.0)`;
      ctx.fill();
      continue;
    }

    // Front spheres: gradient
    const g = ctx.createRadialGradient(
      px - sz * 0.35, py - sz * 0.35, sz * 0.04,
      px + sz * 0.1, py + sz * 0.1, sz
    );
    g.addColorStop(0, `hsla(${hue - 10}, ${sat + 15}%, ${light + 26}%, 1.0)`);
    g.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${light}%, 1.0)`);
    g.addColorStop(1, `hsla(${hue + 10}, ${sat - 10}%, ${light - 12}%, 0.92)`);
    ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();

    // Primary specular
    if (lit > 0.3 && depth > 0.6) {
      const sa = lit * depth * 0.7;
      const sr = sz * (0.18 + lit * 0.12);
      const spG = ctx.createRadialGradient(
        px - sz * 0.3, py - sz * 0.3, 0,
        px - sz * 0.25, py - sz * 0.25, sr
      );
      spG.addColorStop(0, `hsla(210, 100%, 97%, ${sa * 0.85})`);
      spG.addColorStop(1, `hsla(220, 85%, 75%, 0)`);
      ctx.beginPath(); ctx.arc(px - sz * 0.28, py - sz * 0.28, sr, 0, Math.PI * 2);
      ctx.fillStyle = spG; ctx.fill();
    }

    // Rim light
    if (depth > 0.6) {
      const rim = (1 - (dot > 0 ? dot : -dot)) * depth * 0.35;
      if (rim > 0.08) {
        const rG = ctx.createRadialGradient(px + sz * 0.3, py + sz * 0.3, sz * 0.4, px, py, sz);
        rG.addColorStop(0, 'hsla(210, 90%, 78%, 0)');
        rG.addColorStop(0.7, `hsla(210, 90%, 78%, ${rim * 0.25})`);
        rG.addColorStop(1, `hsla(205, 95%, 82%, ${rim})`);
        ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = rG; ctx.fill();
      }
    }
  }

  // Outer glow halo
  const oG = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.55);
  oG.addColorStop(0, isDark ? 'rgba(40,80,180,0.08)' : 'rgba(30,60,140,0.05)');
  oG.addColorStop(1, 'rgba(20,50,120,0)');
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.55, 0, Math.PI * 2);
  ctx.fillStyle = oG; ctx.fill();
}

// ── Main component ──
export default function NanoScene({ isDark = true }) {
  // Skip entire canvas animation on Safari — too slow due to createRadialGradient perf
  if (IS_SAFARI) return null;
  // Skip entire canvas animation on Safari — too slow due to createRadialGradient perf
  if (IS_SAFARI) return null;
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const tRef = useRef(0);
  const visibleRef = useRef(true);

  const getColors = useCallback(() => {
    if (isDark) return { pSat: '80%', pLight: '55%', lSat: '65%', lLight: '45%' };
    return { pSat: '70%', pLight: '42%', lSat: '58%', lLight: '36%' };
  }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr;

    // Offscreen canvases — each sphere renders here at 30fps, composited at 60fps
    const offscreens = SPHERES.map(() => {
      const oc = document.createElement('canvas');
      return { canvas: oc, ctx: oc.getContext('2d'), cssSize: 0 };
    });

    // Pause rendering when canvas scrolls offscreen
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    }, { threshold: 0 });
    observer.observe(canvas);

    // Cache rect to avoid forced layout on every mousemove (#10)
    let cachedRect = { left: 0, top: 0 };

    // Cache vignette on offscreen canvas — only regenerated on resize (#18)
    const vignetteCanvas = document.createElement('canvas');
    const vignetteCtx = vignetteCanvas.getContext('2d');
    let vignetteValid = false;

    // Cache particle sprite — render gradient once, blit 55 times (#25)
    const particleSpriteSize = 80; // Large enough for max particle size * 4
    const particleSprite = document.createElement('canvas');
    particleSprite.width = particleSpriteSize;
    particleSprite.height = particleSpriteSize;
    const particleSpriteCtx = particleSprite.getContext('2d');
    const spriteCenter = particleSpriteSize / 2;
    const spriteRadius = 20; // Base radius for the sprite
    let particleSpriteValid = false;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width; h = rect.height;
      cachedRect = canvas.getBoundingClientRect();
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Size offscreen canvases to fit sphere + shadow + glow
      const minDim = Math.min(w, h);
      for (let si = 0; si < SPHERES.length; si++) {
        const R = minDim * SPHERES[si].sizeR;
        const cssSize = Math.ceil(R * OC_PAD * 2);
        const oc = offscreens[si];
        if (oc.cssSize !== cssSize) {
          oc.cssSize = cssSize;
          oc.canvas.width = Math.ceil(cssSize * dpr);
          oc.canvas.height = Math.ceil(cssSize * dpr);
        }
      }

      if (particlesRef.current.length === 0) {
        const particleCount = IS_SAFARI ? P_COUNT_SAFARI : P_COUNT;
        particlesRef.current = Array.from({ length: particleCount }, () => createParticle(w, h));
      }
      vignetteValid = false;
      particleSpriteValid = false;
    }

    resize();
    window.addEventListener('resize', resize);

    function handleMouseMove(e) {
      mouseRef.current.x = e.clientX - cachedRect.left;
      mouseRef.current.y = e.clientY - cachedRect.top;
    }
    function handleMouseLeave() { mouseRef.current.x = -1000; mouseRef.current.y = -1000; }
    canvas.addEventListener('mousemove', handleMouseMove, { passive: true });
    canvas.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    // Pre-allocate sphere position array — mutated in-place each frame (#11)
    const spPos = SPHERES.map(() => ({ cx: 0, cy: 0, R: 0 }));

    // Safari: 30fps render, 15fps physics for optimal performance
    let lastSafariFrame = 0;
    let lastSafariPhysicsFrame = 0;
    const SAFARI_FRAME_INTERVAL = 1000 / 30; // 33.33ms between renders
    const SAFARI_PHYSICS_INTERVAL = 1000 / 15; // 66.67ms between physics updates

    const animId = Symbol('nanoScene');

    registerAnimation(animId, (timestamp, _frameCount) => {
      if (!visibleRef.current) return;

      // Safari: throttle rendering to 30fps for consistent performance
      if (IS_SAFARI) {
        const elapsed = timestamp - lastSafariFrame;
        if (elapsed < SAFARI_FRAME_INTERVAL) return;
        lastSafariFrame = timestamp - (elapsed % SAFARI_FRAME_INTERVAL);
      }

      tRef.current += 1;
      const frame = tRef.current;

      // Safari: update physics at 15fps (every other render frame)
      const shouldUpdatePhysics = IS_SAFARI
        ? (timestamp - lastSafariPhysicsFrame) >= SAFARI_PHYSICS_INTERVAL
        : true; // Chrome: always update physics at 60fps

      if (IS_SAFARI && shouldUpdatePhysics) {
        lastSafariPhysicsFrame = timestamp - ((timestamp - lastSafariPhysicsFrame) % SAFARI_PHYSICS_INTERVAL);
      }
      // Time-based rotation (consistent speed regardless of FPS)
      const t = timestamp * 0.00015;
      const colors = getColors();
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const minDim = Math.min(w, h);

      // Sphere floating positions — mutated in-place (#11)
      for (let si = 0; si < SPHERES.length; si++) {
        const s = SPHERES[si];
        const R = minDim * s.sizeR;
        const cx = w * s.xr;
        const floatY = Math.sin(t * s.floatSpdA + s.floatPhA) * s.floatA
                      + Math.cos(t * s.floatSpdB + s.floatPhB) * s.floatB;
        spPos[si].cx = cx;
        spPos[si].cy = h * s.yr + floatY;
        spPos[si].R = R;
      }

      // ── Render spheres to offscreen canvases ──
      // Safari: 30fps (entire loop throttled) — createRadialGradient is 2-3x slower
      // Chrome/others: 60fps for smooth rotation
      if (true) {
        for (let si = 0; si < SPHERES.length; si++) {
          const s = SPHERES[si];
          const oc = offscreens[si];
          const R = spPos[si].R;
          const half = oc.cssSize / 2;

          oc.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          oc.ctx.clearRect(0, 0, oc.cssSize, oc.cssSize);

          drawSphere(oc.ctx, half, half, R,
            t * s.rotMulY + s.rotOffY, t * s.rotMulX + s.rotOffX,
            isDark, s.shell, s.sortBuf);
        }
      }

      ctx.clearRect(0, 0, w, h);

      // ── Update particles (60fps Chrome, 15fps Safari — physics) ──
      if (shouldUpdatePhysics) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          if (frame % 4 === 0) {
            p.vx += (Math.random() - 0.5) * 0.088;
            p.vy += (Math.random() - 0.5) * 0.088;
          }
          p.vx *= 0.993;
          p.vy *= 0.993;

          // Mouse repulsion
          const mdx = p.x - mouse.x, mdy = p.y - mouse.y;
          const mDistSq = mdx * mdx + mdy * mdy;
          if (mDistSq < MOUSE_R_SQ && mDistSq > 0) {
            const mDist = Math.sqrt(mDistSq);
            const f = (MOUSE_R - mDist) / MOUSE_R;
            p.vx += (mdx / mDist) * f * 0.5;
            p.vy += (mdy / mDist) * f * 0.5;
          }

          // Sphere influence (orbit + repel from core)
          const influenceMult = IS_SAFARI ? 2.2 : 2.8; // Reduced influence distance on Safari
          for (let si = 0; si < spPos.length; si++) {
            const sp = spPos[si];
            const sdx = p.x - sp.cx, sdy = p.y - sp.cy;
            const sDistSq = sdx * sdx + sdy * sdy;
            const influenceR = sp.R * influenceMult;
            if (sDistSq < influenceR * influenceR && sDistSq > 0) {
              const sDist = Math.sqrt(sDistSq);
              const innerR = sp.R * 1.15;
              if (sDist < innerR) {
                const push = (innerR - sDist) / innerR;
                p.vx += (sdx / sDist) * push * 0.4;
                p.vy += (sdy / sDist) * push * 0.4;
              } else {
                const pull = (1 - sDist / influenceR) * 0.012;
                p.vx += (-sdy / sDist) * pull;
                p.vy += (sdx / sDist) * pull;
                p.vx -= (sdx / sDist) * pull * 0.3;
                p.vy -= (sdy / sDist) * pull * 0.3;
              }
            }
          }

          p.x += p.vx; p.y += p.vy;
          if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
        }
      }

      // ── Update particle visuals (every frame for smooth animation) ──
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.size = p.baseSize + Math.sin(frame * p.pulseSp + p.pulseOff) * 0.35;
      }

      // ── Draw connections + bridge lines (batched into single path) ──
      const connDistSq = IS_SAFARI ? CONN_DIST_SAFARI_SQ : CONN_DIST_SQ;
      ctx.lineWidth = 0.4;
      ctx.strokeStyle = `hsla(222, ${colors.lSat}, ${colors.lLight}, 0.06)`;
      ctx.beginPath();
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          if (dx * dx + dy * dy < connDistSq) {
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          }
        }
      }
      ctx.stroke();

      ctx.lineWidth = 0.3;
      ctx.strokeStyle = `hsla(220, ${colors.lSat}, ${colors.lLight}, 0.04)`;
      ctx.beginPath();
      const bridgeMult = IS_SAFARI ? 1.8 : 2.0; // Slightly reduced bridge distance on Safari
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let si = 0; si < spPos.length; si++) {
          const sp = spPos[si];
          const dx = p.x - sp.cx, dy = p.y - sp.cy;
          const distSq = dx * dx + dy * dy;
          const bridgeDist = sp.R * bridgeMult;
          const innerR = sp.R * 1.05;
          if (distSq < bridgeDist * bridgeDist && distSq > innerR * innerR) {
            const dist = Math.sqrt(distSq);
            const nx = sp.cx + (dx / dist) * sp.R;
            const ny = sp.cy + (dy / dist) * sp.R;
            ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny);
          }
        }
      }
      ctx.stroke();

      // ── Draw particles (60fps) ──
      // Render particle sprite once per theme change (#25)
      if (!particleSpriteValid) {
        particleSpriteCtx.clearRect(0, 0, particleSpriteSize, particleSpriteSize);
        const gG = particleSpriteCtx.createRadialGradient(spriteCenter, spriteCenter, 0, spriteCenter, spriteCenter, spriteRadius);
        // Average hue ~222, full opacity
        gG.addColorStop(0, `hsla(232, 92%, 80%, 1)`);
        gG.addColorStop(0.2, `hsla(222, ${colors.pSat}, ${colors.pLight}, 0.85)`);
        gG.addColorStop(0.4, `hsla(222, ${colors.pSat}, ${colors.pLight}, 0.3)`);
        gG.addColorStop(1, `hsla(222, ${colors.pSat}, ${colors.pLight}, 0)`);
        particleSpriteCtx.beginPath();
        particleSpriteCtx.arc(spriteCenter, spriteCenter, spriteRadius, 0, Math.PI * 2);
        particleSpriteCtx.fillStyle = gG;
        particleSpriteCtx.fill();
        particleSpriteValid = true;
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pa = p.opacity + Math.sin(frame * p.pulseSp + p.pulseOff) * 0.08;

        let glowBoost = 0;
        const glowThresholdMult = IS_SAFARI ? 2.2 : 2.5; // Match reduced influence on Safari
        for (let si = 0; si < spPos.length; si++) {
          const sp = spPos[si];
          const dx = p.x - sp.cx, dy = p.y - sp.cy;
          const distSq = dx * dx + dy * dy;
          const threshold = sp.R * glowThresholdMult;
          if (distSq < threshold * threshold) {
            const dist = Math.sqrt(distSq);
            const boost = (1 - dist / threshold) * 0.18;
            if (boost > glowBoost) glowBoost = boost;
          }
        }
        const fa = pa + glowBoost;

        // Blit cached sprite with scale and alpha (#25)
        const scale = (p.size * 4) / spriteRadius;
        const drawSize = particleSpriteSize * scale;
        ctx.save();
        ctx.globalAlpha = fa;
        ctx.drawImage(particleSprite,
          0, 0, particleSpriteSize, particleSpriteSize,
          p.x - drawSize / 2, p.y - drawSize / 2,
          drawSize, drawSize);
        ctx.restore();
      }

      // ── Composite spheres from offscreen canvases (60fps — just a drawImage blit) ──
      for (let si = 0; si < SPHERES.length; si++) {
        const sp = spPos[si];
        const oc = offscreens[si];
        const half = oc.cssSize / 2;
        ctx.drawImage(oc.canvas,
          0, 0, oc.canvas.width, oc.canvas.height,
          sp.cx - half, sp.cy - half,
          oc.cssSize, oc.cssSize);
      }

      // ── Vignette — cached on offscreen canvas (#18) ──
      if (!vignetteValid) {
        vignetteCanvas.width = Math.ceil(w * dpr);
        vignetteCanvas.height = Math.ceil(h * dpr);
        vignetteCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const vG = vignetteCtx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
        vG.addColorStop(0, 'rgba(0,0,0,0)');
        vG.addColorStop(1, isDark ? 'rgba(2,6,23,0.4)' : 'rgba(255,255,255,0.28)');
        vignetteCtx.fillStyle = vG;
        vignetteCtx.fillRect(0, 0, w, h);
        vignetteValid = true;
      }
      ctx.drawImage(vignetteCanvas, 0, 0, vignetteCanvas.width, vignetteCanvas.height, 0, 0, w, h);
    });

    const particleCount = IS_SAFARI ? P_COUNT_SAFARI : P_COUNT;
    particlesRef.current = Array.from({ length: particleCount }, () => createParticle(w, h));

    return () => {
      unregisterAnimation(animId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [getColors, isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      role="img"
      aria-label="Animated visualization of nano-emulsified particles demonstrating the nanoemulsification technology"
      style={{
        pointerEvents: 'none',
        willChange: 'contents',
        transform: 'translateZ(0)',
      }}
    />
  );
}
