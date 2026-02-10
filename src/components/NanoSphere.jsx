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

  // --- Golden core (visible through gaps) ---
  const coreR = shellRadius * 0.52;
  const coreGrad = ctx.createRadialGradient(
    cx - coreR * 0.25, cy - coreR * 0.25, coreR * 0.05,
    cx, cy, coreR
  );
  if (isDark) {
    coreGrad.addColorStop(0, 'rgba(255, 210, 80, 0.22)');
    coreGrad.addColorStop(0.4, 'rgba(230, 180, 50, 0.18)');
    coreGrad.addColorStop(0.8, 'rgba(200, 155, 40, 0.10)');
    coreGrad.addColorStop(1, 'rgba(180, 140, 30, 0)');
  } else {
    coreGrad.addColorStop(0, 'rgba(240, 195, 60, 0.18)');
    coreGrad.addColorStop(0.4, 'rgba(215, 170, 45, 0.14)');
    coreGrad.addColorStop(0.8, 'rgba(190, 150, 35, 0.07)');
    coreGrad.addColorStop(1, 'rgba(170, 130, 25, 0)');
  }
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // --- Inner glow around core ---
  const innerGlow = ctx.createRadialGradient(cx, cy, coreR * 0.6, cx, cy, shellRadius * 0.85);
  innerGlow.addColorStop(0, isDark ? 'rgba(16, 140, 90, 0.06)' : 'rgba(16, 140, 90, 0.04)');
  innerGlow.addColorStop(1, 'rgba(16, 140, 90, 0)');
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

    // Deeper, richer green-teal hues (148–168)
    const hue = isDark ? 148 + pt.y * 12 + lighting * 8 : 145 + pt.y * 12 + lighting * 8;

    // Back-face: dark silhouette with slight color
    if (depth < 0.35) {
      const backAlpha = 0.15 + depth * 0.25;
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 55%, ${isDark ? 18 : 22}%, ${backAlpha})`;
      ctx.fill();
      continue;
    }

    // Mid and front spheres
    const baseSat = 60 + lighting * 20;
    const baseLight = isDark ? 28 + lighting * 28 + depth * 10 : 25 + lighting * 25 + depth * 8;
    const alpha = 0.5 + depth * 0.45;

    // Main gradient
    const grad = ctx.createRadialGradient(
      px - sz * 0.35, py - sz * 0.35, sz * 0.05,
      px + sz * 0.1, py + sz * 0.1, sz
    );
    grad.addColorStop(0, `hsla(${hue + 12}, ${baseSat + 15}%, ${baseLight + 22}%, ${alpha})`);
    grad.addColorStop(0.35, `hsla(${hue + 5}, ${baseSat + 8}%, ${baseLight + 10}%, ${alpha * 0.92})`);
    grad.addColorStop(0.7, `hsla(${hue}, ${baseSat}%, ${baseLight}%, ${alpha * 0.8})`);
    grad.addColorStop(1, `hsla(${hue - 8}, ${baseSat - 10}%, ${baseLight - 12}%, ${alpha * 0.45})`);

    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Specular highlight — tight, bright
    if (lighting > 0.3 && depth > 0.5) {
      const specAlpha = lighting * depth * 0.5;
      const specR = sz * (0.2 + lighting * 0.15);
      ctx.beginPath();
      ctx.arc(px - sz * 0.28, py - sz * 0.28, specR, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue + 25}, 100%, 90%, ${specAlpha})`;
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
        rimGrad.addColorStop(0, `hsla(${hue + 20}, 80%, 75%, 0)`);
        rimGrad.addColorStop(0.8, `hsla(${hue + 20}, 80%, 75%, ${rimStrength * 0.4})`);
        rimGrad.addColorStop(1, `hsla(${hue + 20}, 80%, 75%, ${rimStrength})`);
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = rimGrad;
        ctx.fill();
      }
    }
  }

  // --- Outer glow halo ---
  const outerGlow = ctx.createRadialGradient(cx, cy, shellRadius * 0.85, cx, cy, shellRadius * 1.5);
  outerGlow.addColorStop(0, isDark ? 'rgba(16, 160, 110, 0.07)' : 'rgba(16, 160, 110, 0.045)');
  outerGlow.addColorStop(1, 'rgba(16, 160, 110, 0)');
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
