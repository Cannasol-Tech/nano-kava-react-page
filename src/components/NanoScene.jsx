import React, { useRef, useEffect } from 'react';
import { registerAnimation, unregisterAnimation } from '../utils/animationLoop';
import {
  SEQUENCE, assembleProgress, isSequenceEnabled, sequenceElapsed, smoothstep,
} from '../utils/loadSequence';
import { subscribeLabMode } from '../utils/labMode';
import { subscribeRainbow } from '../utils/nanoRainbow';
import { SCENE_CONTEXT_OPTIONS, sceneClearColor, sceneDpr } from '../utils/sceneCanvas';
import { IS_SAFARI } from '../utils/browser';
import { DEFAULT_PALETTE, activePalette, subscribePalette } from '../utils/particlePalette';

// Viewport anchor of the primary sphere — LoadPulse fires its rings from here.
export const PRIMARY_SPHERE_ANCHOR = { xPct: 20, yPct: 50 };

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
const SCATTER_L = createScatter(350);
const SCATTER_M = createScatter(220);
const SCATTER_S = createScatter(120);

// Pre-allocate transform/sort buffers (avoids per-frame GC)
function createSortBuffer(count) {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0, i: 0 }));
}
const SORT_BUF_L = createSortBuffer(350);
const SORT_BUF_M = createSortBuffer(220);
const SORT_BUF_S = createSortBuffer(120);

function sortByZ(a, b) { return a.z - b.z; }

// Launch vectors for the assemble phase, in sphere radii. Deterministic rather than
// Math.random() so a remount lands every point where it landed before.
function frac(x) { return x - Math.floor(x); }
function createScatter(count) {
  return Array.from({ length: count }, (_, i) => {
    const angle = frac(i * 0.7548776662) * Math.PI * 2;
    const dist = 3.6 + frac(i * 0.5698402909) * 9.5;
    return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, delay: frac(i * 0.618033988) * 0.34 };
  });
}

/** Rotates a shell into its buffer and depth-sorts it; shared by both render paths. */
function transformShell(shell, sortBuf, rya, rxa) {
  const N = shell.length;
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
    // Re-stamped every frame: last frame's sort left the buffer in a different order.
    buf.i = i;
  }
  sortBuf.sort(sortByZ);
}

// Pre-compute light vector lengths
const L1_X = -0.4, L1_Y = -0.6, L1_Z = 0.65;
const L1_LEN = Math.sqrt(L1_X * L1_X + L1_Y * L1_Y + L1_Z * L1_Z);
const L2_X = 0.5, L2_Y = 0.4, L2_Z = 0.3;
const L2_LEN = Math.sqrt(L2_X * L2_X + L2_Y * L2_Y + L2_Z * L2_Z);

// ── Sphere definitions ──
const SPHERES = [
  { xr: PRIMARY_SPHERE_ANCHOR.xPct / 100, yr: PRIMARY_SPHERE_ANCHOR.yPct / 100, sizeR: 0.24, shell: SHELL_L, sortBuf: SORT_BUF_L, scatter: SCATTER_L, rotMulY: 0.5, rotMulX: 0.25, rotOffY: 0, rotOffX: 0.4, floatA: 10, floatB: 4, floatSpdA: 1.1, floatSpdB: 0.7, floatPhA: 0, floatPhB: 0 },
  { xr: 0.70, yr: 0.28, sizeR: 0.12, shell: SHELL_M, sortBuf: SORT_BUF_M, scatter: SCATTER_M, rotMulY: 0.7, rotMulX: 0.35, rotOffY: 2, rotOffX: 1.2, floatA: 7, floatB: 3, floatSpdA: 1.4, floatSpdB: 0.9, floatPhA: 1.2, floatPhB: 0.5 },
  { xr: 0.84, yr: 0.64, sizeR: 0.06, shell: SHELL_S, sortBuf: SORT_BUF_S, scatter: SCATTER_S, rotMulY: 0.9, rotMulX: 0.45, rotOffY: 4, rotOffX: 2.5, floatA: 5, floatB: 2, floatSpdA: 1.7, floatSpdB: 1.1, floatPhA: 2.8, floatPhB: 1.8 },
];

