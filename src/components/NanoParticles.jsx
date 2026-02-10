import React, { useRef, useEffect, useCallback } from 'react';

const PARTICLE_COUNT = 55;
const CONNECTION_DISTANCE = 130;
const MOUSE_RADIUS = 180;
const BASE_SPEED = 0.2;

function createParticle(width, height) {
  const size = Math.random() * 2.5 + 1;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * BASE_SPEED,
    vy: (Math.random() - 0.5) * BASE_SPEED,
    size,
    baseSize: size,
    opacity: Math.random() * 0.35 + 0.15,
    pulseOffset: Math.random() * Math.PI * 2,
    pulseSpeed: 0.008 + Math.random() * 0.012,
    // Darker emerald-green range (140–162)
    hue: 140 + Math.random() * 22,
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
        particleSat: '75%',
        particleLight: '42%',
        lineSat: '60%',
        lineLight: '35%',
        glowAlpha: 0.5,
      };
    }
    return {
      particleSat: '65%',
      particleLight: '32%',
      lineSat: '55%',
      lineLight: '30%',
      glowAlpha: 0.35,
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

        p.vx += (Math.random() - 0.5) * 0.025;
        p.vy += (Math.random() - 0.5) * 0.025;
        p.vx *= 0.992;
        p.vy *= 0.992;

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          p.vx += (dx / dist) * force * 0.6;
          p.vy += (dy / dist) * force * 0.6;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        p.size = p.baseSize + Math.sin(t * p.pulseSpeed + p.pulseOffset) * 0.4;
      }

      // Draw connections — thinner, subtler
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.15;
            const avgHue = (a.hue + b.hue) / 2;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsla(${avgHue}, ${colors.lineSat}, ${colors.lineLight}, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pulseAlpha = p.opacity + Math.sin(t * p.pulseSpeed + p.pulseOffset) * 0.1;

        // Soft glow
        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
        glowGrad.addColorStop(0, `hsla(${p.hue}, ${colors.particleSat}, ${colors.particleLight}, ${pulseAlpha * colors.glowAlpha})`);
        glowGrad.addColorStop(1, `hsla(${p.hue}, ${colors.particleSat}, ${colors.particleLight}, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // Core
        const coreGrad = ctx.createRadialGradient(
          p.x - p.size * 0.3, p.y - p.size * 0.3, 0,
          p.x, p.y, p.size
        );
        coreGrad.addColorStop(0, `hsla(${p.hue + 8}, 80%, 60%, ${pulseAlpha})`);
        coreGrad.addColorStop(0.6, `hsla(${p.hue}, ${colors.particleSat}, ${colors.particleLight}, ${pulseAlpha * 0.85})`);
        coreGrad.addColorStop(1, `hsla(${p.hue - 5}, ${colors.particleSat}, ${colors.particleLight}, ${pulseAlpha * 0.3})`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();

        // Tiny specular
        const specSize = p.size * 0.3;
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, specSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue + 15}, 100%, 85%, ${pulseAlpha * 0.35})`;
        ctx.fill();
      }

      // Mouse glow
      if (mouse.x > 0 && mouse.y > 0) {
        const ringGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_RADIUS);
        ringGrad.addColorStop(0, 'hsla(152, 70%, 40%, 0.025)');
        ringGrad.addColorStop(0.7, 'hsla(152, 70%, 40%, 0.008)');
        ringGrad.addColorStop(1, 'hsla(152, 70%, 40%, 0)');
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, MOUSE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = ringGrad;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    }

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
