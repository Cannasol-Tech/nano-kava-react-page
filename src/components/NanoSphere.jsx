import React, { useRef, useEffect } from 'react';
import { registerAnimation, unregisterAnimation } from '../utils/animationLoop';

// ── Fibonacci sphere distribution ──
function fibonacciSphere(count) {
  const points = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    points.push({ x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius });
  }
  return points;
}

// Dense shell counts for tightly-packed ball coverage
const shellPointsLarge = fibonacciSphere(300);
const shellPointsMed = fibonacciSphere(180);
const shellPointsSmall = fibonacciSphere(100);

// Pre-allocate sort buffers
function createSortBuffer(count) {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0 }));
}
const sortBufLarge = createSortBuffer(300);
const sortBufMed = createSortBuffer(180);
const sortBufSmall = createSortBuffer(100);

function sortByZ(a, b) { return a.z - b.z; }

// Pre-compute light vector lengths
const LIGHT_X = -0.4, LIGHT_Y = -0.5, LIGHT_Z = 0.7;
const LIGHT_LEN = Math.sqrt(LIGHT_X * LIGHT_X + LIGHT_Y * LIGHT_Y + LIGHT_Z * LIGHT_Z);
const FILL_X = 0.5, FILL_Y = 0.4, FILL_Z = 0.3;
const FILL_LEN = Math.sqrt(FILL_X * FILL_X + FILL_Y * FILL_Y + FILL_Z * FILL_Z);

// Sphere definitions
const SPHERES = [
  { xr: 0.22, yr: 0.50, sizeR: 0.23, shell: shellPointsLarge, sortBuf: sortBufLarge, rotMulY: 0.5, rotMulX: 0.25, rotOffY: 0, rotOffX: 0.4, floatA: 10, floatB: 4, floatSpdA: 1.1, floatSpdB: 0.7, floatPhA: 0, floatPhB: 0 },
  { xr: 0.68, yr: 0.30, sizeR: 0.12, shell: shellPointsMed, sortBuf: sortBufMed, rotMulY: 0.7, rotMulX: 0.35, rotOffY: 2, rotOffX: 1.2, floatA: 7, floatB: 3, floatSpdA: 1.4, floatSpdB: 0.9, floatPhA: 1.2, floatPhB: 0.5 },
  { xr: 0.82, yr: 0.62, sizeR: 0.06, shell: shellPointsSmall, sortBuf: sortBufSmall, rotMulY: 0.9, rotMulX: 0.45, rotOffY: 4, rotOffX: 2.5, floatA: 5, floatB: 2, floatSpdA: 1.7, floatSpdB: 1.1, floatPhA: 2.8, floatPhB: 1.8 },
];

// Offscreen canvas padding as multiple of sphere radius
const OC_PAD = 1.8;

