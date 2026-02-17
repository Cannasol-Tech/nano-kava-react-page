import React, { useRef, useEffect, useCallback } from 'react';
import { registerAnimation, unregisterAnimation } from '../utils/animationLoop';

const PARTICLE_COUNT = 55;
const CONNECTION_DISTANCE = 130;
const CONNECTION_DISTANCE_SQ = CONNECTION_DISTANCE * CONNECTION_DISTANCE;
const MOUSE_RADIUS = 180;
const MOUSE_RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;
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
  const visibleRef = useRef(true);

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
    let cachedRect = { left: 0, top: 0 };
    let frameCounter = 0;

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
      cachedRect = canvas.getBoundingClientRect();

      if (particlesRef.current.length === 0) {
        particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
          createParticle(width, height)
        );
      }
    }

    resize();
    window.addEventListener('resize', resize);

    function handleMouseMove(e) {
      mouseRef.current.x = e.clientX - cachedRect.left;
      mouseRef.current.y = e.clientY - cachedRect.top;
    }

    function handleMouseLeave() {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    }

    canvas.addEventListener('mousemove', handleMouseMove, { passive: true });
    canvas.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    // Pause rendering when canvas scrolls offscreen
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    }, { threshold: 0 });
    observer.observe(canvas);

    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(width, height)
    );

    const animId = Symbol('nanoParticles');

    registerAnimation(animId, () => {
      if (!visibleRef.current) return;

      frameCounter++;
      const t = frameCounter;
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
        const distSq = dx * dx + dy * dy;
        if (distSq < MOUSE_RADIUS_SQ && distSq > 0) {
          const dist = Math.sqrt(distSq);
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

      // Draw connections — batched into single path
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = `hsla(151, ${colors.lineSat}, ${colors.lineLight}, 0.08)`;
      ctx.beginPath();
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const cdx = a.x - b.x;
          const cdy = a.y - b.y;
          if (cdx * cdx + cdy * cdy < CONNECTION_DISTANCE_SQ) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
          }
        }
      }
      ctx.stroke();

      // Draw particles — solid fills instead of gradients
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pulseAlpha = p.opacity + Math.sin(t * p.pulseSpeed + p.pulseOffset) * 0.1;

        // Soft glow — solid circle with low alpha
        ctx.globalAlpha = pulseAlpha * colors.glowAlpha * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${p.hue}, ${colors.particleSat}, ${colors.particleLight})`;
        ctx.fill();

        // Core — brighter solid
        ctx.globalAlpha = pulseAlpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${p.hue + 8}, 80%, 60%)`;
        ctx.fill();

        // Tiny specular
        ctx.globalAlpha = pulseAlpha * 0.35;
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, p.size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${p.hue + 15}, 100%, 85%)`;
        ctx.fill();

        ctx.globalAlpha = 1;
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
    });

    return () => {
      unregisterAnimation(animId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
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
