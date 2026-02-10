import React, { useRef, useEffect, useCallback } from 'react';

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

function rotY(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}
function rotX(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

// Precomputed shell geometry — dense packing
const SHELL_L = fibonacciSphere(240);
const SHELL_M = fibonacciSphere(160);
const SHELL_S = fibonacciSphere(90);

// ── Sphere definitions ──
const SPHERES = [
  { xr: 0.20, yr: 0.50, sizeR: 0.24, shell: SHELL_L, rotMulY: 0.5, rotMulX: 0.25, rotOffY: 0, rotOffX: 0.4, floatA: 10, floatB: 4, floatSpdA: 1.1, floatSpdB: 0.7, floatPhA: 0, floatPhB: 0, depthScale: 1.0 },
  { xr: 0.70, yr: 0.28, sizeR: 0.12, shell: SHELL_M, rotMulY: 0.7, rotMulX: 0.35, rotOffY: 2, rotOffX: 1.2, floatA: 7, floatB: 3, floatSpdA: 1.4, floatSpdB: 0.9, floatPhA: 1.2, floatPhB: 0.5, depthScale: 0.85 },
  { xr: 0.84, yr: 0.64, sizeR: 0.06, shell: SHELL_S, rotMulY: 0.9, rotMulX: 0.45, rotOffY: 4, rotOffX: 2.5, floatA: 5, floatB: 2, floatSpdA: 1.7, floatSpdB: 1.1, floatPhA: 2.8, floatPhB: 1.8, depthScale: 0.65 },
];

// ── Background particle config ──
const P_COUNT = 55;
const CONN_DIST = 120;
const MOUSE_R = 180;

function createParticle(w, h) {
  const size = Math.random() * 2.2 + 0.8;
  return {
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
    size, baseSize: size,
    opacity: Math.random() * 0.35 + 0.15,
    pulseOff: Math.random() * Math.PI * 2,
    pulseSp: 0.008 + Math.random() * 0.012,
    hue: 143 + Math.random() * 12,
  };
}

// ── Draw a single nanoemulsion sphere ──
function drawSphere(ctx, cx, cy, R, rya, rxa, isDark, shell, globalOpacity) {
  const N = shell.length;
  const spacing = 2 * Math.sqrt(Math.PI / N);
  const subR = R * spacing * 0.6;

  ctx.save();
  ctx.globalAlpha = globalOpacity;

  // Soft shadow
  const shG = ctx.createRadialGradient(cx, cy + R * 0.88, 0, cx, cy + R * 0.88, R * 1.1);
  shG.addColorStop(0, isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)');
  shG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.ellipse(cx, cy + R * 0.88, R * 1.1, R * 0.28, 0, 0, Math.PI * 2);
  ctx.fillStyle = shG; ctx.fill();

  // Base fill (gap-filler)
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.93, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? 'hsla(140, 45%, 10%, 0.7)' : 'hsla(140, 35%, 18%, 0.45)';
  ctx.fill();

  // Golden core — warm amber glow (opaque base)
  const cR = R * 0.68;

  // Solid base layer to block transparency
  ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? 'rgb(210,160,30)' : 'rgb(200,150,30)';
  ctx.fill();

  // Gradient overlay with very gradual fade for seamless blend
  const cG = ctx.createRadialGradient(cx - cR * 0.15, cy - cR * 0.15, cR * 0.05, cx, cy, cR * 1.4);
  if (isDark) {
    cG.addColorStop(0, 'rgba(255,230,70,1.0)');
    cG.addColorStop(0.25, 'rgba(248,210,55,0.92)');
    cG.addColorStop(0.45, 'rgba(235,188,42,0.75)');
    cG.addColorStop(0.6, 'rgba(222,170,35,0.5)');
    cG.addColorStop(0.75, 'rgba(210,155,28,0.25)');
    cG.addColorStop(0.88, 'rgba(200,148,24,0.1)');
    cG.addColorStop(0.96, 'rgba(195,145,22,0.02)');
    cG.addColorStop(1, 'rgba(195,145,22,0)');
  } else {
    cG.addColorStop(0, 'rgba(255,220,60,1.0)');
    cG.addColorStop(0.25, 'rgba(245,198,46,0.92)');
    cG.addColorStop(0.45, 'rgba(230,178,36,0.75)');
    cG.addColorStop(0.6, 'rgba(218,162,30,0.5)');
    cG.addColorStop(0.75, 'rgba(205,148,26,0.25)');
    cG.addColorStop(0.88, 'rgba(195,140,23,0.1)');
    cG.addColorStop(0.96, 'rgba(190,136,21,0.02)');
    cG.addColorStop(1, 'rgba(190,136,21,0)');
  }
  ctx.beginPath(); ctx.arc(cx, cy, cR * 1.4, 0, Math.PI * 2); ctx.fillStyle = cG; ctx.fill();

  // Inner glow
  const iG = ctx.createRadialGradient(cx, cy, cR * 0.3, cx, cy, R * 0.8);
  iG.addColorStop(0, isDark ? 'rgba(27,122,62,0.06)' : 'rgba(27,122,62,0.04)');
  iG.addColorStop(1, 'rgba(27,122,62,0)');
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.8, 0, Math.PI * 2); ctx.fillStyle = iG; ctx.fill();

  // Transform and depth-sort
  const pts = shell.map(p => {
    let q = rotY(p, rya); q = rotX(q, rxa); return q;
  }).map((p, i) => ({ ...p, i })).sort((a, b) => a.z - b.z);

  // Light direction (top-left-front) — warm side / cool side split
  const lx = -0.4, ly = -0.6, lz = 0.65;
  const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);

  for (const pt of pts) {
    const persp = 1 + pt.z * 0.25;
    const px = cx + pt.x * R * persp;
    const py = cy + pt.y * R * persp;
    const sz = subR * (0.7 + pt.z * 0.3);
    if (sz < 0.3) continue;

    const depth = (pt.z + 1) / 2;
    const dot = (pt.x * lx + pt.y * ly + pt.z * lz) / lLen;
    const lit = Math.max(0, dot);

    // Cannasol logo forest green (~#1A7A3D)
    const hue = 148;

    // ── Skip back-facing particles (behind the core) ──
    if (depth < 0.3) {
      continue;
    }

    const sat = 60 + lit * 18;
    const light = isDark ? 22 + lit * 22 + depth * 8 : 20 + lit * 20 + depth * 6;
    const alpha = 0.68 + depth * 0.3;

    // ── Mid-depth: flat + ambient occlusion ring ──
    if (depth < 0.55) {
      // AO ring (dark edge simulates crevice between packed spheres)
      ctx.beginPath(); ctx.arc(px, py, sz * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 40%, ${isDark ? 8 : 14}%, ${alpha * 0.2})`;
      ctx.fill();
      // Flat sphere
      ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha * 0.88})`;
      ctx.fill();
      continue;
    }

    // ── Front spheres: full 3D treatment ──

    // AO ring
    ctx.beginPath(); ctx.arc(px, py, sz * 1.06, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue - 5}, 35%, ${isDark ? 6 : 12}%, ${alpha * 0.18})`;
    ctx.fill();

    // Main gradient — offset highlight
    const g = ctx.createRadialGradient(
      px - sz * 0.35, py - sz * 0.35, sz * 0.04,
      px + sz * 0.1, py + sz * 0.1, sz
    );
    g.addColorStop(0, `hsla(${hue + 4}, ${sat + 15}%, ${light + 22}%, ${alpha})`);
    g.addColorStop(0.3, `hsla(${hue + 2}, ${sat + 8}%, ${light + 10}%, ${alpha * 0.95})`);
    g.addColorStop(0.65, `hsla(${hue}, ${sat}%, ${light}%, ${alpha * 0.82})`);
    g.addColorStop(1, `hsla(${hue - 4}, ${sat - 5}%, ${light - 10}%, ${alpha * 0.5})`);
    ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();

    // Specular — tight bright dot
    if (lit > 0.25 && depth > 0.6) {
      const sa = lit * depth * 0.6;
      const sr = sz * (0.14 + lit * 0.12);
      ctx.beginPath(); ctx.arc(px - sz * 0.28, py - sz * 0.28, sr, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue + 8}, 90%, 85%, ${sa})`;
      ctx.fill();
    }

    // Rim light — green edge highlight
    if (depth > 0.55) {
      const rim = (1 - Math.abs(dot)) * depth * 0.28;
      if (rim > 0.04) {
        const rG = ctx.createRadialGradient(px + sz * 0.3, py + sz * 0.3, sz * 0.45, px, py, sz);
        rG.addColorStop(0, `hsla(${hue + 6}, 80%, 70%, 0)`);
        rG.addColorStop(0.8, `hsla(${hue + 6}, 80%, 70%, ${rim * 0.3})`);
        rG.addColorStop(1, `hsla(${hue + 6}, 80%, 70%, ${rim})`);
        ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = rG; ctx.fill();
      }
    }
  }

  // Hemisphere bloom — soft wash of light on the lit side
  const bloomX = cx - R * 0.3;
  const bloomY = cy - R * 0.35;
  const bloomG = ctx.createRadialGradient(bloomX, bloomY, 0, bloomX, bloomY, R * 0.9);
  bloomG.addColorStop(0, isDark ? 'rgba(27,140,65,0.06)' : 'rgba(27,122,62,0.04)');
  bloomG.addColorStop(0.5, isDark ? 'rgba(27,140,65,0.02)' : 'rgba(27,122,62,0.01)');
  bloomG.addColorStop(1, 'rgba(27,122,62,0)');
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2);
  ctx.fillStyle = bloomG; ctx.fill();

  // Outer glow halo
  const oG = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.45);
  oG.addColorStop(0, isDark ? 'rgba(27,122,62,0.07)' : 'rgba(27,122,62,0.045)');
  oG.addColorStop(1, 'rgba(27,122,62,0)');
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2);
  ctx.fillStyle = oG; ctx.fill();

  ctx.restore();
}