// ── Background particle config ──
const P_COUNT = 55;
// Lab mode adds this many for a few seconds. Deliberately modest: the connection pass is O(N²),
// so 55 -> 95 already trebles it. See CLAUDE.md § Lab mode.
const P_COUNT_LAB_BONUS = 40;
const P_COUNT_SAFARI = 22; // Reduced particle count for Safari performance (595→231 comparisons)
const CONN_DIST = 120;
const CONN_DIST_SAFARI = 100; // Shorter connection distance on Safari for fewer lines
const CONN_DIST_SQ = CONN_DIST * CONN_DIST;
const CONN_DIST_SAFARI_SQ = CONN_DIST_SAFARI * CONN_DIST_SAFARI;
const MOUSE_R = 180;
const MOUSE_R_SQ = MOUSE_R * MOUSE_R;

// Offscreen canvas padding as multiple of sphere radius (must contain shadow + outer glow)
const OC_PAD = 1.8;

// Shell re-render cadence — 690 arcs + gradients per shell pass is the loop's dominant cost.
const SHELL_RENDER_INTERVAL = 1000 / 30;

const PREFERS_REDUCED_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;



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


/**
 * One shell point: body gradient, specular, rim. Extracted so the exact same code both paints
 * live (Chrome) and bakes the sprite atlas (Safari) — the two must not drift apart.
 */