function drawNanoParticle(ctx, cx, cy, shellRadius, rotYAngle, rotXAngle, isDark, shellPoints, sortBuf) {
  const N = shellPoints.length;
  const spacing = 2 * Math.sqrt(Math.PI / N);
  const subR = shellRadius * spacing * 0.55;

  // Ambient shadow
  const shadowGrad = ctx.createRadialGradient(cx, cy + shellRadius * 0.9, 0, cx, cy + shellRadius * 0.9, shellRadius * 1.1);
  shadowGrad.addColorStop(0, isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.ellipse(cx, cy + shellRadius * 0.9, shellRadius * 1.1, shellRadius * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = shadowGrad;
  ctx.fill();

  // Golden core
  const coreR = shellRadius * 0.72;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? 'rgb(220, 170, 35)' : 'rgb(210, 160, 30)';
  ctx.fill();

  // 7-stop core gradient for rich detail
  const coreGrad = ctx.createRadialGradient(
    cx - coreR * 0.2, cy - coreR * 0.2, coreR * 0.05,
    cx, cy, coreR * 1.4
  );
  if (isDark) {
    coreGrad.addColorStop(0, 'rgba(255, 245, 110, 1.0)');
    coreGrad.addColorStop(0.15, 'rgba(252, 235, 85, 0.92)');
    coreGrad.addColorStop(0.3, 'rgba(245, 200, 50, 0.78)');
    coreGrad.addColorStop(0.45, 'rgba(235, 182, 40, 0.55)');
    coreGrad.addColorStop(0.6, 'rgba(220, 165, 30, 0.30)');
    coreGrad.addColorStop(0.8, 'rgba(210, 155, 27, 0.12)');
    coreGrad.addColorStop(1, 'rgba(200, 148, 24, 0)');
  } else {
    coreGrad.addColorStop(0, 'rgba(255, 235, 85, 1.0)');
    coreGrad.addColorStop(0.15, 'rgba(248, 218, 60, 0.92)');
    coreGrad.addColorStop(0.3, 'rgba(238, 190, 42, 0.78)');
    coreGrad.addColorStop(0.45, 'rgba(225, 175, 35, 0.55)');
    coreGrad.addColorStop(0.6, 'rgba(212, 158, 28, 0.30)');
    coreGrad.addColorStop(0.8, 'rgba(203, 150, 25, 0.12)');
    coreGrad.addColorStop(1, 'rgba(195, 142, 22, 0)');
  }
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // Inner glow
  const innerGlow = ctx.createRadialGradient(cx, cy, coreR * 0.5, cx, cy, shellRadius * 0.85);
  innerGlow.addColorStop(0, isDark ? 'rgba(40, 80, 180, 0.08)' : 'rgba(30, 60, 140, 0.05)');
  innerGlow.addColorStop(1, 'rgba(20, 50, 120, 0)');
  ctx.beginPath();
  ctx.arc(cx, cy, shellRadius * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = innerGlow;
  ctx.fill();

  // Transform in-place and depth-sort
  const cosY = Math.cos(rotYAngle), sinY = Math.sin(rotYAngle);
  const cosX = Math.cos(rotXAngle), sinX = Math.sin(rotXAngle);
  for (let i = 0; i < N; i++) {
    const p = shellPoints[i];
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
    if (depth < 0.35) continue;

    const perspective = 1 + pt.z * 0.3;
    const px = cx + pt.x * shellRadius * perspective;
    const py = cy + pt.y * shellRadius * perspective;
    const sz = subR * (0.65 + pt.z * 0.35);
    if (sz < 0.5) continue;

    const dot = (pt.x * LIGHT_X + pt.y * LIGHT_Y + pt.z * LIGHT_Z) / LIGHT_LEN;
    const lighting = dot > 0 ? dot : 0;
    const dot2 = (pt.x * FILL_X + pt.y * FILL_Y + pt.z * FILL_Z) / FILL_LEN;
    const fill = dot2 > 0 ? dot2 * 0.25 : 0;

    const hue = 232 - lighting * 20 - fill * 8;
    const baseSat = 58 + lighting * 25 + fill * 10;
    const baseLight = isDark
      ? 16 + lighting * 35 + fill * 12 + depth * 8
      : 15 + lighting * 30 + fill * 10 + depth * 6;

    // Mid-depth: solid fill
    if (depth < 0.55) {
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${baseSat}%, ${baseLight + 4}%, 1.0)`;
      ctx.fill();
      continue;
    }

    // Front spheres: gradient
    const grad = ctx.createRadialGradient(
      px - sz * 0.35, py - sz * 0.35, sz * 0.05,
      px + sz * 0.1, py + sz * 0.1, sz
    );
    grad.addColorStop(0, `hsla(${hue - 10}, ${baseSat + 15}%, ${baseLight + 26}%, 1.0)`);
    grad.addColorStop(0.5, `hsla(${hue}, ${baseSat}%, ${baseLight}%, 1.0)`);
    grad.addColorStop(1, `hsla(${hue + 10}, ${baseSat - 10}%, ${baseLight - 12}%, 0.92)`);
    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Specular
    if (lighting > 0.3 && depth > 0.6) {
      const specAlpha = lighting * depth * 0.7;
      const specR = sz * (0.18 + lighting * 0.12);
      const spG = ctx.createRadialGradient(
        px - sz * 0.3, py - sz * 0.3, 0,
        px - sz * 0.25, py - sz * 0.25, specR
      );
      spG.addColorStop(0, `hsla(210, 100%, 97%, ${specAlpha * 0.85})`);
      spG.addColorStop(1, `hsla(220, 85%, 75%, 0)`);
      ctx.beginPath();
      ctx.arc(px - sz * 0.28, py - sz * 0.28, specR, 0, Math.PI * 2);
      ctx.fillStyle = spG;
      ctx.fill();
    }

    // Rim light
    if (depth > 0.6) {
      const rimStrength = (1 - (dot > 0 ? dot : -dot)) * depth * 0.35;
      if (rimStrength > 0.08) {
        const rimGrad = ctx.createRadialGradient(
          px + sz * 0.3, py + sz * 0.3, sz * 0.4,
          px, py, sz
        );
        rimGrad.addColorStop(0, 'hsla(210, 90%, 78%, 0)');
        rimGrad.addColorStop(0.7, `hsla(210, 90%, 78%, ${rimStrength * 0.25})`);
        rimGrad.addColorStop(1, `hsla(205, 95%, 82%, ${rimStrength})`);
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = rimGrad;
        ctx.fill();
      }
    }
  }

  // Outer glow halo
  const outerGlow = ctx.createRadialGradient(cx, cy, shellRadius * 0.85, cx, cy, shellRadius * 1.55);
  outerGlow.addColorStop(0, isDark ? 'rgba(40, 80, 180, 0.08)' : 'rgba(30, 60, 140, 0.05)');
  outerGlow.addColorStop(1, 'rgba(20, 50, 120, 0)');
  ctx.beginPath();
  ctx.arc(cx, cy, shellRadius * 1.55, 0, Math.PI * 2);
  ctx.fillStyle = outerGlow;
  ctx.fill();
}

export default function NanoSphere({ isDark = true }) {
  const canvasRef = useRef(null);
  const tRef = useRef(0);
  const visibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, dpr;

    // Offscreen canvases — spheres render here at 30fps, composited at 60fps
    const offscreens = SPHERES.map(() => {
      const oc = document.createElement('canvas');
      return { canvas: oc, ctx: oc.getContext('2d'), cssSize: 0 };
    });

    // Pause when offscreen
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    }, { threshold: 0 });
    observer.observe(canvas);

    function resize() {
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Size offscreen canvases
      const minDim = Math.min(width, height);
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
    }

    resize();
    window.addEventListener('resize', resize);

    const animId = Symbol('nanoSphere');

    registerAnimation(animId, (_timestamp, _frameCount) => {
      if (!visibleRef.current) return;

      tRef.current += 1;
      const frame = tRef.current;
      const t = frame * 0.0025;
      const minDim = Math.min(width, height);

      // Sphere floating positions (60fps)
      const spPos = [];
      for (let si = 0; si < SPHERES.length; si++) {
        const s = SPHERES[si];
        const R = minDim * s.sizeR;
        const cx = width * s.xr;
        const floatY = Math.sin(t * s.floatSpdA + s.floatPhA) * s.floatA
                      + Math.cos(t * s.floatSpdB + s.floatPhB) * s.floatB;
        spPos[si] = { cx, cy: height * s.yr + floatY, R };
      }

      // ── Render spheres to offscreen canvases at 30fps (every other frame) ──
      // Compositing (drawImage) runs at 60fps for smooth float motion
      if (frame % 2 === 0) {
        for (let si = 0; si < SPHERES.length; si++) {
          const s = SPHERES[si];
          const oc = offscreens[si];
          const R = spPos[si].R;
          const half = oc.cssSize / 2;

          oc.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          oc.ctx.clearRect(0, 0, oc.cssSize, oc.cssSize);

          drawNanoParticle(oc.ctx, half, half, R,
            t * s.rotMulY + s.rotOffY, t * s.rotMulX + s.rotOffX,
            isDark, s.shell, s.sortBuf);
        }
      }

      ctx.clearRect(0, 0, width, height);

      // Composite spheres (60fps — just drawImage blits)
      for (let si = 0; si < SPHERES.length; si++) {
        const sp = spPos[si];
        const oc = offscreens[si];
        const half = oc.cssSize / 2;
        ctx.drawImage(oc.canvas,
          0, 0, oc.canvas.width, oc.canvas.height,
          sp.cx - half, sp.cy - half,
          oc.cssSize, oc.cssSize);
      }
    });

    return () => {
      unregisterAnimation(animId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