// ── Main component ──
export default function NanoScene({ isDark = true }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animRef = useRef(null);
  const tRef = useRef(0);

  const getColors = useCallback(() => {
    if (isDark) return { pSat: '70%', pLight: '42%', lSat: '60%', lLight: '35%', gA: 0.5 };
    return { pSat: '65%', pLight: '35%', lSat: '55%', lLight: '30%', gA: 0.35 };
  }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particlesRef.current.length === 0) {
        particlesRef.current = Array.from({ length: P_COUNT }, () => createParticle(w, h));
      }
    }

    resize();
    window.addEventListener('resize', resize);

    function handleMouseMove(e) {
      const r = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - r.left;
      mouseRef.current.y = e.clientY - r.top;
    }
    function handleMouseLeave() { mouseRef.current.x = -1000; mouseRef.current.y = -1000; }
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    function getSpherePositions(t) {
      const minDim = Math.min(w, h);
      return SPHERES.map(s => {
        const R = minDim * s.sizeR;
        const cx = w * s.xr;
        const cy = h * s.yr + Math.sin(t * s.floatSpdA + s.floatPhA) * s.floatA + Math.cos(t * s.floatSpdB + s.floatPhB) * s.floatB;
        return { cx, cy, R };
      });
    }

    function animate() {
      tRef.current += 1;
      const frame = tRef.current;
      const t = frame * 0.0025;
      const colors = getColors();
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const spheres = getSpherePositions(t);

      ctx.clearRect(0, 0, w, h);

      // ── Update particles ──
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.vx += (Math.random() - 0.5) * 0.022;
        p.vy += (Math.random() - 0.5) * 0.022;
        p.vx *= 0.993;
        p.vy *= 0.993;

        const mdx = p.x - mouse.x, mdy = p.y - mouse.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < MOUSE_R && mDist > 0) {
          const f = (MOUSE_R - mDist) / MOUSE_R;
          p.vx += (mdx / mDist) * f * 0.5;
          p.vy += (mdy / mDist) * f * 0.5;
        }

        for (const sp of spheres) {
          const sdx = p.x - sp.cx, sdy = p.y - sp.cy;
          const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
          const influenceR = sp.R * 2.8;
          if (sDist < influenceR && sDist > 0) {
            if (sDist < sp.R * 1.15) {
              const push = (sp.R * 1.15 - sDist) / (sp.R * 1.15);
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
        p.size = p.baseSize + Math.sin(frame * p.pulseSp + p.pulseOff) * 0.35;
      }

      // ── Draw connections ──
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONN_DIST) {
            const alpha = (1 - dist / CONN_DIST) * 0.10;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, ${colors.lSat}, ${colors.lLight}, ${alpha})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      // ── Bridge lines to spheres ──
      for (const p of particles) {
        for (const sp of spheres) {
          const dx = p.x - sp.cx, dy = p.y - sp.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const bridgeDist = sp.R * 2.0;
          if (dist < bridgeDist && dist > sp.R * 1.05) {
            const alpha = (1 - (dist - sp.R) / (bridgeDist - sp.R)) * 0.07;
            const nx = sp.cx + (dx / dist) * sp.R;
            const ny = sp.cy + (dy / dist) * sp.R;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny);
            ctx.strokeStyle = `hsla(148, ${colors.lSat}, ${colors.lLight}, ${alpha})`;
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }
        }
      }

      // ── Draw particles ──
      for (const p of particles) {
        const pa = p.opacity + Math.sin(frame * p.pulseSp + p.pulseOff) * 0.08;

        let glowBoost = 0;
        for (const sp of spheres) {
          const dx = p.x - sp.cx, dy = p.y - sp.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < sp.R * 2.5) {
            glowBoost = Math.max(glowBoost, (1 - dist / (sp.R * 2.5)) * 0.18);
          }
        }
        const fa = pa + glowBoost;

        // Glow
        const gG = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
        gG.addColorStop(0, `hsla(${p.hue}, ${colors.pSat}, ${colors.pLight}, ${fa * colors.gA})`);
        gG.addColorStop(1, `hsla(${p.hue}, ${colors.pSat}, ${colors.pLight}, 0)`);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
        ctx.fillStyle = gG; ctx.fill();

        // Core
        const pCG = ctx.createRadialGradient(p.x - p.size * 0.3, p.y - p.size * 0.3, 0, p.x, p.y, p.size);
        pCG.addColorStop(0, `hsla(${p.hue + 10}, 92%, 80%, ${fa})`);
        pCG.addColorStop(0.6, `hsla(${p.hue}, ${colors.pSat}, ${colors.pLight}, ${fa * 0.85})`);
        pCG.addColorStop(1, `hsla(${p.hue - 4}, ${colors.pSat}, ${colors.pLight}, ${fa * 0.25})`);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = pCG; ctx.fill();

        // Specular
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, p.size * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue + 15}, 100%, 92%, ${fa * 0.4})`;
        ctx.fill();
      }

      // ── Draw nanospheres with depth-of-field ──
      for (let si = 0; si < SPHERES.length; si++) {
        const s = SPHERES[si];
        const sp = spheres[si];
        drawSphere(ctx, sp.cx, sp.cy, sp.R,
          t * s.rotMulY + s.rotOffY, t * s.rotMulX + s.rotOffX,
          isDark, s.shell, s.depthScale);
      }

      // ── Vignette ──
      const vG = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
      vG.addColorStop(0, 'rgba(0,0,0,0)');
      vG.addColorStop(1, isDark ? 'rgba(2,6,23,0.4)' : 'rgba(255,255,255,0.28)');
      ctx.fillStyle = vG;
      ctx.fillRect(0, 0, w, h);

      animRef.current = requestAnimationFrame(animate);
    }

    particlesRef.current = Array.from({ length: P_COUNT }, () => createParticle(w, h));
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [getColors, isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'auto' }}
    />
  );
}