function paintShellPoint(ctx, px, py, sz, dot, fill, depth, isDark, hueShift = 0, pal = DEFAULT_PALETTE.large) {
  const lit = dot > 0 ? dot : 0;
  const hue = pal.hue - lit * 20 - fill * 8 + hueShift;
  const sat = pal.sat + lit * 25 + fill * 10;
  const light = pal.light + (isDark
    ? 16 + lit * 35 + fill * 12 + depth * 8
    : 15 + lit * 30 + fill * 10 + depth * 6);
  const aHue = pal.accentHue;
  const aSat = pal.accentSat;

  const g = ctx.createRadialGradient(
    px - sz * 0.35, py - sz * 0.35, sz * 0.04,
    px + sz * 0.1, py + sz * 0.1, sz
  );
  g.addColorStop(0, `hsla(${hue - 10}, ${sat + 15}%, ${light + 26}%, 1.0)`);
  g.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${light}%, 1.0)`);
  g.addColorStop(1, `hsla(${hue + 10}, ${sat - 10}%, ${light - 12}%, 0.92)`);
  ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();

  if (lit > 0.3 && depth > 0.6) {
    const sa = lit * depth * 0.7;
    const sr = sz * (0.18 + lit * 0.12);
    const spG = ctx.createRadialGradient(
      px - sz * 0.3, py - sz * 0.3, 0,
      px - sz * 0.25, py - sz * 0.25, sr
    );
    spG.addColorStop(0, `hsla(${aHue}, ${100 * aSat}%, 97%, ${sa * 0.85})`);
    spG.addColorStop(1, `hsla(${aHue + 10}, ${85 * aSat}%, 75%, 0)`);
    ctx.beginPath(); ctx.arc(px - sz * 0.28, py - sz * 0.28, sr, 0, Math.PI * 2);
    ctx.fillStyle = spG; ctx.fill();
  }

  if (depth > 0.6) {
    const rim = (1 - (dot > 0 ? dot : -dot)) * depth * 0.35;
    if (rim > 0.08) {
      const rG = ctx.createRadialGradient(px + sz * 0.3, py + sz * 0.3, sz * 0.4, px, py, sz);
      rG.addColorStop(0, `hsla(${aHue}, ${90 * aSat}%, 78%, 0)`);
      rG.addColorStop(0.7, `hsla(${aHue}, ${90 * aSat}%, 78%, ${rim * 0.25})`);
      rG.addColorStop(1, `hsla(${aHue - 5}, ${95 * aSat}%, 82%, ${rim})`);
      ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fillStyle = rG; ctx.fill();
    }
  }
}

/**
 * Safari path. A front-facing point costs up to three createRadialGradient calls, ~345 of them
 * per frame across the three shells, and WebKit's createRadialGradient is 2-3x slower than
 * Blink's — that is the whole reason the shells were switched off on Safari. Baking the point
 * into a sprite atlas once turns each of those into a single drawImage.
 *
 * Buckets are the signed light dot (not `lit`) because the rim term reads |dot|, so two points
 * with lit === 0 can look quite different. Second-light `fill` is baked at its mid value; it
 * moves hue by at most 2 and lightness by 3, which is invisible at these sizes.
 */
const ATLAS_TILE = 64;
const ATLAS_DOT_STEPS = 16;
const ATLAS_DEPTH_STEPS = 4;
const ATLAS_R = ATLAS_TILE * 0.42;
const ATLAS_FILL = 0.12;

function buildShellAtlas(isDark, pal = DEFAULT_PALETTE.large) {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_TILE * ATLAS_DOT_STEPS;
  canvas.height = ATLAS_TILE * ATLAS_DEPTH_STEPS;
  const ctx = canvas.getContext('2d');
  for (let di = 0; di < ATLAS_DEPTH_STEPS; di++) {
    const depth = 0.55 + ((di + 0.5) / ATLAS_DEPTH_STEPS) * 0.45;
    for (let si = 0; si < ATLAS_DOT_STEPS; si++) {
      const dot = -1 + ((si + 0.5) / ATLAS_DOT_STEPS) * 2;
      paintShellPoint(
        ctx, si * ATLAS_TILE + ATLAS_TILE / 2, di * ATLAS_TILE + ATLAS_TILE / 2,
        ATLAS_R, dot, ATLAS_FILL, depth, isDark, 0, pal
      );
    }
  }
  return canvas;
}

function blitShellPoint(ctx, atlas, px, py, sz, dot, depth) {
  let si = ((dot + 1) * 0.5 * ATLAS_DOT_STEPS) | 0;
  if (si < 0) si = 0; else if (si >= ATLAS_DOT_STEPS) si = ATLAS_DOT_STEPS - 1;
  let di = (((depth - 0.55) / 0.45) * ATLAS_DEPTH_STEPS) | 0;
  if (di < 0) di = 0; else if (di >= ATLAS_DEPTH_STEPS) di = ATLAS_DEPTH_STEPS - 1;

  const dest = (sz / ATLAS_R) * ATLAS_TILE;
  const half = dest * 0.5;
  ctx.drawImage(
    atlas, si * ATLAS_TILE, di * ATLAS_TILE, ATLAS_TILE, ATLAS_TILE,
    px - half, py - half, dest, dest
  );
}

// ── Draw a single nanoemulsion sphere (renders to any 2d context) ──
function drawSphere(ctx, cx, cy, R, rya, rxa, isDark, shell, sortBuf, hueShift = 0, atlas = null, pal = DEFAULT_PALETTE.large) {
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

  transformShell(shell, sortBuf, rya, rxa);

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

    // Mid-depth: solid fill (no gradient — cheaper)
    if (depth < 0.55) {
      const hue = pal.hue - lit * 20 - fill * 8 + hueShift;
      const sat = pal.sat + lit * 25 + fill * 10;
      const light = pal.light + (isDark
        ? 16 + lit * 35 + fill * 12 + depth * 8
        : 15 + lit * 30 + fill * 10 + depth * 6);
      ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light + 4}%, 1.0)`;
      ctx.fill();
      continue;
    }

    if (atlas) blitShellPoint(ctx, atlas, px, py, sz, dot, depth);
    // 0, not hueShift: front-facing points never took the rainbow tint and still do not.
    // See CLAUDE.md § Lab mode — the egg is uneven, and evening it up is not this change's job.
    else paintShellPoint(ctx, px, py, sz, dot, fill, depth, isDark, 0, pal);
  }

  // Outer glow halo
  const oG = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.55);
  oG.addColorStop(0, isDark ? 'rgba(40,80,180,0.08)' : 'rgba(30,60,140,0.05)');
  oG.addColorStop(1, 'rgba(20,50,120,0)');
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.55, 0, Math.PI * 2);
  ctx.fillStyle = oG; ctx.fill();
}

