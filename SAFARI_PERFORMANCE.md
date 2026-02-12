# Safari Performance Tracking Log

Tracking frame time improvements after each optimization from SAFARI_OPTIMIZATIONS.md.

---

## Chrome Baseline (After Fix 1, Before Fix 2)

**Test:** FPS meter while scrolling through full Kava landing page in Chrome (no CPU throttling)

| Metric | Value |
|--------|-------|
| Frame Rate (top of page) | 42.2 fps (~23.7ms/frame) |
| Frame Rate (bottom of page) | 60.0 fps (16.7ms/frame) |
| GPU raster | on |
| GPU memory | 41.2 MB used / 536.9 MB max |

**Key insight:** Chrome hits 60fps at the bottom of the page but drops to ~42fps at the top. NanoScene is `fixed inset-0 -z-10` and renders identically at all scroll positions — the fps difference comes from page content layered on top, not the canvas itself. The hero section at the top has significantly more active animations than the footer area at the bottom (see investigation below).

**Note:** This Chrome baseline was recorded after Fix 1 (backdrop-filter removal) was already applied. Chrome was already fast before Fix 1, so this is representative of pre-optimization Chrome performance too. We'll re-check Chrome FPS after each remaining fix to ensure no regressions.

### Chrome Top-vs-Bottom Investigation

The hero section (top of page) has **7 continuously-running animations** that the footer (bottom of page) does not:

| Animation | Type | Lines | Cost |
|-----------|------|-------|------|
| 3x GlowOrb (scale + opacity loop) | Framer Motion JS → `transform` + `opacity` | 109-124, 391-393 | **3 Framer ticker callbacks/frame**, each animating scale + opacity on 400-600px elements with `blur-[80-120px]` — the blur filter makes each repaint expensive |
| Hero heading gradient shift | Framer Motion `backgroundPosition` loop | 431-433 | Animates `backgroundPosition` every frame — triggers Paint (non-compositor property) |
| CTA button gradient shift | Framer Motion `backgroundPosition` loop | 467-468 | Same as above — animates `backgroundPosition` every frame |
| `animate-ping` on badge dot | CSS infinite `@keyframes ping` | 416 | `transform: scale(2)` + `opacity: 0` loop — compositor-friendly but still a composited layer |
| CTA icon `boxShadow` loop | Framer Motion JS → `boxShadow` | 832-835 | **Most expensive** — `boxShadow` is a Paint property, re-paints every frame via JS |
| Scroll indicator bounce | Framer Motion `y` loop | 521-522, 527-528 | Two nested y-bounce animations — minor cost |
| Hero parallax (opacity, scale, y) | Framer Motion `useTransform` from scroll | 176-178, 386 | Drives 3 transform properties on scroll — triggers on every scroll frame |

**Why the bottom is 60fps:** The footer (lines 902-921) has zero continuously-running animations — just static text and links. The CTA section (lines 820-900) has the boxShadow loop and the blur-2xl orb, but by the time you scroll to the very bottom, even those are out of the viewport paint region.

**Key culprits (highest to lowest impact):**
1. **GlowOrbs with blur-[80-120px]**: Three 400-600px elements with massive CSS blur filters, each scale+opacity animating continuously. Blur filters force the GPU to re-render large texture regions every frame.
2. **boxShadow Framer loop** (Fix 5): JS-driven box-shadow interpolation triggers Paint every frame.
3. **backgroundPosition loops**: Two Framer Motion loops animating `backgroundPosition` — a Paint property, not compositor-friendly.
4. **Hero parallax**: Three `useTransform` values updating on every scroll event.

---

## Baseline (Before Any Fixes)

**Recording:** Timeline Recording 1, Frames 1-100
**Test:** Scroll through full Kava landing page in Safari

### Raw Frame Data (Frames 1-33 sampled)

