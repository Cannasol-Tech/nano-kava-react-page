import React, { useRef, useEffect } from 'react';

// Fibonacci sphere for even point distribution on a sphere surface
function fibonacciSphere(count) {
  const points = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    points.push({
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
    });
  }
  return points;
}

function rotateY(point, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: point.x * cos + point.z * sin, y: point.y, z: -point.x * sin + point.z * cos };
}

function rotateX(point, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: point.x, y: point.y * cos - point.z * sin, z: point.y * sin + point.z * cos };
}

// Precompute shell points for reuse
const shellPointsLarge = fibonacciSphere(120);
const shellPointsMed = fibonacciSphere(80);
const shellPointsSmall = fibonacciSphere(50);

function drawNanoParticle(ctx, cx, cy, shellRadius, rotYAngle, rotXAngle, isDark, shellPoints) {
  const subR = shellRadius * 0.11;

  // --- Ambient shadow beneath the sphere ---
  const shadowGrad = ctx.createRadialGradient(cx, cy + shellRadius * 0.9, 0, cx, cy + shellRadius * 0.9, shellRadius * 1.1);
  shadowGrad.addColorStop(0, isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.ellipse(cx, cy + shellRadius * 0.9, shellRadius * 1.1, shellRadius * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = shadowGrad;
  ctx.fill();

  // --- Golden core (opaque base layer) ---
  const coreR = shellRadius * 0.72;

  // Solid base to block transparency
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? 'rgb(190, 140, 20)' : 'rgb(185, 135, 20)';
  ctx.fill();

  // Gradient overlay with very gradual fade for seamless blend
  const coreGrad = ctx.createRadialGradient(
    cx - coreR * 0.25, cy - coreR * 0.25, coreR * 0.05,
    cx, cy, coreR * 1.4
  );
  if (isDark) {
    coreGrad.addColorStop(0, 'rgba(255, 220, 60, 1.0)');
    coreGrad.addColorStop(0.25, 'rgba(248, 205, 48, 0.92)');
    coreGrad.addColorStop(0.45, 'rgba(235, 185, 38, 0.75)');
    coreGrad.addColorStop(0.6, 'rgba(220, 165, 30, 0.5)');
    coreGrad.addColorStop(0.75, 'rgba(205, 150, 25, 0.25)');
    coreGrad.addColorStop(0.88, 'rgba(195, 140, 22, 0.1)');
    coreGrad.addColorStop(0.96, 'rgba(190, 140, 20, 0.02)');
    coreGrad.addColorStop(1, 'rgba(190, 140, 20, 0)');
  } else {
    coreGrad.addColorStop(0, 'rgba(255, 215, 50, 1.0)');
    coreGrad.addColorStop(0.25, 'rgba(245, 200, 40, 0.92)');
    coreGrad.addColorStop(0.45, 'rgba(230, 180, 32, 0.75)');
    coreGrad.addColorStop(0.6, 'rgba(215, 160, 25, 0.5)');
    coreGrad.addColorStop(0.75, 'rgba(200, 145, 22, 0.25)');
    coreGrad.addColorStop(0.88, 'rgba(190, 135, 20, 0.1)');
    coreGrad.addColorStop(0.96, 'rgba(185, 135, 20, 0.02)');
    coreGrad.addColorStop(1, 'rgba(185, 135, 20, 0)');
  }
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // --- Inner glow around core ---
  const innerGlow = ctx.createRadialGradient(cx, cy, coreR * 0.6, cx, cy, shellRadius * 0.85);
  innerGlow.addColorStop(0, isDark ? 'rgba(27, 122, 62, 0.06)' : 'rgba(27, 122, 62, 0.04)');
  innerGlow.addColorStop(1, 'rgba(27, 122, 62, 0)');
  ctx.beginPath();
  ctx.arc(cx, cy, shellRadius * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = innerGlow;
  ctx.fill();

  // --- Transform and depth-sort shell points ---
  const transformed = shellPoints.map((p) => {
    let pt = rotateY(p, rotYAngle);
    pt = rotateX(pt, rotXAngle);
    return pt;
  });
  const sorted = transformed.map((p, i) => ({ ...p, i })).sort((a, b) => a.z - b.z);

  // Light direction (top-left-front)
  const lightX = -0.4, lightY = -0.5, lightZ = 0.7;
  const lightLen = Math.sqrt(lightX * lightX + lightY * lightY + lightZ * lightZ);

  for (const pt of sorted) {
    const perspective = 1 + pt.z * 0.3;
    const px = cx + pt.x * shellRadius * perspective;
    const py = cy + pt.y * shellRadius * perspective;
    const sz = subR * (0.65 + pt.z * 0.35);
    if (sz < 0.4) continue;

    const depth = (pt.z + 1) / 2; // 0=back, 1=front

    // Lighting via dot product with light direction
    const dot = (pt.x * lightX + pt.y * lightY + pt.z * lightZ) / lightLen;
    const lighting = Math.max(0, dot);

    // Cannasol logo forest green (~#1A7A3D)
    const hue = 148;

    // Skip back-facing particles (they're behind the core)
    if (depth < 0.35) {
      continue;
    }

    // Mid and front spheres
    const baseSat = 60 + lighting * 18;
    const baseLight = isDark ? 20 + lighting * 22 + depth * 8 : 18 + lighting * 20 + depth * 6;
    const alpha = 0.5 + depth * 0.45;

    // Main gradient — keep hue offsets small to stay in green range
    const grad = ctx.createRadialGradient(
      px - sz * 0.35, py - sz * 0.35, sz * 0.05,
      px + sz * 0.1, py + sz * 0.1, sz
    );
    grad.addColorStop(0, `hsla(${hue + 4}, ${baseSat + 15}%, ${baseLight + 22}%, ${alpha})`);
    grad.addColorStop(0.35, `hsla(${hue + 2}, ${baseSat + 8}%, ${baseLight + 10}%, ${alpha * 0.92})`);
    grad.addColorStop(0.7, `hsla(${hue}, ${baseSat}%, ${baseLight}%, ${alpha * 0.8})`);
    grad.addColorStop(1, `hsla(${hue - 4}, ${baseSat - 5}%, ${baseLight - 12}%, ${alpha * 0.45})`);

    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Specular highlight — tight, bright green
    if (lighting > 0.3 && depth > 0.5) {
      const specAlpha = lighting * depth * 0.5;
      const specR = sz * (0.2 + lighting * 0.15);
      ctx.beginPath();
      ctx.arc(px - sz * 0.28, py - sz * 0.28, specR, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue + 8}, 90%, 85%, ${specAlpha})`;
      ctx.fill();
    }

    // Rim light — subtle edge highlight on front-facing spheres near the silhouette edge
    if (depth > 0.55) {
      const rimStrength = (1 - Math.abs(dot)) * depth * 0.3;
      if (rimStrength > 0.05) {
        const rimGrad = ctx.createRadialGradient(
          px + sz * 0.3, py + sz * 0.3, sz * 0.5,
          px, py, sz
        );
        rimGrad.addColorStop(0, `hsla(${hue + 6}, 80%, 70%, 0)`);
        rimGrad.addColorStop(0.8, `hsla(${hue + 6}, 80%, 70%, ${rimStrength * 0.4})`);
        rimGrad.addColorStop(1, `hsla(${hue + 6}, 80%, 70%, ${rimStrength})`);
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = rimGrad;
        ctx.fill();
      }
    }
  }

  // --- Outer glow halo ---
  const outerGlow = ctx.createRadialGradient(cx, cy, shellRadius * 0.85, cx, cy, shellRadius * 1.5);
  outerGlow.addColorStop(0, isDark ? 'rgba(27, 122, 62, 0.07)' : 'rgba(27, 122, 62, 0.045)');
  outerGlow.addColorStop(1, 'rgba(27, 122, 62, 0)');
  ctx.beginPath();
  ctx.arc(cx, cy, shellRadius * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = outerGlow;
  ctx.fill();
}

export default function NanoSphere({ isDark = true }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    let t = 0;

    function animate() {
      t += 0.0025;
      ctx.clearRect(0, 0, width, height);

      // Large — left side
      const lgR = Math.min(width, height) * 0.23;
      const lgX = width * 0.22;
      const lgY = height * 0.50;
      const lgFloat = Math.sin(t * 1.1) * 10 + Math.cos(t * 0.7) * 4;
      drawNanoParticle(ctx, lgX, lgY + lgFloat, lgR, t * 0.5, t * 0.25 + 0.4, isDark, shellPointsLarge);

      // Medium — upper right
      const mdR = Math.min(width, height) * 0.12;
      const mdX = width * 0.68;
      const mdY = height * 0.30;
      const mdFloat = Math.sin(t * 1.4 + 1.2) * 7 + Math.cos(t * 0.9 + 0.5) * 3;
      drawNanoParticle(ctx, mdX, mdY + mdFloat, mdR, t * 0.7 + 2, t * 0.35 + 1.2, isDark, shellPointsMed);

      // Small — lower right
      const smR = Math.min(width, height) * 0.06;
      const smX = width * 0.82;
      const smY = height * 0.62;
      const smFloat = Math.sin(t * 1.7 + 2.8) * 5 + Math.cos(t * 1.1 + 1.8) * 2;
      drawNanoParticle(ctx, smX, smY + smFloat, smR, t * 0.9 + 4, t * 0.45 + 2.5, isDark, shellPointsSmall);

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
