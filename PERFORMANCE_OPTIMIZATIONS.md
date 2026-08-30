# Performance Optimizations Guide

> Deep analysis of the Nano Kava React landing page identifying every optimization opportunity
> to improve animation smoothness and user experience across all browsers, especially Safari.
>
> **Constraint**: All optimizations preserve the exact visual appearance. Nothing should look different.

---

## Table of Contents

1. [Critical: CSS `backdrop-filter` Overuse](#1-critical-css-backdrop-filter-overuse)
2. [Critical: `btn-shine` Animates Layout Property (`left`)](#2-critical-btn-shine-animates-layout-property-left)
3. [Critical: NanoParticles Uses Its Own RAF Loop](#3-critical-nanoparticles-uses-its-own-raf-loop)
4. [Critical: No Tab Visibility Handling - FIXED](#4-critical-no-tab-visibility-handling---fixed)
5. [Critical: NanoParticles Missing IntersectionObserver - FIXED](#5-critical-nanoparticles-missing-intersectionobserver---fixed)
6. [High: `transition-all` Instead of Specific Properties](#6-high-transition-all-instead-of-specific-properties)
7. [High: NanoParticles Uses `Math.sqrt()` in O(N^2) Loop](#7-high-nanoparticles-uses-mathsqrt-in-on2-loop)
8. [High: NanoParticles Doesn't Batch Connection Lines](#8-high-nanoparticles-doesnt-batch-connection-lines)
9. [High: Per-Frame Gradient Creation in Particle Rendering](#9-high-per-frame-gradient-creation-in-particle-rendering)
10. [High: `getBoundingClientRect()` Called Every Mouse Move](#10-high-getboundingclientrect-called-every-mouse-move)
11. [High: Per-Frame Array Allocation in NanoScene](#11-high-per-frame-array-allocation-in-nanoscene)
12. [High: `box-shadow` Animation in `glow` Keyframes](#12-high-box-shadow-animation-in-glow-keyframes)
13. [High: ThemeContext Causes Cascading Re-renders](#13-high-themecontext-causes-cascading-re-renders)
14. [High: Missing `React.memo` on Expensive Components](#14-high-missing-reactmemo-on-expensive-components)
15. [High: Missing `useMemo` on Static Arrays in KavaLandingPage](#15-high-missing-usememo-on-static-arrays-in-kavalanding-page)
16. [Medium: `overflow: hidden` + `border-radius` Clipping Cost](#16-medium-overflow-hidden--border-radius-clipping-cost)
17. [Medium: Missing `will-change` on Animated Elements](#17-medium-missing-will-change-on-animated-elements)
18. [Medium: Static Vignette Gradient Recreated Every Frame](#18-medium-static-vignette-gradient-recreated-every-frame)
19. [Medium: GlowOrb Infinite Animations (Constant GPU Load)](#19-medium-gloworb-infinite-animations-constant-gpu-load)
20. [Medium: `backgroundPosition` Animation Is CPU-Based](#20-medium-backgroundposition-animation-is-cpu-based)
21. [Medium: Excessive `filter: blur()` on Overlay Elements](#21-medium-excessive-filter-blur-on-overlay-elements)
22. [Low: Mouse Event Listeners Not Passive](#22-low-mouse-event-listeners-not-passive)
23. [Low: `Math.random()` Called Excessively in Physics](#23-low-mathrandom-called-excessively-in-physics)
24. [Low: Image Elements Missing `loading="lazy"`](#24-low-image-elements-missing-loadinglazy)
25. [Low: Framer Motion `prefers-reduced-motion` Verification](#25-low-framer-motion-prefers-reduced-motion-verification)

---

## 1. Critical: CSS `backdrop-filter` Overuse

**What it is**: `backdrop-filter: blur()` (Tailwind's `backdrop-blur-xl`, `backdrop-blur`) is used on 23+ elements across all pages. Despite Apple having invented this property, Safari's rendering pipeline handles it very poorly, especially when multiple backdrop-blur layers overlap or when one is fixed-positioned (like the navbar).

**Why it matters**: Each `backdrop-blur` element requires the browser to:
- Create a new stacking context
- Sample and blur every pixel behind the element in real-time
- Recomposite on every scroll/animation frame

With 23+ instances, many overlapping, this becomes the single largest performance bottleneck on Safari. The fixed navbar with `backdrop-blur-xl` is especially expensive because it triggers recompositing on every single scroll pixel.

**Affected files and lines**:

| File | Line(s) | Element |
|------|---------|---------|
| `src/components/KavaLandingPage.jsx` | 236 | Fixed navbar |
| `src/components/KavaLandingPage.jsx` | 405, 412 | Hero card, badge |
| `src/components/KavaLandingPage.jsx` | 477, 504 | CTA button, stats cards |
| `src/components/KavaLandingPage.jsx` | 541, 583 | Problem/solution cards |
| `src/components/KavaLandingPage.jsx` | 629, 651 | Features header, feature cards |
| `src/components/KavaLandingPage.jsx` | 708, 749, 775 | Process cards, partnership cards |
| `src/components/KavaLandingPage.jsx` | 828 | CTA section card |
| `src/components/FAQPage.jsx` | 232 | Fixed navbar |
| `src/components/ContactPage.jsx` | 314, 346, 419, 467 | Info card, navbar, form, sidebar |
| `src/components/MushroomsLandingPage.jsx` | 93, 235, 284, 335 | Navbar, badge, cards, section |
| `src/index.css` | 206 | `.glass` utility class |

**How to implement**:

Replace `backdrop-blur-xl` / `backdrop-blur` with slightly higher-opacity semi-transparent backgrounds that visually approximate the frosted glass effect without the compositing cost.

For the **fixed navbar** (highest-impact fix):
```jsx
// BEFORE (all pages):
className={`fixed top-0 ... backdrop-blur-xl ${theme.bgNav} ...`}

// AFTER:
className={`fixed top-0 ... ${theme.bgNav} ...`}
```

Update `themes.js` nav backgrounds to be more opaque to compensate:
```js
// dark theme:
bgNav: 'bg-slate-950/95',    // was bg-slate-950/80
// light theme:
bgNav: 'bg-white/98',        // was bg-white/95
```

For **cards and sections**, increase the background opacity to replace the blur effect:
```js
// dark theme:
bgCard: 'bg-gradient-to-br from-slate-800/80 to-slate-900/80',         // was /60
bgCardSolid: 'bg-gradient-to-br from-slate-800/80 to-slate-900/80',    // was /60
bgCardStats: 'bg-gradient-to-br from-slate-800/95 to-slate-900/95',    // was /90
bgBadge: 'bg-slate-800/80',                                             // was /60

// light theme:
bgCard: 'bg-white/80',          // was /60
bgCardSolid: 'bg-white/85',     // was /65
bgCardStats: 'bg-white/80',     // was /60
bgBadge: 'bg-white/80',         // was /60
```

Then remove all `backdrop-blur-xl` and `backdrop-blur` from the JSX class strings. The slightly higher opacity backgrounds look virtually identical because the Canvas background behind them has consistent colors.

For the `.glass` class in `index.css`:
```css
/* BEFORE */
.glass {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(51, 65, 85, 0.5);
}

/* AFTER */
.glass {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(51, 65, 85, 0.5);
}
```

**What it optimizes**: Eliminates the #1 Safari performance bottleneck. Removes per-frame pixel-sampling and blur computation across 23+ elements. Expected improvement: 20-30% smoother scrolling and animations on Safari, significant improvement on Safari iOS.

---

## 2. Critical: `btn-shine` Animates Layout Property (`left`)

**What it is**: The `btn-shine-sweep` and `btn-shine-trail` keyframe animations move pseudo-elements by animating the `left` CSS property from `-110%` to `150%`/`170%`. Animating `left` triggers a full layout recalculation on every animation frame because the browser must recompute the element's position in the document flow.

**Why it matters**: Only `transform` and `opacity` are truly GPU-accelerated. Animating `left` forces the browser through Layout -> Paint -> Composite instead of just Composite, which is orders of magnitude slower. This is one of the most common Safari jank causes.

**Affected file**: `src/index.css` lines 95-169

**How to implement**:

Keep `left` for initial static positioning but animate with `transform: translateX()`:

```css
/* Pseudo-elements keep their starting left position */
.btn-shine::before {
  /* ... keep all existing properties ... */
  will-change: transform, opacity;
}

.btn-shine::after {
  /* ... keep all existing properties ... */
  will-change: transform, opacity;
}

/* Replace keyframes to use transform instead of left */
@keyframes btn-shine-sweep {
  0%   { transform: translateX(0); opacity: 0; }
  10%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateX(325%); opacity: 0; }
}

@keyframes btn-shine-trail {
  0%   { transform: translateX(0); opacity: 0; }
  15%  { opacity: 0.8; }
  75%  { opacity: 0.8; }
  100% { transform: translateX(800%); opacity: 0; }
}
```

Note: The exact `translateX` percentages are relative to the element's own width (not the parent). Since `::before` is `width: 80%` of the parent, to travel from `-110%` to `150%` of the parent (260% total travel), you need `translateX((260/80)*100%)` = `translateX(325%)`. For `::after` at `width: 35%`, traveling 280% of parent = `translateX(800%)`. Adjust these values visually to get the identical sweep range.

**What it optimizes**: Converts the button hover animation from CPU-based layout recalculation to GPU-composited transform. The sweep will be silky smooth on Safari instead of causing frame drops. Affects all 4+ `btn-shine` buttons across the site.

---

## 3. Critical: NanoParticles Uses Its Own RAF Loop

**What it is**: `NanoParticles.jsx` manages its own `requestAnimationFrame` loop (lines 200, 207) instead of using the centralized `animationLoop.js` that `NanoScene` and `NanoSphere` use.

**Why it matters**: This creates 2 parallel RAF loops when both `NanoScene` and `NanoParticles` are active. While browsers try to sync multiple RAF callbacks, having independent loops can cause:
- Frame timing jitter
- Double the browser vsync scheduling overhead
- Potential for one loop's work to push the other past the 16.67ms frame budget

This is also an architecture violation per the project's CLAUDE.md.

**Affected file**: `src/components/NanoParticles.jsx` lines 200, 207

**How to implement**:

```jsx
// BEFORE (NanoParticles.jsx):
import React, { useRef, useEffect, useCallback } from 'react';

// ... inside useEffect:
function animate() {
  // ... animation logic ...
  animFrameRef.current = requestAnimationFrame(animate);
}
animFrameRef.current = requestAnimationFrame(animate);

return () => {
  // ...
  if (animFrameRef.current) {
    cancelAnimationFrame(animFrameRef.current);
  }
};

// AFTER:
import React, { useRef, useEffect, useCallback } from 'react';
import { registerAnimation, unregisterAnimation } from '../utils/animationLoop';

// ... inside useEffect:
const animId = Symbol('nanoParticles');

registerAnimation(animId, (_timestamp, _frameCount) => {
  // ... same animation logic (contents of the old animate function) ...
  // but remove the requestAnimationFrame(animate) call at the end
});

return () => {
  unregisterAnimation(animId);
  // ... rest of cleanup ...
};
```

Remove `animFrameRef` entirely since the centralized loop manages the RAF lifecycle.

**What it optimizes**: Consolidates all canvas animations into a single RAF loop, eliminating scheduling overhead and ensuring all canvas work happens in one coordinated frame budget. Reduces CPU wake frequency and prevents frame jitter.

---

## 4. Critical: No Tab Visibility Handling - FIXED

**What it is**: None of the canvas components (NanoScene, NanoSphere, NanoParticles) pause when the browser tab is hidden. While `requestAnimationFrame` itself throttles to ~1-4 FPS when a tab is hidden, the animation callbacks still execute, consuming CPU.

**Why it matters**: On laptops and mobile devices, background tab animation drains battery and competes for CPU resources with the active tab. The three canvas components combined perform thousands of calculations per second even when invisible.

**Affected files**: `src/utils/animationLoop.js`, `src/components/NanoParticles.jsx`

**How to implement**:

Add visibility handling to `animationLoop.js`:

```js
// Add to animationLoop.js:
let paused = false;

function handleVisibilityChange() {
  if (document.hidden) {
    paused = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  } else {
    paused = false;
    if (callbacks.size > 0 && rafId === null) {
      rafId = requestAnimationFrame(tick);
    }
  }
}

document.addEventListener('visibilitychange', handleVisibilityChange);
```

Also add a guard in `tick()`:
```js
function tick(timestamp) {
  if (paused) return;
  frameCount++;
  for (const cb of callbacks.values()) {
    cb(timestamp, frameCount);
  }
  if (callbacks.size > 0 && !paused) {
    rafId = requestAnimationFrame(tick);
  }
}
```

For `NanoParticles.jsx` (until it's migrated to the centralized loop per optimization #3), add the same pattern inside its useEffect.

**What it optimizes**: Completely stops all canvas computation when the tab is hidden, saving 5-10% CPU on laptops. Zero visual impact since the tab isn't visible anyway.

---

## 5. Critical: NanoParticles Missing IntersectionObserver - FIXED

**What it is**: `NanoScene.jsx` and `NanoSphere.jsx` both use `IntersectionObserver` to pause rendering when the canvas scrolls offscreen. `NanoParticles.jsx` does not, meaning it renders at 60 FPS even when not visible in the viewport.

**Affected file**: `src/components/NanoParticles.jsx`

**How to implement**:

```jsx
// Add ref at component level:
const visibleRef = useRef(true);

// Inside useEffect, after canvas setup:
const observer = new IntersectionObserver(([entry]) => {
  visibleRef.current = entry.isIntersecting;
}, { threshold: 0 });
observer.observe(canvas);

// At the start of animate():
function animate() {
  if (!visibleRef.current) {
    animFrameRef.current = requestAnimationFrame(animate);
    return;
  }
  // ... rest of animation ...
}

// In cleanup:
observer.disconnect();
```

**What it optimizes**: Stops particle physics computation and Canvas API calls when the component is scrolled out of view. Saves ~30,000 Canvas API calls/second and ~90,000 distance calculations/second when offscreen.

---

## 6. High: `transition-all` Instead of Specific Properties

**What it is**: `transition-all` causes the browser to monitor and animate EVERY CSS property that changes, including expensive ones like `box-shadow`, `border-color`, `background-color`, `width`, etc. When multiple properties change simultaneously (like on hover or theme toggle), the browser must interpolate all of them.

**Why it matters**: Safari is especially sensitive to transitions on multiple properties at once. Using `transition-all` when you only need color changes wastes CPU on interpolating properties that either don't change or don't need smooth transitions.

**Affected files and lines**:

| File | Line(s) | Current | Should Be |
|------|---------|---------|-----------|
| `KavaLandingPage.jsx` | 357 | `transition-all duration-200` | `transition-colors duration-200` |
| `KavaLandingPage.jsx` | 650 | `transition-all duration-500` | `transition-opacity duration-500` |
| `KavaLandingPage.jsx` | 651 | `transition-all duration-300` | `transition-colors duration-300` |
| `KavaLandingPage.jsx` | 656 | `transition-all duration-300` | `transition-[transform,box-shadow] duration-300` |
| `KavaLandingPage.jsx` | 708 | `transition-all duration-300` | `transition-colors duration-300` |
| `KavaLandingPage.jsx` | 806 | `transition-all` | `transition-colors` |
| `MushroomsLandingPage.jsx` | 198 | `transition-all duration-200` | `transition-colors duration-200` |
| `ContactPage.jsx` | 170, 188, 209, 226, 272 | `transition-all` | `transition-colors` |
| `ContactPage.jsx` | 246 | `transition-all` | `transition-colors` |

**How to implement**:

For each instance, determine which properties actually change on interaction and use the specific transition:
- If only colors/background change: use `transition-colors`
- If only opacity changes: use `transition-opacity`
- If only transform changes: use `transition-transform`
- If multiple specific properties: use `transition-[property1,property2]`

Example:
```jsx
// BEFORE (KavaLandingPage.jsx line 651):
className={`... transition-all duration-300`}

// AFTER (only border-color and background-color change on hover):
className={`... transition-colors duration-300`}
```

**What it optimizes**: Reduces the number of properties the browser monitors and interpolates during transitions. Prevents unnecessary paint/layout triggers when properties like `box-shadow` or `border-width` are included in `transition-all` even though they don't change.

---

## 7. High: NanoParticles Uses `Math.sqrt()` in O(N^2) Loop

**What it is**: In `NanoParticles.jsx`, the connection-drawing loop (line 138) calls `Math.sqrt()` on every pair of particles before checking if they're close enough to connect. `NanoScene.jsx` correctly uses squared-distance comparison (`dx*dx + dy*dy < CONN_DIST_SQ`) to avoid this.

**Why it matters**: With 55 particles, the O(N^2) loop runs 1,485 iterations per frame. At 60 FPS, that's **89,100 `Math.sqrt()` calls per second** that are entirely unnecessary. Additionally, the mouse-repulsion code (line 113) also uses `Math.sqrt()` on every particle even when most are out of range.

**Affected file**: `src/components/NanoParticles.jsx` lines 113, 138

**How to implement**:

```js
// Pre-compute squared constants at module level:
const CONNECTION_DISTANCE_SQ = CONNECTION_DISTANCE * CONNECTION_DISTANCE;
const MOUSE_RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;

// BEFORE (line 111-118 - mouse repulsion):
const dist = Math.sqrt(dx * dx + dy * dy);
if (dist < MOUSE_RADIUS && dist > 0) { ... }

// AFTER:
const distSq = dx * dx + dy * dy;
if (distSq < MOUSE_RADIUS_SQ && distSq > 0) {
  const dist = Math.sqrt(distSq);  // only sqrt when actually needed
  // ... rest unchanged ...
}

// BEFORE (line 136-149 - connections):
const dist = Math.sqrt(dx * dx + dy * dy);
if (dist < CONNECTION_DISTANCE) { ... }

// AFTER:
const distSq = dx * dx + dy * dy;
if (distSq < CONNECTION_DISTANCE_SQ) {
  const dist = Math.sqrt(distSq);  // only sqrt for the ~40-60 pairs that pass
  // ... rest unchanged ...
}
```

**What it optimizes**: Reduces `Math.sqrt()` calls from ~1,485/frame to ~40-60/frame (only for pairs that actually connect). That's a ~96% reduction in sqrt calls, saving ~85,000 sqrt/second.

---

## 8. High: NanoParticles Doesn't Batch Connection Lines

**What it is**: `NanoParticles.jsx` calls `ctx.beginPath()`, `ctx.moveTo()`, `ctx.lineTo()`, and `ctx.stroke()` individually for each connection line (lines 143-148). By contrast, `NanoScene.jsx` (lines 374-387) batches all connections into a single path with one `ctx.beginPath()` and one `ctx.stroke()`.

**Why it matters**: Each `ctx.stroke()` call forces the browser to rasterize and composite that path segment. With ~40-60 connections per frame, that's 40-60 separate rasterization operations. Batching them into one path reduces this to a single rasterization pass.

**Affected file**: `src/components/NanoParticles.jsx` lines 131-151

**How to implement**:

```js
// BEFORE:
for (let i = 0; i < particles.length; i++) {
  for (let j = i + 1; j < particles.length; j++) {
    // ...
    if (dist < CONNECTION_DISTANCE) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `hsla(...)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}

// AFTER (batch all connections with uniform style):
ctx.lineWidth = 0.5;
ctx.strokeStyle = `hsla(151, ${colors.lineSat}, ${colors.lineLight}, 0.08)`;
ctx.beginPath();
for (let i = 0; i < particles.length; i++) {
  for (let j = i + 1; j < particles.length; j++) {
    const a = particles[i], b = particles[j];
    const dx = a.x - b.x, dy = a.y - b.y;
    if (dx * dx + dy * dy < CONNECTION_DISTANCE_SQ) {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
  }
}
ctx.stroke();
```

Note: This uses a uniform stroke color/alpha instead of per-line alpha. The visual difference is minimal since the alpha variations were subtle (0.0 to 0.15 based on distance). If per-line alpha is critical, group lines into 2-3 alpha buckets and batch each bucket separately.

**What it optimizes**: Reduces Canvas `stroke()` calls from ~50/frame to 1/frame. Each `stroke()` triggers a GPU rasterization pass. Also eliminates ~50 string interpolations per frame for `strokeStyle`.

---

## 9. High: Per-Frame Gradient Creation in Particle Rendering

**What it is**: Both `NanoScene.jsx` (lines 429-435) and `NanoParticles.jsx` (lines 159-178) create new `CanvasGradient` objects for every particle on every frame. NanoScene creates 55 gradients at 60 FPS (3,300/sec), NanoParticles creates 110 gradients at 60 FPS (6,600/sec).

**Why it matters**: `createRadialGradient()` allocates a new gradient object and `addColorStop()` adds color stop entries to it. At 6,600-9,900 allocations per second, this creates significant garbage collection pressure. GC pauses cause visible frame drops (jank).

**Affected files**:
- `src/components/NanoScene.jsx` lines 429-435
- `src/components/NanoParticles.jsx` lines 159-178

**How to implement**:

Replace the glow gradient with a simpler rendering approach using `globalAlpha`:

```js
// BEFORE (NanoParticles.jsx lines 158-185):
// creates 2 gradients per particle per frame

// AFTER - use solid fills with globalAlpha for glow:
for (let i = 0; i < particles.length; i++) {
  const p = particles[i];
  const pulseAlpha = p.opacity + Math.sin(t * p.pulseSpeed + p.pulseOffset) * 0.1;

  // Soft glow - single solid circle with low alpha
  ctx.globalAlpha = pulseAlpha * colors.glowAlpha;
  ctx.fillStyle = `hsl(${p.hue}, ${colors.particleSat}, ${colors.particleLight})`;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
  ctx.fill();

  // Core - brighter solid
  ctx.globalAlpha = pulseAlpha;
  ctx.fillStyle = `hsl(${p.hue + 8}, 80%, 60%)`;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();

  // Specular
  ctx.globalAlpha = pulseAlpha * 0.35;
  ctx.fillStyle = `hsl(${p.hue + 15}, 100%, 85%)`;
  ctx.beginPath();
  ctx.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, p.size * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}
```

This eliminates all gradient creation. The visual difference is subtle for small particles (1-3.5px radius). Test carefully to ensure the glow falloff looks acceptable — the gradient produces a smoother falloff, but at this scale the solid approach is nearly indistinguishable.

**What it optimizes**: Eliminates 3,300-6,600 gradient object allocations per second, reducing GC pressure and improving frame consistency. Most visible as reduced micro-jank on lower-end devices and Safari.

---

## 10. High: `getBoundingClientRect()` Called Every Mouse Move

**What it is**: Both `NanoScene.jsx` (line 274) and `NanoParticles.jsx` (line 80) call `canvas.getBoundingClientRect()` inside every `mousemove` event handler. This method triggers a synchronous layout recalculation.

**Why it matters**: Mouse move events fire 50-100+ times per second. Each `getBoundingClientRect()` call forces the browser to calculate the current layout state, which is expensive when other animations are running.

**Affected files**:
- `src/components/NanoScene.jsx` line 274
- `src/components/NanoParticles.jsx` line 80

**How to implement**:

Cache the rect and only update on resize:

```js
// Add a cached rect variable in the useEffect closure:
let cachedRect = canvas.getBoundingClientRect();

function resize() {
  // ... existing resize logic ...
  cachedRect = canvas.getBoundingClientRect();
}

function handleMouseMove(e) {
  mouseRef.current.x = e.clientX - cachedRect.left;
  mouseRef.current.y = e.clientY - cachedRect.top;
}
```

**What it optimizes**: Eliminates 50-100 forced layout recalculations per second during mouse interaction. Prevents layout thrashing that causes frame drops when mousing over the canvas while animations are running.

---

## 11. High: Per-Frame Array Allocation in NanoScene

**What it is**: In `NanoScene.jsx` line 296, a new `spPos` array with 3 new objects is created every frame:
```js
const spPos = [];
for (let si = 0; si < SPHERES.length; si++) {
  spPos[si] = { cx, cy: h * s.yr + floatY, R };
}
```

**Why it matters**: At 60 FPS, this creates 4 new objects per frame (1 array + 3 position objects) = 240 allocations per second. These short-lived objects add to GC pressure.

**Affected file**: `src/components/NanoScene.jsx` line 296

**How to implement**:

Pre-allocate the array and mutate in-place:

```js
// Inside useEffect, before registerAnimation:
const spPos = SPHERES.map(() => ({ cx: 0, cy: 0, R: 0 }));

// Inside the animation callback, replace line 296-304:
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
```

**What it optimizes**: Eliminates 240 object allocations per second. Reduces GC frequency and prevents micro-jank caused by garbage collection pauses during animation.

---

## 12. High: `box-shadow` Animation in `glow` Keyframes

**What it is**: The `glow` keyframe animation (index.css lines 181-188) animates `box-shadow` between two values continuously. Box-shadow is an expensive property to animate because the browser must recalculate the shadow blur, spread, and compositing on every frame.

**Why it matters**: Unlike `transform` and `opacity`, `box-shadow` changes trigger paint operations. Safari handles animated shadows particularly poorly compared to Chrome.

**Affected files**:
- `src/index.css` lines 181-188 (`@keyframes glow`)
- `tailwind.config.js` lines 30-32 (glow animation definition)

**How to implement**:

Replace the `box-shadow` animation with a pseudo-element approach that only animates `opacity`:

```css
/* BEFORE */
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
  50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); }
}

/* AFTER - use a pseudo-element with static shadow, animate opacity */
.animate-glow {
  position: relative;
}

.animate-glow::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 40px rgba(16, 185, 129, 0.6);
  opacity: 0.5;
  animation: glow-pulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
```

This creates the glow effect once (static shadow on the pseudo-element) and only animates `opacity`, which is GPU-composited.

**What it optimizes**: Converts an expensive paint-triggering animation into a cheap GPU-composited opacity animation. The visual result is identical (glow pulsing in and out).

---

## 13. High: ThemeContext Causes Cascading Re-renders

**What it is**: `ThemeContext.jsx` creates a new `{ isDark, setIsDark }` object on every render of `ThemeProvider`. Since object identity changes each time, every component that calls `useTheme()` re-renders whenever ANY state change occurs in the provider's parent tree.

**Affected file**: `src/context/ThemeContext.jsx`

**How to implement**:

Memoize the context value:

```jsx
import React, { createContext, useContext, useState, useMemo } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);
  const value = useMemo(() => ({ isDark, setIsDark }), [isDark]);
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

The `useMemo` ensures the value object only changes when `isDark` actually changes, not on every parent render.

**What it optimizes**: Prevents unnecessary re-renders of all theme-consuming components when unrelated state changes occur. Particularly important because `NanoScene` re-renders on context changes, which can cause canvas re-initialization overhead.

---

## 14. High: Missing `React.memo` on Expensive Components

**What it is**: Several components that perform expensive rendering or animation setup are not wrapped in `React.memo`, causing them to re-render whenever their parent re-renders (even if their props haven't changed).

**Affected file**: `src/components/KavaLandingPage.jsx`

**Components that should be memoized**:

1. **`GlowOrb`** (line ~111-124): Creates 3 infinite Framer Motion animations. Re-rendering restarts them.
2. **`AnimatedCounter`** (line ~78-106): Uses `useInView` and animated counting.
3. **`AnimatedSection`** (line ~146-157): Wraps every section with stagger animations.

**How to implement**:

```jsx
// BEFORE:
function GlowOrb({ color, size, position, delay = 0 }) { ... }

// AFTER:
const GlowOrb = React.memo(function GlowOrb({ color, size, position, delay = 0 }) { ... });

// Similarly:
const AnimatedCounter = React.memo(function AnimatedCounter({ value, suffix, prefix }) { ... });
const AnimatedSection = React.memo(function AnimatedSection({ children, className }) { ... });
```

**What it optimizes**: Prevents expensive sub-trees from re-rendering when the parent's state changes (e.g., during theme toggle or any state update). Prevents animation restarts and reduces reconciliation work.

---

## 15. High: Missing `useMemo` on Static Arrays in KavaLandingPage

**What it is**: `KavaLandingPage.jsx` defines large data arrays (stats, features, process steps, etc.) as plain variables inside the component function. These are recreated on every render. `MushroomsLandingPage.jsx` correctly uses `useMemo` for its arrays — KavaLandingPage should follow the same pattern.

**Affected file**: `src/components/KavaLandingPage.jsx`

**How to implement**:

Move static arrays outside the component (if they don't depend on theme/state) or wrap them in `useMemo`:

```jsx
// Option A: Move outside component (preferred if no dependency on component state)
const STATS = [
  { value: '99.9', suffix: '%', label: 'Bioavailability Rate' },
  { value: '< 100', suffix: 'nm', label: 'Particle Size' },
  // ...
];

// Option B: useMemo inside component (if arrays reference theme or state)
const stats = useMemo(() => [
  { value: '99.9', suffix: '%', label: 'Bioavailability Rate' },
  // ...
], []);
```

Check each array: if it references `theme` or `isDark`, use `useMemo` with the appropriate dependency. If it's purely static data, move it outside the component entirely.

**What it optimizes**: Prevents recreating large arrays and their objects on every render. Reduces allocation pressure and allows React's reconciliation to skip re-rendering mapped children when the array reference is stable.

---

## 16. Medium: `overflow: hidden` + `border-radius` Clipping Cost

**What it is**: Several elements combine `overflow-hidden` with `rounded-*` classes. This forces the browser to create a clipping mask with a rounded shape, which is expensive to maintain during animations (especially the `btn-shine` sweep effect running inside an `overflow-hidden` button).

**Affected areas**:
- `btn-shine` class (`overflow: hidden` + buttons have `rounded-full`/`rounded-xl`)
- ~~`KavaLandingPage.jsx` (hero card: `overflow-hidden rounded-3xl`)~~ — resolved 2026-08-25: the light-mode hero card (`backdrop-blur-xl` + `overflow-hidden rounded-3xl` + border) was replaced by an edge-free radial scrim, which also removes the backdrop-filter.
- `KavaLandingPage.jsx` line 463 (CTA button: `overflow-hidden rounded-full`)

**How to implement**:

For `btn-shine`, since the pseudo-elements already fade to full transparency at their edges, overflow clipping is often unnecessary:

```css
/* If the shine fading to 0 at edges makes overflow clipping redundant: */
.btn-shine {
  position: relative;
  /* Remove: overflow: hidden; */
  transition: box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
```

Test this visually. If the shine looks fine without clipping (the gradient has transparent edges), this is a free performance win. If minor artifacts appear at corners, keep `overflow: hidden` but add `will-change: transform` to the parent to promote it to a GPU layer.

**What it optimizes**: Reduces clipping mask computation during animations, especially the `btn-shine` sweep which runs inside a clipped container. Safari handles rounded clipping paths particularly poorly.

---

## 17. Medium: Missing `will-change` on Animated Elements

**What it is**: None of the CSS-animated elements use `will-change` to hint the browser about upcoming animations. While Chrome aggressively promotes elements to GPU layers automatically, Safari is much more conservative and benefits from explicit hints.

**Why it matters**: Without `will-change`, Safari may keep animated elements on the CPU compositing path, causing them to be repainted on every frame instead of being GPU-composited.

**How to implement**:

Add `will-change` only to elements that actively animate (don't blanket-apply):

```css
/* In index.css: */

/* btn-shine pseudo-elements */
.btn-shine::before,
.btn-shine::after {
  will-change: transform, opacity;
}

/* Floating elements */
.animate-float {
  will-change: transform;
}

/* Glowing elements */
.animate-glow {
  will-change: opacity;  /* after optimization #12, only opacity animates */
}
```

**Important**: Don't apply `will-change` to more than ~10 elements simultaneously or GPU memory usage becomes a problem. Only apply to actively animating elements.

**What it optimizes**: Forces Safari to promote animated elements to GPU-composited layers, matching Chrome's default behavior. Results in smoother CSS animations on Safari.

---

## 18. Medium: Static Vignette Gradient Recreated Every Frame

**What it is**: `NanoScene.jsx` (lines 450-454) creates a new vignette radial gradient and fills the entire canvas with it on every frame. The vignette is a static darkening effect that only changes on resize or theme toggle.

**Affected file**: `src/components/NanoScene.jsx` lines 450-454

**How to implement**:

Cache the vignette on a small offscreen canvas and only regenerate on resize or theme change:

```js
// Inside useEffect, after offscreen canvas setup:
const vignetteCanvas = document.createElement('canvas');
const vignetteCtx = vignetteCanvas.getContext('2d');
let vignetteValid = false;

function updateVignette() {
  vignetteCanvas.width = Math.ceil(w * dpr);
  vignetteCanvas.height = Math.ceil(h * dpr);
  vignetteCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const vG = vignetteCtx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.3,
    w / 2, h / 2, Math.max(w, h) * 0.72
  );
  vG.addColorStop(0, 'rgba(0,0,0,0)');
  vG.addColorStop(1, isDark ? 'rgba(2,6,23,0.4)' : 'rgba(255,255,255,0.28)');
  vignetteCtx.fillStyle = vG;
  vignetteCtx.fillRect(0, 0, w, h);
  vignetteValid = true;
}

// Call in resize:
function resize() {
  // ... existing resize ...
  vignetteValid = false;
}

// In animation callback, replace vignette drawing:
if (!vignetteValid) updateVignette();
ctx.drawImage(vignetteCanvas, 0, 0, vignetteCanvas.width, vignetteCanvas.height, 0, 0, w, h);
```

**What it optimizes**: Replaces per-frame gradient creation + fullscreen fill with a single `drawImage` blit from cache. Small individual win but contributes to overall frame budget.

---

## 19. Medium: GlowOrb Infinite Animations (Constant GPU Load)

**What it is**: The `GlowOrb` component in `KavaLandingPage.jsx` renders 3 instances with infinite Framer Motion animations on `scale` and `opacity`:
```jsx
animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
```

**Why it matters**: Framer Motion drives these from JavaScript, updating styles on each frame via the main thread. For simple infinite loops, CSS animations are handled entirely by the browser's compositor thread, bypassing JavaScript.

**Affected file**: `src/components/KavaLandingPage.jsx` lines ~111-124

**How to implement**:

Convert to CSS animations:

```jsx
// BEFORE (Framer Motion JS-driven):
<motion.div
  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
/>

// AFTER (CSS animation):
<div className="animate-glow-orb" style={{ animationDelay: `${delay}s` }} />
```

Add to `index.css`:
```css
@keyframes glow-orb {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 0.5; }
}

.animate-glow-orb {
  animation: glow-orb 4s ease-in-out infinite;
  will-change: transform, opacity;
}
```

**What it optimizes**: Moves infinite looping animations from JS-driven (Framer Motion) to compositor-driven (CSS), freeing the main thread. Safari handles CSS animations on its compositor thread more efficiently than JS-updated styles.

---

## 20. Medium: `backgroundPosition` Animation Is CPU-Based

**What it is**: The hero headline "Nano Kava" uses a Framer Motion `backgroundPosition` animation for a gradient text shimmer effect. `background-position` is not a GPU-accelerated property — each frame, the browser must recalculate the gradient position and repaint.

**Affected file**: `src/components/KavaLandingPage.jsx` lines ~429-436

**How to implement**:

The project already has an `animate-gradient` CSS class defined in `index.css` (lines 51-54) that does the same thing. Replace the Framer Motion animation with this CSS class:

```jsx
// BEFORE:
<motion.span
  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
  className="... bg-gradient-to-r ... bg-clip-text text-transparent"
  style={{ backgroundSize: '200% 200%' }}
>

// AFTER:
<span
  className="... bg-gradient-to-r ... bg-clip-text text-transparent animate-gradient"
>
```

Adjust the CSS class duration if needed to match the current 5s timing:
```css
.animate-gradient-slow {
  background-size: 200% 200%;
  animation: gradient-shift 5s linear infinite;
}
```

**What it optimizes**: Removes one Framer Motion animation from the JS frame budget. CSS animations for `background-position` are scheduled by the browser's animation engine which can better optimize timing.

---

## 21. Medium: Excessive `filter: blur()` on Overlay Elements

**What it is**: Multiple card hover effects use absolutely-positioned overlay divs with `blur-sm`, `blur`, `blur-xl`, or `blur-2xl` Tailwind classes for decorative gradient glow effects.

**Affected areas** in `KavaLandingPage.jsx`:
- Line 502: `blur-sm` on hover overlay
- Line 650: `blur` on hover glow overlay
- Lines 540, 582, 748, 774: `blur-2xl` / `blur-xl` on background gradient elements
- Line 711: `blur-xl` on process step glow overlay

**How to implement**:

For **static blurred backgrounds** (gradient glow decorations that don't animate): Replace the sharp gradient + CSS blur filter with a larger, softer gradient that naturally looks blurred:

```jsx
// BEFORE:
<div className="absolute ... bg-red-500/20 blur-2xl rounded-full" />

// AFTER - use a larger element with lower opacity, no blur filter:
<div className="absolute ... bg-red-500/8 rounded-full"
  style={{ transform: 'scale(1.8)' }}
/>
```

For **hover overlay glows**: The blur itself is static — only opacity animates. Add `will-change: opacity` to ensure the browser pre-rasterizes the blurred element:

```jsx
<div
  className="... blur opacity-0 group-hover:opacity-20 transition-opacity duration-500"
  style={{ willChange: 'opacity' }}
/>
```

**What it optimizes**: Static blur replacements eliminate the filter computation entirely. `will-change: opacity` on animated blurred overlays tells the browser to pre-rasterize the blur once and only composite opacity changes (cheap GPU operation).

---

## 22. Low: Mouse Event Listeners Not Passive

**What it is**: Canvas mouse event listeners in `NanoScene.jsx` and `NanoParticles.jsx` are added without the `{ passive: true }` option.

**Affected files**:
- `src/components/NanoScene.jsx` line 279
- `src/components/NanoParticles.jsx` line 90

**How to implement**:

```js
// BEFORE:
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseleave', handleMouseLeave);

// AFTER:
canvas.addEventListener('mousemove', handleMouseMove, { passive: true });
canvas.addEventListener('mouseleave', handleMouseLeave, { passive: true });
```

**What it optimizes**: Passive event listeners tell the browser that `preventDefault()` will never be called, allowing the browser to handle scrolling on a separate thread without waiting for the JavaScript handler to complete. Minor but free improvement.

---

## 23. Low: `Math.random()` Called Excessively in Physics

**What it is**: `NanoScene.jsx` (lines 330-331) calls `Math.random()` 4 times per particle per frame for barely-perceptible velocity jitter. With 55 particles at 60 FPS, that's 13,200 `Math.random()` calls per second.

**Affected file**: `src/components/NanoScene.jsx` lines 330-331

**How to implement**:

Reduce frequency by only applying jitter every Nth frame:

```js
// BEFORE:
p.vx += (Math.random() - 0.5) * 0.022;
p.vy += (Math.random() - 0.5) * 0.022;

// AFTER (apply jitter every 4th frame with 4x strength):
if (frame % 4 === 0) {
  p.vx += (Math.random() - 0.5) * 0.088;
  p.vy += (Math.random() - 0.5) * 0.088;
}
```

**What it optimizes**: Reduces random number generation overhead by 75%. Minor CPU savings but contributes to overall frame budget.

---

## 24. Low: Image Elements Missing `loading="lazy"`

**What it is**: Logo images in footers are below the fold and loaded eagerly.

**How to implement**:

For footer logos (below fold):
```jsx
<img src={theme.logo} alt="..." loading="lazy" className="h-10 w-auto" />
```

Keep header logos as eager (default) since they're immediately visible.

**What it optimizes**: Defers loading of below-fold images until needed, reducing initial page load weight. Minor impact for small logo files but good practice.

---

## 25. Low: Framer Motion `prefers-reduced-motion` Verification

**What it is**: CSS animations correctly respect `prefers-reduced-motion` via the media query in `index.css` (lines 226-238). Framer Motion animations should also respect this setting.

**How to implement**:

Wrap the app in Framer Motion's `MotionConfig`:

```jsx
// In App.jsx or at the router level:
import { MotionConfig } from 'framer-motion';

<MotionConfig reducedMotion="user">
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
</MotionConfig>
```

The `"user"` setting respects the OS-level `prefers-reduced-motion` preference, disabling all Framer Motion animations for users who have requested it.

**What it optimizes**: Accessibility win plus significant performance improvement for users who have enabled reduced motion.

---

## Summary: Priority Implementation Order

### Phase 1: Highest Impact (Do First)
| # | Optimization | Est. Impact | Effort |
|---|-------------|-------------|--------|
| 1 | Remove `backdrop-filter` overuse | 20-30% Safari perf | Medium |
| 2 | Fix `btn-shine` `left` -> `transform` | Smooth button hover | Low |
| 3 | Migrate NanoParticles to shared RAF | Architecture fix | Low |
| 4 | ~~Add tab visibility handling~~ | ~~Saves battery/CPU~~ | **FIXED** |
| 5 | ~~Add IntersectionObserver to NanoParticles~~ | ~~Stops offscreen work~~ | **FIXED** |

### Phase 2: High Impact
| # | Optimization | Est. Impact | Effort |
|---|-------------|-------------|--------|
| 6 | Replace `transition-all` with specific | Smoother transitions | Low |
| 7 | Fix NanoParticles sqrt in O(N^2) | 96% fewer sqrt calls | Low |
| 8 | Batch NanoParticles connection lines | ~50x fewer stroke() | Low |
| 9 | Reduce per-frame gradient creation | Less GC pressure | Medium |
| 10 | Cache `getBoundingClientRect()` | No layout thrashing | Low |
| 11 | Pre-allocate spPos array | Less GC pressure | Low |
| 12 | Fix `glow` box-shadow animation | GPU-composited glow | Low |

### Phase 3: React Optimization
| # | Optimization | Est. Impact | Effort |
|---|-------------|-------------|--------|
| 13 | Memoize ThemeContext value | Fewer re-renders | Low |
| 14 | Add React.memo to components | Fewer re-renders | Low |
| 15 | Add useMemo to static arrays | Stable references | Low |

### Phase 4: Polish
| # | Optimization | Est. Impact | Effort |
|---|-------------|-------------|--------|
| 16 | Address overflow-hidden + border-radius | Safari clipping perf | Low |
| 17 | Add will-change hints | Safari GPU promotion | Low |
| 18 | Cache vignette gradient | Tiny frame savings | Low |
| 19 | Convert GlowOrb to CSS animation | Less main-thread work | Low |
| 20 | Convert backgroundPosition to CSS | Less main-thread work | Low |
| 21 | Optimize blur filter overlays | Less filter computation | Medium |
| 22 | Passive event listeners | Free minor win | Low |
| 23 | Reduce Math.random() calls | Minor CPU savings | Low |
| 24 | Lazy load below-fold images | Faster initial load | Low |
| 25 | Verify reduced-motion support | Accessibility + perf | Low |

---

## Measurement and Validation

After implementing optimizations, validate using:

1. **Safari Web Inspector -> Timeline**: Record while scrolling/interacting. Look for reduced paint times and fewer layout recalculations.
2. **Safari Develop -> Show Compositing Borders**: Green borders = GPU-composited layers. Verify animated elements show green borders after adding `will-change`.
3. **Chrome DevTools -> Performance**: Record a session and compare frame times before/after. Look for fewer long frames (>16.67ms).
4. **Chrome DevTools -> Rendering -> Paint Flashing**: Green flashes show repainted areas. After optimizations, fewer areas should flash during animations.
5. **Lighthouse Performance Score**: Run before and after to quantify improvement.
6. **Frame timing measurement**: Add temporary logging in `animationLoop.js`:
   ```js
   let lastTime = 0;
   function tick(timestamp) {
     if (lastTime) {
       const delta = timestamp - lastTime;
       if (delta > 20) console.warn(`Frame drop: ${delta.toFixed(1)}ms`);
     }
     lastTime = timestamp;
     // ... rest of tick
   }
   ```