| Frame | Total Time | Script | Layout | Paint | Other |
|-------|-----------|--------|--------|-------|-------|
| 1 | 168.6ms | — | — | — | 168.6ms |
| 2 | 128.6ms | 2.937ms | 0.509ms | 8.029ms | 117.1ms |
| 3 | 202.2ms | 4.128ms | 0.530ms | 76.62ms | 121.0ms |
| 4 | 131.0ms | 0.905ms | 0.505ms | 7.905ms | 121.7ms |
| 5 | 218.6ms | 6.558ms | 1.350ms | 85.49ms | 125.2ms |
| 6 | 135.8ms | 0.879ms | 0.691ms | 11.66ms | 122.5ms |
| 7 | 211.3ms | 3.506ms | 0.891ms | 83.50ms | 123.4ms |
| 8 | 155.2ms | 2.180ms | 0.491ms | 17.47ms | 135.0ms |
| 9 | 228.1ms | 3.909ms | 0.508ms | 85.34ms | 138.3ms |
| 10 | 148.1ms | 1.358ms | 0.432ms | 8.377ms | 137.9ms |
| 11 | 221.5ms | 3.668ms | 0.473ms | 85.76ms | 131.6ms |
| 12 | 143.5ms | 1.404ms | 0.383ms | 8.232ms | 133.4ms |
| 13 | 224.4ms | 3.076ms | 0.716ms | 82.56ms | 138.0ms |
| 14 | 144.4ms | 1.250ms | 0.363ms | 8.229ms | 134.5ms |
| 15 | 195.5ms | 3.648ms | 0.439ms | 114.8ms | 76.69ms |
| 16 | 55.27ms | 1.137ms | 0.328ms | 11.25ms | 42.55ms |
| 17 | 126.4ms | 2.809ms | 0.633ms | 77.76ms | 45.25ms |
| 18 | 53.25ms | 0.648ms | 0.607ms | 8.201ms | 43.79ms |
| 19 | 125.9ms | 2.669ms | 0.525ms | 78.59ms | 44.15ms |
| 20 | 53.49ms | 0.575ms | 0.516ms | 8.459ms | 43.94ms |
| 21 | 125.3ms | 2.549ms | 0.532ms | 77.23ms | 44.95ms |
| 22 | 60.05ms | 1.860ms | 0.293ms | 4.071ms | 53.83ms |
| 23 | 126.9ms | 4.281ms | 0.565ms | 77.78ms | 44.28ms |
| 24 | 52.70ms | 1.850ms | 0.451ms | 5.996ms | 44.41ms |
| 25 | 70.45ms | 1.269ms | — | — | 69.18ms |
| 26 | 79.59ms | 1.729ms | 0.953ms | 28.44ms | 48.47ms |
| 27 | 133.2ms | 2.821ms | 0.817ms | 76.14ms | 53.43ms |
| 28 | 85.59ms | 1.339ms | 0.829ms | 30.87ms | 52.55ms |
| 29 | 134.4ms | 3.683ms | 0.560ms | 73.34ms | 56.79ms |
| 30 | 87.30ms | 1.499ms | 0.566ms | 37.04ms | 48.19ms |
| 31 | 128.3ms | 3.262ms | 0.548ms | 74.47ms | 50.02ms |
| 32 | 54.24ms | 0.688ms | 0.774ms | 3.456ms | 49.33ms |
| 33 | 133.0ms | 3.070ms | 0.806ms | 84.59ms | 44.56ms |

### Baseline Summary

| Metric | Value |
|--------|-------|
| Average frame time | ~137ms |
| Worst single frame | 228.1ms |
| Best single frame | 52.70ms |
| Typical Script time | 1-4ms |
| Typical Paint time | 8-115ms (bimodal: ~8ms light frames, ~80ms heavy frames) |
| Typical Other/Compositing | 44-168ms |
| Approximate FPS | ~7 fps |

### Key Observations
- **Bimodal pattern**: Alternating heavy (~130-228ms) and light (~53-87ms) frames — likely the 30fps offscreen canvas render alternating with 60fps compositing frames
- **Paint is the dominant cost**: Heavy frames show 73-115ms paint times
- **Other/Compositing is massive**: 44-168ms — strongly suggests `backdrop-filter: blur()` compositing overhead
- **Script is NOT the bottleneck**: Only 1-4ms per frame

---

## After Fix 1: Remove All backdrop-filter: blur()

**Expected impact:** CRITICAL — should dramatically reduce Paint and Other/Compositing times

### Preview Results (Frames 1-33 sampled)

