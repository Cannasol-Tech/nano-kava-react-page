import React, { useRef, useEffect } from 'react';

// Fibonacci sphere distribution for even point placement
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
  return {
    x: point.x * cos + point.z * sin,
    y: point.y,
    z: -point.x * sin + point.z * cos,
  };
}

function rotateX(point, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x,
    y: point.y * cos - point.z * sin,
    z: point.y * sin + point.z * cos,
  };
}

// A single nanoemulsion particle (shell of small spheres + gold core)
function drawNanoParticle(ctx, cx, cy, shellRadius, rotY, rotX, isDark) {
  const shellPoints = fibonacciSphere(90);
  const subSphereRadius = shellRadius * 0.12;

  // Colors
  const coreColor = isDark
    ? 'rgba(218, 175, 60, 0.35)'
    : 'rgba(200, 160, 40, 0.30)';
  const coreHighlight = isDark
    ? 'rgba(240, 200, 80, 0.15)'
    : 'rgba(220, 180, 60, 0.12)';

  // Draw glowing core first (visible through gaps)
  const coreRadius = shellRadius * 0.55;
  const coreGrad = ctx.createRadialGradient(
    cx - coreRadius * 0.2, cy - coreRadius * 0.2, coreRadius * 0.1,
    cx, cy, coreRadius
  );
  coreGrad.addColorStop(0, coreHighlight);
  coreGrad.addColorStop(0.6, coreColor);
  coreGrad.addColorStop(1, 'rgba(218, 175, 60, 0)');
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // Transform and sort shell points by Z for depth ordering
  const transformed = shellPoints.map((p) => {
    let pt = rotateY(p, rotY);
    pt = rotateX(pt, rotX);
    return pt;
  });

  // Sort back-to-front
  const indexed = transformed.map((p, i) => ({ ...p, i }));
  indexed.sort((a, b) => a.z - b.z);

  for (const pt of indexed) {
    const perspective = 1 + pt.z * 0.25;
    const px = cx + pt.x * shellRadius * perspective;
    const py = cy + pt.y * shellRadius * perspective;
    const sz = subSphereRadius * (0.7 + pt.z * 0.3);

    if (sz < 0.5) continue;

    // Depth-based lighting
    const depthFactor = (pt.z + 1) / 2; // 0 = back, 1 = front
    const lightness = 45 + depthFactor * 25;
    const saturation = 65 + depthFactor * 15;
    const alpha = 0.3 + depthFactor * 0.6;

    // Hue shifts between teal and blue-ish
    const hue = isDark ? 175 + pt.y * 15 : 170 + pt.y * 15;

    // Shadow/depth on back spheres
    const shadowAlpha = isDark ? 0.4 : 0.25;
    if (depthFactor < 0.5) {
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness - 15}%, ${alpha * shadowAlpha})`;
      ctx.fill();
      continue;
    }

    // Main sub-sphere with gradient for 3D look
    const grad = ctx.createRadialGradient(
      px - sz * 0.3, py - sz * 0.3, sz * 0.1,
      px, py, sz
    );
    grad.addColorStop(0, `hsla(${hue + 15}, ${saturation + 10}%, ${lightness + 20}%, ${alpha})`);
    grad.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.9})`);
    grad.addColorStop(1, `hsla(${hue - 10}, ${saturation - 10}%, ${lightness - 15}%, ${alpha * 0.5})`);

    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Specular highlight
    if (depthFactor > 0.6) {
      ctx.beginPath();
      ctx.arc(px - sz * 0.25, py - sz * 0.25, sz * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue + 20}, 100%, 92%, ${depthFactor * 0.35})`;
      ctx.fill();
    }
  }

  // Outer glow around the whole structure
  const outerGlow = ctx.createRadialGradient(cx, cy, shellRadius * 0.8, cx, cy, shellRadius * 1.6);
  outerGlow.addColorStop(0, isDark ? 'rgba(16, 185, 160, 0.06)' : 'rgba(16, 185, 160, 0.04)');
  outerGlow.addColorStop(1, 'rgba(16, 185, 160, 0)');
  ctx.beginPath();
  ctx.arc(cx, cy, shellRadius * 1.6, 0, Math.PI * 2);
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
      t += 0.003;
      ctx.clearRect(0, 0, width, height);

      // Large particle — left-center area, with cutaway feel
      const largeR = Math.min(width, height) * 0.22;
      const largeCx = width * 0.28;
      const largeCy = height * 0.48;
      const largeFloat = Math.sin(t * 1.2) * 8;
      drawNanoParticle(ctx, largeCx, largeCy + largeFloat, largeR, t * 0.6, t * 0.3 + 0.3, isDark);

      // Medium particle — upper right
      const medR = Math.min(width, height) * 0.11;
      const medCx = width * 0.62;
      const medCy = height * 0.28;
      const medFloat = Math.sin(t * 1.5 + 1) * 6;
      drawNanoParticle(ctx, medCx, medCy + medFloat, medR, t * 0.8 + 2, t * 0.4 + 1, isDark);

      // Small particle — bottom right
      const smR = Math.min(width, height) * 0.065;
      const smCx = width * 0.78;
      const smCy = height * 0.65;
      const smFloat = Math.sin(t * 1.8 + 2.5) * 4;
      drawNanoParticle(ctx, smCx, smCy + smFloat, smR, t * 1.0 + 4, t * 0.5 + 2, isDark);

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
