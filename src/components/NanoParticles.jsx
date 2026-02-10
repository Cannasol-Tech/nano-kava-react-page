import React, { useRef, useEffect, useCallback } from 'react';

const PARTICLE_COUNT = 80;
const CONNECTION_DISTANCE = 140;
const MOUSE_RADIUS = 200;
const BASE_SPEED = 0.3;

function createParticle(width, height) {
  const size = Math.random() * 3 + 1.5;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * BASE_SPEED,
    vy: (Math.random() - 0.5) * BASE_SPEED,
    size,
    baseSize: size,
    opacity: Math.random() * 0.5 + 0.3,
    pulseOffset: Math.random() * Math.PI * 2,
    pulseSpeed: 0.01 + Math.random() * 0.02,
    // Color hue varies between emerald (160) and cyan (185)
    hue: 160 + Math.random() * 25,
  };
}

export default function NanoParticles({ isDark = true }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animFrameRef = useRef(null);
  const timeRef = useRef(0);

  const getColors = useCallback(() => {
    if (isDark) {
      return {
        particleSat: '80%',
        particleLight: '65%',
        lineSat: '70%',
        lineLight: '55%',
        glowAlpha: 0.6,
      };
    }
    return {
      particleSat: '70%',
      particleLight: '45%',
      lineSat: '60%',
      lineLight: '40%',
      glowAlpha: 0.4,
    };
  }, [isDark]);

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

      // Re-initialize particles if needed
      if (particlesRef.current.length === 0) {
        particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
          createParticle(width, height)
        );
      }
    }

    resize();
    window.addEventListener('resize', resize);

    function handleMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    }

    function handleMouseLeave() {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    }

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    function animate() {
      timeRef.current += 1;
      const t = timeRef.current;
      const colors = getColors();
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      ctx.clearRect(0, 0, width, height);

      // Update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Organic brownian drift
        p.vx += (Math.random() - 0.5) * 0.04;
        p.vy += (Math.random() - 0.5) * 0.04;

        // Dampen velocity
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          p.vx += (dx / dist) * force * 0.8;
          p.vy += (dy / dist) * force * 0.8;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges with padding
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Pulse size
        p.size = p.baseSize + Math.sin(t * p.pulseSpeed + p.pulseOffset) * 0.5;
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.25;
            const avgHue = (a.hue + b.hue) / 2;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsla(${avgHue}, ${colors.lineSat}, ${colors.lineLight}, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pulseAlpha = p.opacity + Math.sin(t * p.pulseSpeed + p.pulseOffset) * 0.15;

        // Outer glow
        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        glowGrad.addColorStop(0, `hsla(${p.hue}, ${colors.particleSat}, ${colors.particleLight}, ${pulseAlpha * colors.glowAlpha})`);
        glowGrad.addColorStop(1, `hsla(${p.hue}, ${colors.particleSat}, ${colors.particleLight}, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // Core particle
        const coreGrad = ctx.createRadialGradient(
          p.x - p.size * 0.3,
          p.y - p.size * 0.3,
          0,
          p.x,
          p.y,
          p.size
        );
        coreGrad.addColorStop(0, `hsla(${p.hue + 10}, 90%, 80%, ${pulseAlpha})`);
        coreGrad.addColorStop(0.6, `hsla(${p.hue}, ${colors.particleSat}, ${colors.particleLight}, ${pulseAlpha * 0.9})`);
        coreGrad.addColorStop(1, `hsla(${p.hue - 5}, ${colors.particleSat}, ${colors.particleLight}, ${pulseAlpha * 0.4})`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();

        // Specular highlight
        const specSize = p.size * 0.35;
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.25, p.y - p.size * 0.25, specSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue + 20}, 100%, 95%, ${pulseAlpha * 0.5})`;
        ctx.fill();
      }

      // Draw mouse interaction ring (subtle)
      if (mouse.x > 0 && mouse.y > 0) {
        const ringGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_RADIUS);
        ringGrad.addColorStop(0, `hsla(168, 80%, 60%, 0.03)`);
        ringGrad.addColorStop(0.7, `hsla(168, 80%, 60%, 0.01)`);
        ringGrad.addColorStop(1, `hsla(168, 80%, 60%, 0)`);
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, MOUSE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = ringGrad;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    }

    // Initialize particles
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(width, height)
    );

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [getColors]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'auto' }}
    />
  );
}