| Frame | Total Time | Script | Layout | Paint | Other |
|-------|-----------|--------|--------|-------|-------|
| 1 | 37.00ms | — | — | — | 37.00ms |
| 2 | 27.61ms | 3.174ms | 0.502ms | 2.702ms | 21.23ms |
| 3 | 97.64ms | 4.019ms | 0.585ms | 72.79ms | 20.24ms |
| 4 | 24.21ms | 0.706ms | 0.513ms | 2.693ms | 20.30ms |
| 5 | 99.77ms | 3.240ms | 0.551ms | 74.48ms | 21.49ms |
| 6 | 25.27ms | 0.873ms | 0.569ms | 2.876ms | 20.95ms |
| 7 | 98.39ms | 3.175ms | 0.512ms | 74.94ms | 19.76ms |
| 8 | 23.59ms | 0.618ms | 0.517ms | 2.690ms | 19.76ms |
| 9 | 99.50ms | 2.814ms | 0.552ms | 74.85ms | 21.28ms |
| 10 | 25.21ms | 0.588ms | 0.516ms | 2.716ms | 21.39ms |
| 11 | 97.26ms | 2.534ms | 0.547ms | 75.33ms | 18.85ms |
| 12 | 24.06ms | 0.541ms | 0.532ms | 2.557ms | 20.43ms |
| 13 | 99.58ms | 2.642ms | 0.548ms | 75.48ms | 20.91ms |
| 14 | 24.87ms | 0.555ms | 0.556ms | 2.808ms | 20.95ms |
| 15 | 102.1ms | 2.830ms | 0.585ms | 77.07ms | 21.63ms |
| 16 | 24.68ms | 1.394ms | 0.609ms | 2.984ms | 19.69ms |
| 17 | 102.3ms | 2.841ms | 0.531ms | 74.92ms | 24.03ms |
| 18 | 26.45ms | 0.657ms | 0.794ms | 5.087ms | 19.92ms |
| 19 | 108.4ms | 3.658ms | 0.768ms | 80.82ms | 23.19ms |
| 20 | 37.02ms | 1.433ms | 0.434ms | 14.01ms | 21.14ms |
| 21 | 113.7ms | 2.718ms | 0.859ms | 86.16ms | 23.93ms |
| 22 | 32.15ms | 0.684ms | 0.774ms | 6.899ms | 23.80ms |
| 23 | 116.2ms | 2.449ms | 0.748ms | 89.37ms | 23.68ms |
| 24 | 32.19ms | 1.604ms | 0.452ms | 6.378ms | 23.75ms |
| 25 | 102.9ms | 2.459ms | 0.611ms | 82.04ms | 17.74ms |
| 26 | 28.23ms | 1.117ms | 0.454ms | 7.564ms | 19.10ms |
| 27 | 107.1ms | 2.663ms | 0.730ms | 84.08ms | 19.63ms |
| 28 | 27.62ms | 0.703ms | 1.066ms | 9.073ms | 16.78ms |
| 29 | 108.0ms | 2.539ms | 0.863ms | 86.74ms | 17.81ms |
| 30 | 25.40ms | 0.633ms | 0.796ms | 7.249ms | 16.73ms |
| 31 | 106.9ms | 2.588ms | 0.890ms | 85.51ms | 17.93ms |
| 32 | 25.32ms | 1.394ms | 0.524ms | 4.142ms | 19.27ms |
| 33 | 101.1ms | 3.070ms | 0.509ms | 76.61ms | 20.92ms |

### Fix 1 Summary

| Metric | Baseline | After Fix 1 | Change |
|--------|----------|-------------|--------|
| Light frame avg | ~65ms | ~26ms | **-60%** |
| Heavy frame avg | ~175ms | ~103ms | **-41%** |
| Other/Compositing avg | ~110ms | ~20ms | **-82%** |
| Overall avg | ~137ms | ~65ms | **-53%** |
| Approx FPS | ~7 fps | ~15 fps | **+115%** |

### Key Observations
- **Other/Compositing dropped 82%** — from 44-168ms down to 17-24ms. This confirms `backdrop-filter` was the primary compositing bottleneck.
- **Light frames now ~25ms** — close to 40fps for compositing-only frames
- **Heavy frame Paint still 72-89ms** — this is the NanoScene canvas rendering, which Fixes 2-3 will target
- **Bimodal pattern clearer now**: alternating 30fps canvas renders (~100ms) and 60fps compositing (~25ms)

### Deployed Results (enjoynano.com, Frames 1-33 sampled)