/**
 * Assemble phase: the shell flies in from offscreen and coalesces. Draws straight to the
 * main canvas as flat dots — no createRadialGradient anywhere, so a load frame costs less
 * than a settled one. See CLAUDE.md § Load sequence.
 */
function drawAssembling(ctx, cx, cy, R, rya, rxa, isDark, shell, sortBuf, scatter, p, w, h, pal = DEFAULT_PALETTE.large) {
  transformShell(shell, sortBuf, rya, rxa);
  const N = shell.length;
  const subR = R * 2 * Math.sqrt(Math.PI / N) * 0.55;
  const baseLight = (isDark ? 16 : 15) + pal.light;

  for (let idx = 0; idx < N; idx++) {
    const pt = sortBuf[idx];
    const sc = scatter[pt.i];
    let q = (p - sc.delay) / (1 - sc.delay);
    if (q <= 0) continue;
    if (q > 1) q = 1;
    const rem = 1 - q;
    q = 1 - rem * rem * rem;
    const inv = 1 - q;

    const persp = 1 + pt.z * 0.25;
    const x = cx + pt.x * R * persp * q + sc.dx * R * inv;
    if (x < -30 || x > w + 30) continue;
    const y = cy + pt.y * R * persp * q + sc.dy * R * inv;
    if (y < -30 || y > h + 30) continue;

    const sz = subR * (0.7 + pt.z * 0.3) * (0.45 + 0.55 * q);
    if (sz < 0.4) continue;

    const depth = (pt.z + 1) * 0.5;
    const dot = (pt.x * L1_X + pt.y * L1_Y + pt.z * L1_Z) / L1_LEN;
    const lit = dot > 0 ? dot : 0;
    // Points still in flight run hot, cooling to their lit colour as the shell closes.
    let a = q < 0.18 ? q / 0.18 : 1;
    if (depth < 0.3) a *= 1 - q * 0.9;

    ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${pal.hue - lit * 20}, ${pal.sat + lit * 25}%, ${baseLight + lit * 35 + depth * 8 + inv * 26}%, ${a})`;
    ctx.fill();
  }
}

// ── Main component ──
export default function NanoScene({ isDark = true }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const tRef = useRef(0);
  const visibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', SCENE_CONTEXT_OPTIONS);
    const clearColor = sceneClearColor(isDark);
    // Numbers, not '80%' strings, because a palette moves them by a delta.
    const colors = isDark
      ? { pSat: 80, pLight: 55, lSat: 65, lLight: 45 }
      : { pSat: 70, pLight: 42, lSat: 58, lLight: 36 };

    let pal = activePalette();
    let connStroke, bridgeStroke;
    function recomputeStrokes() {
      const sm = pal.small;
      connStroke = `hsla(${sm.hue}, ${colors.lSat + sm.sat}%, ${colors.lLight + sm.light}%, 0.06)`;
      bridgeStroke = `hsla(${sm.hue - 2}, ${colors.lSat + sm.sat}%, ${colors.lLight + sm.light}%, 0.04)`;
    }
    recomputeStrokes();
    let w, h, dpr;

    // Baked per theme AND per palette — a recolour must rebake or Safari keeps the old sprites.
    let shellAtlas = IS_SAFARI ? buildShellAtlas(isDark, pal.large) : null;

    // Offscreen canvases — each sphere renders here at 30fps, composited at 60fps
    const offscreens = SPHERES.map(() => {
      const oc = document.createElement('canvas');
      return { canvas: oc, ctx: oc.getContext('2d'), cssSize: 0 };
    });

    // Never fires today — the parent is `fixed inset-0`, so the canvas always intersects.
    // Kept as the guard for any future layout that scrolls it. See CLAUDE.md § NanoScene is always on screen.
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

    // Shell re-render cadence — see CLAUDE.md § Sphere shells re-render at 30fps.
    let lastShellRender = -1e9;

    // Three caches hold colour, and all three must go. See CLAUDE.md § Recolouring the scene.
    const unsubscribePalette = subscribePalette((next) => {
      pal = next;
      recomputeStrokes();
      particleSpriteValid = false;
      lastShellRender = -1e9;
      if (IS_SAFARI) shellAtlas = buildShellAtlas(isDark, pal.large);
    });

    function resize() {
      dpr = sceneDpr();
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
        oc.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      vignetteValid = false;
      particleSpriteValid = false;
      lastShellRender = -1e9;
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

    // Re-evaluated on every effect run (theme toggle remounts this): a remount after the
    // window has closed must resume settled, never replay the assemble.
    let assembling = isSequenceEnabled() && sequenceElapsed() < SEQUENCE.assembleMs;

    // Lab mode grows the pool and trims it back; the extras are ordinary particles, so every
    // physics and draw loop picks them up with no branching in the hot path.
    let rainbowOn = false;
    const unsubscribeRainbow = subscribeRainbow((on) => { rainbowOn = on; });

    const unsubscribeLab = subscribeLabMode((on) => {
      const pool = particlesRef.current;
      if (on) {
        for (let i = 0; i < P_COUNT_LAB_BONUS; i++) pool.push(createParticle(w, h));
      } else {
        pool.length = Math.min(pool.length, IS_SAFARI ? P_COUNT_SAFARI : P_COUNT);
      }
    });

    const animId = Symbol('nanoScene');
    if (PREFERS_REDUCED_MOTION) assembling = false;

    const renderFrame = (timestamp, _frameCount) => {
      if (!visibleRef.current) return;

      // Safari: throttle rendering to 30fps for consistent performance
      if (IS_SAFARI) {
        const elapsed = timestamp - lastSafariFrame;
        if (elapsed < SAFARI_FRAME_INTERVAL) return;
        lastSafariFrame = timestamp - (elapsed % SAFARI_FRAME_INTERVAL);
      }

      let asmP = 1;
      if (assembling) {
        asmP = assembleProgress(sequenceElapsed());
        if (asmP >= 1) assembling = false;
      }
      // Dots hand over to the real spheres in the last quarter; nothing pops.
      const sphereAlpha = assembling ? smoothstep(SEQUENCE.crossfadeFrom, 1, asmP) : 1;
      const dotAlpha = assembling ? 1 - smoothstep(0.82, 1, asmP) : 0;
      const bgFade = assembling ? smoothstep(0.12, 0.65, asmP) : 1;

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
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const mouseActive = mouse.x > -100;
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
      // Rotation is slow enough that 30fps is indistinguishable; the float and the
      // composite below stay at 60fps. See CLAUDE.md § Sphere shells re-render at 30fps.
      // Cycling the hue is one addition per point, and exactly 0 when the egg is not running.
      const hueShift = rainbowOn ? (timestamp * 0.12) % 360 : 0;
      const shellsDue = assembling || (timestamp - lastShellRender) >= SHELL_RENDER_INTERVAL;
      if (sphereAlpha > 0 && shellsDue) {
        lastShellRender = timestamp;
        for (let si = 0; si < SPHERES.length; si++) {
          const s = SPHERES[si];
          const oc = offscreens[si];
          const R = spPos[si].R;
          const half = oc.cssSize / 2;

          oc.ctx.clearRect(0, 0, oc.cssSize, oc.cssSize);

          drawSphere(oc.ctx, half, half, R,
            t * s.rotMulY + s.rotOffY, t * s.rotMulX + s.rotOffX,
            isDark, s.shell, s.sortBuf, hueShift, shellAtlas, pal.large);
        }
      }

      ctx.fillStyle = clearColor;
      ctx.fillRect(0, 0, w, h);

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

          // Mouse repulsion — skipped while the pointer is parked off-canvas
          if (mouseActive) {
            const mdx = p.x - mouse.x, mdy = p.y - mouse.y;
            const mDistSq = mdx * mdx + mdy * mdy;
            if (mDistSq < MOUSE_R_SQ && mDistSq > 0) {
              const mDist = Math.sqrt(mDistSq);
              const f = (MOUSE_R - mDist) / MOUSE_R;
              p.vx += (mdx / mDist) * f * 0.5;
              p.vy += (mdy / mDist) * f * 0.5;
            }
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
      if (!assembling) {
      const connDistSq = IS_SAFARI ? CONN_DIST_SAFARI_SQ : CONN_DIST_SQ;
      ctx.lineWidth = 0.4;
      ctx.strokeStyle = connStroke;
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
      ctx.strokeStyle = bridgeStroke;
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
      }

      // ── Draw particles (60fps) ──
      // Render particle sprite once per theme change (#25)
      if (!particleSpriteValid) {
        particleSpriteCtx.clearRect(0, 0, particleSpriteSize, particleSpriteSize);
        const gG = particleSpriteCtx.createRadialGradient(spriteCenter, spriteCenter, 0, spriteCenter, spriteCenter, spriteRadius);
        const sm = pal.small;
        const pSat = colors.pSat + sm.sat;
        const pLight = colors.pLight + sm.light;
        gG.addColorStop(0, `hsla(${sm.coreHue}, ${sm.coreSat}%, ${sm.coreLight}%, 1)`);
        gG.addColorStop(0.2, `hsla(${sm.hue}, ${pSat}%, ${pLight}%, 0.85)`);
        gG.addColorStop(0.4, `hsla(${sm.hue}, ${pSat}%, ${pLight}%, 0.3)`);
        gG.addColorStop(1, `hsla(${sm.hue}, ${pSat}%, ${pLight}%, 0)`);
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

        const scale = (p.size * 4) / spriteRadius;
        const drawSize = particleSpriteSize * scale;
        ctx.globalAlpha = fa * bgFade;
        ctx.drawImage(particleSprite,
          0, 0, particleSpriteSize, particleSpriteSize,
          p.x - drawSize / 2, p.y - drawSize / 2,
          drawSize, drawSize);
      }
      ctx.globalAlpha = 1;

      // ── Composite spheres from offscreen canvases (60fps — just a drawImage blit) ──
      if (sphereAlpha > 0) {
        if (sphereAlpha < 1) ctx.globalAlpha = sphereAlpha;
        for (let si = 0; si < SPHERES.length; si++) {
          const sp = spPos[si];
          const oc = offscreens[si];
          const half = oc.cssSize / 2;
          ctx.drawImage(oc.canvas,
            0, 0, oc.canvas.width, oc.canvas.height,
            sp.cx - half, sp.cy - half,
            oc.cssSize, oc.cssSize);
        }
        ctx.globalAlpha = 1;
      }

      if (dotAlpha > 0) {
        ctx.globalAlpha = dotAlpha;
        for (let si = 0; si < SPHERES.length; si++) {
          const s = SPHERES[si];
          const sp = spPos[si];
          drawAssembling(ctx, sp.cx, sp.cy, sp.R,
            t * s.rotMulY + s.rotOffY, t * s.rotMulX + s.rotOffX,
            isDark, s.shell, s.sortBuf, s.scatter, asmP, w, h, pal.large);
        }
        ctx.globalAlpha = 1;
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
    };

    const particleCount = IS_SAFARI ? P_COUNT_SAFARI : P_COUNT;
    particlesRef.current = Array.from({ length: particleCount }, () => createParticle(w, h));

    // Reduced motion gets one settled frame, not a paused animation.
    if (PREFERS_REDUCED_MOTION) renderFrame(performance.now(), 0);
    else registerAnimation(animId, renderFrame);

    return () => {
      unregisterAnimation(animId);
      unsubscribeLab();
      unsubscribeRainbow();
      unsubscribePalette();
      observer.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      role="img"
      aria-label="Animated visualization of nano-emulsified particles demonstrating the nanoemulsification technology"
      style={{
        pointerEvents: 'none',
        transform: 'translateZ(0)',
      }}
    />
  );
}