| Frame | Total Time | Script | Layout | Paint | Other |
|-------|-----------|--------|--------|-------|-------|
| 1 | 57.44ms | — | — | — | 57.44ms |
| 2 | 38.61ms | 2.766ms | 0.497ms | 3.099ms | 32.25ms |
| 3 | 113.3ms | 4.197ms | 0.578ms | 77.99ms | 30.50ms |
| 4 | 3.017ms | 0.518ms | — | — | 2.499ms |
| 5 | 113.7ms | 3.162ms | 0.583ms | 76.61ms | 33.30ms |
| 6 | 35.58ms | 0.772ms | 0.526ms | 3.288ms | 30.99ms |
| 7 | 117.2ms | 2.885ms | 0.538ms | 79.41ms | 34.37ms |
| 8 | 36.37ms | 0.755ms | 0.559ms | 3.158ms | 31.90ms |
| 9 | 137.0ms | 3.811ms | 0.690ms | 90.92ms | 41.63ms |
| 10 | 43.92ms | 1.004ms | 0.540ms | 4.663ms | 37.71ms |
| 11 | 129.8ms | 2.539ms | 0.515ms | 83.59ms | 43.14ms |
| 12 | 17.93ms | 0.643ms | 0.547ms | 3.411ms | 13.33ms |
| 13 | 93.54ms | 2.973ms | 0.528ms | 75.83ms | 14.21ms |
| 14 | 17.92ms | 0.636ms | 0.559ms | 3.042ms | 13.68ms |
| 15 | 91.52ms | 2.575ms | 0.562ms | 74.92ms | 13.46ms |
| 16 | 16.98ms | 0.546ms | 0.545ms | 3.541ms | 12.34ms |
| 17 | 93.48ms | 2.431ms | 0.600ms | 78.17ms | 12.27ms |
| 18 | 17.47ms | 0.546ms | 0.568ms | 3.406ms | 12.95ms |
| 19 | 97.80ms | 2.552ms | 0.523ms | 82.38ms | 12.34ms |
| 20 | 18.14ms | 0.747ms | 0.542ms | 3.790ms | 13.07ms |
| 21 | 106.9ms | 2.532ms | 0.548ms | 81.80ms | 22.06ms |
| 22 | 51.53ms | 0.651ms | 0.524ms | 25.44ms | 24.91ms |
| 23 | 113.2ms | 2.497ms | 0.558ms | 82.29ms | 27.86ms |
| 24 | 30.73ms | 0.502ms | 0.536ms | 3.592ms | 26.10ms |
| 25 | 110.4ms | 2.503ms | 0.553ms | 78.43ms | 28.90ms |
| 26 | 31.06ms | 0.551ms | 0.521ms | 3.252ms | 26.74ms |
| 27 | 120.3ms | 2.697ms | 0.549ms | 81.41ms | 35.65ms |
| 28 | 39.71ms | 2.296ms | 0.532ms | 3.179ms | 33.70ms |
| 29 | 115.5ms | 3.802ms | 0.795ms | 88.84ms | 22.03ms |
| 30 | 28.30ms | 0.874ms | 0.671ms | 2.990ms | 23.76ms |
| 31 | 106.5ms | 2.477ms | 0.628ms | 79.05ms | 24.35ms |
| 32 | 27.93ms | 0.659ms | 0.714ms | 2.271ms | 24.29ms |
| 33 | 119.6ms | 3.033ms | 0.756ms | 100.3ms | 15.44ms |

### Deployed vs Preview Comparison

| Metric | Preview | Deployed | Verdict |
|--------|---------|----------|---------|
| Light frame avg | ~26ms | ~28ms | Comparable |
| Heavy frame avg | ~103ms | ~111ms | Comparable |
| Other (stabilized) | ~20ms | ~13-26ms | Comparable |
| Best light frame | 23.59ms | 3.02ms | Deployed slightly faster |
| Worst heavy frame | 116.2ms | 137.0ms | Deployed slightly worse (early frames) |

**Conclusion:** Preview and deployed performance are essentially identical. Early deployed frames show slightly higher Other times (30-43ms) likely due to CDN/cache warmup, but stabilize to 12-26ms. **Safe to use `npm run preview` for remaining fixes.**

---

## After Fix 2: Replace Canvas Particle Gradients with Solid Fills

**Expected impact:** CRITICAL — reduces createRadialGradient calls (55/frame)

_(Record results here after applying Fix 2)_

---

## After Fix 3: Cache the Vignette Gradient

**Expected impact:** MEDIUM — eliminates 1 gradient recreation per frame

_(Record results here after applying Fix 3)_

---

## After Fix 4: Convert btn-shine from left to translateX()

**Expected impact:** CRITICAL — eliminates layout thrashing during hover animations

_(Record results here after applying Fix 4)_

---

## After Fix 5: Replace Framer Motion boxShadow Animations

**Expected impact:** HIGH — eliminates JS-driven box-shadow interpolation

_(Record results here after applying Fix 5)_

---

## After Fix 6: Replace CSS glow Keyframe Animation

**Expected impact:** HIGH — moves infinite animation from paint to compositor

_(Record results here after applying Fix 6)_

---

## After Fix 7: Convert Mobile Menu from height auto to CSS Grid

**Expected impact:** HIGH — eliminates layout thrashing on menu open/close

_(Record results here after applying Fix 7)_

---

## After Fix 8: Add will-change to Hero Parallax Element

**Expected impact:** LOW — prevents first-scroll stutter

_(Record results here after applying Fix 8)_
