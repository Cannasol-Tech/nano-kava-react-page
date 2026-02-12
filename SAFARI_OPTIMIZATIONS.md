# Safari Performance Fixes — Step-by-Step Implementation Guide

This guide walks you through every optimization one at a time. Each step explains **what** you're changing, **why** it matters at the browser engine level, and **exactly where** to make the edit. Do them in order — they're ranked by impact.

---

## Before You Start: Measure Your Baseline Frame Time

You need a "before" number so you can prove each fix actually helped. You'll measure average frame time in both Safari and Chrome. Do this **before making any changes**, and then again after each fix (or after all fixes) to see the improvement.

A frame time of **16.67ms** means the browser is hitting a perfect 60fps. Anything above that means dropped frames. Above **33ms** means you're below 30fps — visually choppy.

---

### Measuring Frame Time in Safari

#### Step 1: Enable the Develop menu (one-time setup)

If you don't see a "Develop" menu in Safari's menu bar:

1. Open **Safari → Settings** (or press `Cmd + ,`)
2. Click the **Advanced** tab
3. Check **"Show features for web developers"** (on older Safari versions this says "Show Develop menu in menu bar")
4. Close Settings. You should now see **Develop** in the menu bar.

#### Step 2: Open Web Inspector

1. Navigate to your site (e.g., `localhost:5173` if running `npm run dev`, or `enjoynano.com` for production)
2. Go to **Develop → Show Web Inspector** (or press `Cmd + Option + I`)
3. The Web Inspector panel opens at the bottom or side of the window

#### Step 3: Go to the Timelines tab and select Frames

1. In Web Inspector, click the **Timelines** tab in the top tab bar
2. You'll see two sub-tabs near the top-left: **Events** and **Frames** — click **Frames**
3. You should now see what's in your screenshot: a dark timeline area with numbered markers (5, 10, 15, 20...), and a **Details** pane at the bottom with columns: **Name**, **Total Time**, **Script**, **Layout**, **Paint**, **Other**, **Start Time**, **Location**

That dark area is where frame bars will appear once you record. The numbers along the top (5, 10, 15...) are frame numbers, not milliseconds.

#### Step 4: Start a recording

1. Look at the very top-left of the Timelines panel — there's a **red circle** (record button). Click it.
   - Alternatively, press the **red circle in the top-left** of the entire Web Inspector toolbar
   - You'll know recording has started because the button changes to a **red square** (stop), and the "Stop recording once page loads" checkbox area may update
2. You should see the breadcrumb update to something like **"Timeline Recording 1 → Rendering Frames"**

#### Step 5: Interact with your page while recording

1. **Wait 1-2 seconds** after starting the recording (let it stabilize)
2. **Scroll slowly** from the top of the Kava landing page down to the bottom — take about 5 seconds, at a steady moderate speed
3. **Scroll back up** to the top — another 5 seconds
4. **Hover** over a few btn-shine buttons (to test hover animations)
5. **Click Stop** — click the red square button to end the recording

#### Step 6: Read the frame data

After you stop recording, the timeline area (which was dark and empty before) will now be populated with frame bars. Here's how to read them:

**The timeline area (top half):**
- Each **vertical bar** represents one rendered frame
- The **height** of each bar indicates how long that frame took to render
- Taller bars = slower frames = worse performance
- The numbers along the top (5, 10, 15, 20...) are **frame numbers**, not time

**The Details pane (bottom half):**
- Click on **any individual frame bar** in the timeline and the Details pane populates with a row showing that frame's breakdown:
  - **Total Time** — how many milliseconds that frame took (this is the key number)
  - **Script** — time spent running JavaScript (your NanoScene canvas loop, Framer Motion, React)
  - **Layout** — time spent calculating element positions (triggered by `height: auto`, `left`, etc.)
  - **Paint** — time spent rasterizing pixels (triggered by `box-shadow`, `backdrop-filter`, etc.)
  - **Other** — compositing and browser overhead

**To find your average frame time:**

Option A — **Click through individual frames:**
1. Click on the first frame bar during your scrolling period
2. Note the **Total Time** value in the Details pane
3. Click on several more frame bars spread across the scrolling period (pick ~10 frames)
4. Write down each Total Time value
5. Average them: add all values and divide by how many you sampled
6. Example: if you clicked 10 frames and got 18, 22, 19, 35, 21, 24, 20, 28, 19, 22 → sum is 228 → average is **22.8ms** (about 44fps)

Option B — **Select a range of frames:**
1. Click and drag across the timeline to highlight the region where you were scrolling
2. The Details pane may show aggregate data for all selected frames
3. If it lists all frames individually, you can scan the **Total Time** column to spot the worst ones and get a sense of the average
4. Look at the breadcrumb — it may say something like "Frames 12 – 85" telling you how many frames are in your selection

Option C — **Quick math from the recording duration:**
1. Note the total time you were scrolling (about 10 seconds = 10,000ms)
2. Count (or estimate) the number of frame bars during that period
3. Divide: `10,000ms ÷ frame count = average frame time`
4. Example: 10,000ms ÷ 380 frames = **26.3ms average** (about 38fps — needs work)
5. Example: 10,000ms ÷ 580 frames = **17.2ms average** (about 58fps — almost there)

**What to look for in the Details pane columns:**
- If **Script** is consistently high (>8ms) → the NanoScene canvas gradient fixes (Fix 2, Fix 3) will help most
- If **Paint** is consistently high (>4ms) → the backdrop-filter and box-shadow fixes (Fix 1, Fix 5, Fix 6) will help most
- If **Layout** shows any time at all during scroll → the btn-shine and height:auto fixes (Fix 4, Fix 7) will help

#### Step 7: Write down your baseline

Record these numbers — you'll compare after implementing fixes:

| Metric | Your Value |
|--------|-----------|
| Average frame time (Total Time) | _____ ms |
| Worst single frame (highest Total Time) | _____ ms |
| Typical Script time per frame | _____ ms |
| Typical Paint time per frame | _____ ms |
| Typical Layout time per frame | _____ ms |
| Approximate FPS (1000 ÷ avg frame time) | _____ fps |

**Tip:** You can also **Export** your recording (there's an Export button in the top-right area of the Timelines panel, next to Import) to save it as a file. This lets you reload and compare later without having to remember the numbers.

---

### Measuring Frame Time in Chrome

Chrome's process is slightly different but gives you more granular data.

#### Step 1: Open DevTools Performance panel

1. Navigate to your site in Chrome
2. Press `Cmd + Option + I` (Mac) or `Ctrl + Shift + I` (Windows/Linux) to open DevTools
3. Click the **Performance** tab
   - If you don't see it, click the `>>` chevron to find it in the overflow menu

#### Step 2: Configure the recording

1. In the Performance panel, click the **gear icon** (⚙) to open settings
2. Make sure **Screenshots** is checked (useful for seeing what's on screen at each frame)
3. Set **CPU throttling** to **4x slowdown** — this simulates a slower device and makes performance issues more visible even in Chrome
4. Close the settings

#### Step 3: Record a scrolling session

1. Click the **Record** button (gray circle) or press `Cmd + E`
2. Wait 1 second
3. Scroll the same way you did in Safari — top to bottom over 5 seconds, then back up
4. Click **Stop** or press `Cmd + E` again

#### Step 4: Read the frame time data

1. **Look at the Frames lane** at the top of the recording — it shows green bars for each frame
2. **Select the scrolling region** by clicking and dragging across the timeline
3. In the **Summary** tab at the bottom, you'll see a breakdown:
   - **Scripting** — JavaScript execution time
   - **Rendering** — Layout and style calculations
   - **Painting** — Rasterization
   - **System / Idle** — Browser overhead and idle time
4. **For frame-by-frame timing**: Click on individual frames in the Frames lane. The bottom pane will show that specific frame's duration.

5. **To get the average**: Look at the **Frames** section in the summary. Chrome shows the total frame count and flags "dropped frames" with red corners. You can also hover over the Frames lane — each frame shows its duration in a tooltip.

6. **Write down:**
   - Typical frame duration during scroll: _____ ms
   - Number of "long frame" warnings (red triangles): _____
   - Rendering time per frame: _____ ms

#### Alternative: Using Chrome's real-time FPS meter

1. Open DevTools
2. Press `Cmd + Shift + P` (Mac) or `Ctrl + Shift + P` (Windows) to open the Command Menu
3. Type **"Show frames per second"** and select **Show FPS meter** (sometimes listed as **Show frame rendering stats**)
4. A real-time FPS counter appears in the top-left corner of the page showing:
   - Current FPS
   - Frame time graph (visual history)
   - GPU memory usage
5. Scroll around and watch the numbers

---

### What Good vs Bad Numbers Look Like

| Metric | Excellent | Acceptable | Poor |
|--------|-----------|------------|------|
| Average frame time | < 16.67ms | 16.67–25ms | > 25ms |
| Equivalent FPS | 60fps | 40–60fps | < 40fps |
| Longest frame | < 25ms | 25–50ms | > 50ms |
| Dropped frames (% of total) | 0–5% | 5–15% | > 15% |

### What to Expect

**Before fixes:**
- Chrome: 8–14ms average (comfortably at 60fps)
- Safari: 20–40ms+ average during scroll (30–50fps, with spikes worse)
- The gap between these two numbers is what you're fixing

**After all fixes:**
- Chrome: 8–14ms (unchanged — it was already fine)
- Safari: 12–20ms (dramatically closer to Chrome)

### Record Your Baseline Now

Before making any code changes, do one Safari recording and one Chrome recording. Save the numbers somewhere. You'll compare against these after implementing the fixes.

| Browser | Before Fixes | After Fix 1 | After Fix 2 | After All Fixes |
|---------|-------------|-------------|-------------|-----------------|
| Safari avg frame time | _____ ms | _____ ms | _____ ms | _____ ms |
| Safari longest frame | _____ ms | _____ ms | _____ ms | _____ ms |
| Chrome avg frame time | _____ ms | _____ ms | _____ ms | _____ ms |

---

## Fix 1: Remove All `backdrop-filter: blur()` (CRITICAL — biggest single win)

### Why This Matters

`backdrop-filter: blur()` tells the browser: "sample every pixel behind this element, apply a Gaussian blur kernel, then composite the result on top." That's expensive in any browser, but here's what makes it devastating in your app:

Your NanoScene canvas is animating at 60fps behind **everything**. That means every element with `backdrop-blur` must re-sample and re-blur the canvas content **every single frame**. You have 22 of these elements. Safari's WebKit engine is particularly slow at this because it doesn't batch backdrop-filter compositing the way Chrome's Blink engine does.

The fixed navbar is the worst offender — `position: fixed` + `backdrop-blur-xl` means it recomposites on every scroll pixel.

### How to Fix It

This is a two-part fix: first increase background opacity to compensate for losing the blur, then remove the blur classes.

#### Step 1a: Update theme backgrounds in `src/theme/themes.js`

Open `src/theme/themes.js`. You need to increase the opacity values on several background properties so that removing the blur doesn't make the backgrounds too transparent.

**In the `dark` object**, find and update these properties:

```
bgNav: 'bg-slate-950/80'          →  change /80 to /95
bgCard: '...from-slate-800/60...' →  change both /60 to /80
bgCardSolid: '...from-slate-800/60...' → change both /60 to /80
bgCardAlt: 'bg-slate-800/40'      →  change /40 to /60
bgCardStats: '...from-slate-800/90...' → change both /90 to /95
bgBadge: 'bg-slate-800/60'        →  change /60 to /80
```

**In the `light` object**, find and update these properties:

```
bgNav: 'bg-white/95'              →  change /95 to /98
bgCard: 'bg-white/60'             →  change /60 to /80
bgCardSolid: 'bg-white/65'        →  change /65 to /85
bgCardAlt: 'bg-white/55'          →  change /55 to /75
bgCardStats: 'bg-white/60'        →  change /60 to /80
bgBadge: 'bg-white/60'            →  change /60 to /80
bgPill: 'bg-white/55'             →  change /55 to /75
```

**Why these specific values?** The blur was making semi-transparent backgrounds *appear* more opaque by softening the content behind them. Bumping opacity by 15-20 percentage points visually compensates. Since the NanoScene canvas behind them has fairly uniform dark/light tones, the visual difference is negligible.

#### Step 1b: Remove `backdrop-blur-xl` and `backdrop-blur` from all JSX files

Do a project-wide find-and-replace across these files. You're looking for two classes: `backdrop-blur-xl` and `backdrop-blur` (without the `-xl`).

**Files to search:**
- `src/components/KavaLandingPage.jsx` — ~12 instances
- `src/components/FAQPage.jsx` — ~2 instances
- `src/components/ContactPage.jsx` — ~4 instances
- `src/components/MushroomsLandingPage.jsx` — ~4 instances

In each className string, simply delete the `backdrop-blur-xl` or `backdrop-blur` text. Be careful to leave a single space between the remaining classes (don't end up with double spaces).

For example, on **KavaLandingPage.jsx line 236**, you'll see something like:
```
className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl ${theme.bgNav} ...`}
```
Remove `backdrop-blur-xl ` (including the trailing space) to get:
```
className={`fixed top-0 left-0 right-0 z-50 ${theme.bgNav} ...`}
```

Do this for every occurrence in all four files.

#### Step 1c: Update the `.glass` class in `src/index.css`

Find the `.glass` class (around line 204-208):
```css
.glass {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(51, 65, 85, 0.5);
}
```

Remove the `backdrop-filter` line entirely, and change the background opacity from `0.6` to `0.85`:
```css
.glass {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(51, 65, 85, 0.5);
}
```

#### How to verify

1. Open your site in Safari. Scroll through the full page — you should immediately notice smoother scrolling.
2. Check both dark and light themes. The backgrounds should look virtually identical — slightly more solid, but the content behind was mostly uniform color anyway.
3. In Safari Web Inspector → Layers panel, your total layer count should drop significantly.

---

## Fix 2: Replace Canvas Particle Gradients with Solid Fills (CRITICAL)

### Why This Matters

Every frame, your NanoScene creates **55 brand new `createRadialGradient` objects**, each with 4 color stops. That's 55 gradient objects × 60 frames/second = **3,300 gradient creations per second**.

Canvas 2D `createRadialGradient` in WebKit uses CoreGraphics, which does per-pixel color interpolation in software. Chrome's Skia backend does this much faster. But here's the key insight: your particles are **0.8 to 3 pixels wide**. A 4-stop radial gradient on a 3px circle is complete overkill — the color variation across those few pixels is invisible to the human eye.

### How to Fix It

Open `src/components/NanoScene.jsx` and find **lines 429-435** — the particle glow rendering block:

```javascript
const gG = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
gG.addColorStop(0, `hsla(${p.hue + 10}, 92%, 80%, ${fa})`);
gG.addColorStop(0.2, `hsla(${p.hue}, ${colors.pSat}, ${colors.pLight}, ${fa * 0.85})`);
gG.addColorStop(0.4, `hsla(${p.hue}, ${colors.pSat}, ${colors.pLight}, ${fa * 0.3})`);
gG.addColorStop(1, `hsla(${p.hue}, ${colors.pSat}, ${colors.pLight}, 0)`);
ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
ctx.fillStyle = gG; ctx.fill();
```

Replace that entire block with:

```javascript
// Outer glow — solid fill with low alpha (no gradient needed at this size)
ctx.globalAlpha = fa * 0.18;
ctx.beginPath();
ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
ctx.fillStyle = `hsl(${p.hue}, ${colors.pSat}, ${colors.pLight})`;
ctx.fill();

// Inner bright core
ctx.globalAlpha = fa;
ctx.beginPath();
ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
ctx.fillStyle = `hsl(${p.hue + 10}, 92%, 80%)`;
ctx.fill();

ctx.globalAlpha = 1;
```

**What this does differently:** Instead of one gradient circle with 4 color stops, you draw two concentric solid circles — a large dim outer glow and a small bright inner core. The visual result is nearly identical because the gradient detail was imperceptible at 1-3px scale. But you've eliminated 55 `createRadialGradient` calls per frame.

**Important:** Don't forget that last `ctx.globalAlpha = 1;` line — it resets the alpha so subsequent draws aren't affected.

#### How to verify

1. Look at the particles carefully in both Chrome and Safari — they should look the same as before (tiny glowing dots).
2. In Chrome DevTools → Performance tab, record while the page is idle. The yellow JS blocks in the flame chart should be noticeably thinner per frame.

---

## Fix 3: Cache the Vignette Gradient (MEDIUM)

### Why This Matters

The vignette overlay (the subtle dark/light edge tint) uses a `createRadialGradient` that depends only on canvas width and height. Those values only change on window resize, but the gradient is being **recreated from scratch every single frame**. This is a free optimization — cache it once, reuse it.

### How to Fix It

This is a 3-step edit, all in `src/components/NanoScene.jsx`:

**Step 3a:** Find **line 230** where variables are declared:
```javascript
let w, h, dpr;
```
Add a vignette cache variable right after:
```javascript
let w, h, dpr;
let vignetteGrad = null;
```

**Step 3b:** Find the `resize()` function (around **line 250**), specifically the line:
```javascript
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```
Add this line right after it:
```javascript
vignetteGrad = null; // Invalidate on resize so it gets rebuilt at new dimensions
```

**Step 3c:** Find the vignette drawing code (around **lines 450-453**):
```javascript
const vG = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
vG.addColorStop(0, 'rgba(0,0,0,0)');
vG.addColorStop(1, isDark ? 'rgba(2,6,23,0.4)' : 'rgba(255,255,255,0.28)');
ctx.fillStyle = vG;
```

Replace with:
```javascript
if (!vignetteGrad) {
  vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
  vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vignetteGrad.addColorStop(1, isDark ? 'rgba(2,6,23,0.4)' : 'rgba(255,255,255,0.28)');
}
ctx.fillStyle = vignetteGrad;
```

**Why this works:** The gradient object is now created once and reused until a resize event invalidates it. The entire useEffect re-runs when `isDark` changes (it's in the dependency array), so theme switches automatically create a fresh gradient too.

---

## Fix 4: Convert `btn-shine` from `left` to `translateX()` (CRITICAL)

### Why This Matters

This is one of the most common animation performance mistakes on the web. The `btn-shine` sweep animation currently moves pseudo-elements by animating the `left` CSS property. Here's what happens at the browser engine level:

- Animating `left` → browser runs **Layout** (recalculates element position in document flow) → **Paint** (re-rasterizes the affected area) → **Composite** (combines layers)
- Animating `transform: translateX()` → browser runs **Composite** only (GPU moves the existing texture)

That's a 3-step pipeline vs a 1-step pipeline, on every animation frame. This difference is dramatic on Safari because WebKit's layout engine is slower than Blink's for these forced recalculations.

### How to Fix It

Open `src/index.css` and find the `btn-shine` section (around **lines 88-169**).

**Step 4a:** Add `will-change` to both pseudo-elements.

Find `.btn-shine::before` (around line 95) and add this property at the end of the declaration block, before the closing `}`:
```css
will-change: transform, opacity;
```

Find `.btn-shine::after` (around line 119) and add the same:
```css
will-change: transform, opacity;
```

This tells the browser to pre-promote these elements to their own GPU layers before the animation starts, so there's no stutter on first hover.

**Step 4b:** Replace the keyframe animations (around lines 157-169).

Find:
```css
@keyframes btn-shine-sweep {
  0%   { left: -110%; opacity: 0; }
  10%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { left: 150%; opacity: 0; }
}

@keyframes btn-shine-trail {
  0%   { left: -110%; opacity: 0; }
  15%  { opacity: 0.8; }
  75%  { opacity: 0.8; }
  100% { left: 170%; opacity: 0; }
}
```

Replace with:
```css
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
  100% { transform: translateX(400%); opacity: 0; }
}
```

**Why `325%` and `400%`?** The pseudo-elements start at `left: -110%` and have widths of 80% and 35% respectively. To travel the same visual distance across the button, `translateX` needs to translate by a larger percentage because it's relative to the element's own width, not the parent's. These values produce the same visual sweep path.

**Don't change** the `left: -110%` static positioning on the pseudo-elements — that stays. You're only changing what the *animation* does. The element starts at `left: -110%`, and the animation *translates from that starting position*.

#### How to verify

1. Hover over any button with the shine effect in Safari. The sweep should look identical but feel snappier.
2. In Safari Web Inspector → Timelines → Layout, hover over a btn-shine button while recording. You should see **zero layout events** during the sweep animation. Before the fix, you'd see layout events on every frame.

---

## Fix 5: Replace Framer Motion `boxShadow` Animations (HIGH)

### Why This Matters

`box-shadow` is a **paint-triggering** property. When Framer Motion animates it, it interpolates the shadow values in JavaScript on every frame, then the browser must re-paint the element. Chrome caches box-shadow rasterization between frames reasonably well; Safari doesn't.

There are two types of `boxShadow` animation in your code:
- **Infinite pulse** (CTA icon) — this is painting every frame forever
- **Hover transitions** (buttons) — these paint on hover

### How to Fix It

#### Step 5a: Replace the infinite boxShadow pulse on the CTA icon

First, add a new CSS class to `src/index.css`. Add this anywhere (I'd suggest after the `.animate-float` class, around line 193):

```css
/* CTA icon glow pulse — uses opacity on a pseudo-element (compositor-only) */
.animate-glow-pulse {
  position: relative;
}
.animate-glow-pulse::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, transparent 70%);
  animation: glow-opacity 2s ease-in-out infinite;
  pointer-events: none;
  z-index: -1;
}
@keyframes glow-opacity {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
```

**Why opacity instead of box-shadow?** `opacity` is one of only two properties (along with `transform`) that run entirely on the compositor thread — the GPU moves a pre-rasterized texture's transparency without involving the CPU at all. The visual result is the same pulsing green glow.

Now open `src/components/KavaLandingPage.jsx` and find **lines 868-876**:

```jsx
<motion.div
  className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${theme.accent} mb-6`}
  animate={{ 
    boxShadow: ['0 0 20px rgba(16, 185, 129, 0.3)', '0 0 40px rgba(16, 185, 129, 0.5)', '0 0 20px rgba(16, 185, 129, 0.3)']
  }}
  transition={{ duration: 2, repeat: Infinity }}
>
  <MessageCircle className="w-8 h-8 text-slate-900" />
</motion.div>
```

Replace it with a plain `div` using your new CSS class:

```jsx
<div
  className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${theme.accent} mb-6 animate-glow-pulse`}
>
  <MessageCircle className="w-8 h-8 text-slate-900" />
</div>
```

#### Step 5b: Move hover boxShadow from Framer Motion to CSS

You need to edit 3 `whileHover` props in `KavaLandingPage.jsx` and 1 in `MushroomsLandingPage.jsx`.

First, add a stronger hover shadow and an intense variant to the `.btn-shine:hover` rule in `src/index.css`. Find the current `.btn-shine:hover` block and update the box-shadow values:

```css
.btn-shine:hover {
  box-shadow:
    0 0 30px rgba(16, 185, 129, 0.35),
    0 0 15px rgba(16, 185, 129, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

And add a new class right after it:
```css
/* Stronger glow for hero CTA */
.hover-glow-intense:hover {
  box-shadow:
    0 0 50px rgba(16, 185, 129, 0.5),
    0 0 25px rgba(16, 185, 129, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

Now remove `boxShadow` from the Framer Motion `whileHover` props:

**KavaLandingPage.jsx line 309** — nav "Get Started" button:
```
BEFORE: whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)' }}
AFTER:  whileHover={{ scale: 1.05 }}
```
This button already has `btn-shine` in its className, so the CSS hover shadow covers it.

**KavaLandingPage.jsx line 498** — hero CTA button:
```
BEFORE: whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(16, 185, 129, 0.6)' }}
AFTER:  whileHover={{ scale: 1.05 }}
```
Also add `hover-glow-intense` to this element's className string (since it had the stronger 50px glow).

**KavaLandingPage.jsx line 893** — contact form CTA:
```
BEFORE: whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)' }}
AFTER:  whileHover={{ scale: 1.02 }}
```
This also has `btn-shine`, so CSS covers the glow.

**MushroomsLandingPage.jsx line 152** — contact sales button:
```
BEFORE: whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)' }}
AFTER:  whileHover={{ scale: 1.05 }}
```
Also has `btn-shine`.

**Note:** The `style={{ boxShadow: '...' }}` on lines 423 and 514 are **static** styles (not animated), so leave those alone. Static box-shadow is fine — it's only the *animation* that's expensive.

**Why CSS hover is better than Framer Motion here:** CSS transitions on `box-shadow` during `:hover` are a single declarative transition that the browser can schedule optimally. Framer Motion's approach runs a JavaScript spring solver on every frame to interpolate the shadow values, which keeps the main thread busy during what should be a simple visual transition.

---

## Fix 6: Replace CSS `glow` Keyframe Animation (HIGH)

### Why This Matters

The `@keyframes glow` animation in `index.css` (around lines 181-188) animates `box-shadow` infinitely. Same problem as Fix 5 — paint-triggering property running forever.

### How to Fix It

Open `src/index.css` and find:

```css
@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(16, 185, 129, 0.6);
  }
}

.animate-glow {
  animation: glow 2s ease-in-out infinite;
}
```

Replace the entire block with:

```css
@keyframes glow-fade {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.animate-glow {
  position: relative;
}
.animate-glow::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, transparent 70%);
  animation: glow-fade 2s ease-in-out infinite;
  pointer-events: none;
  z-index: -1;
  will-change: opacity;
}
```

**Same technique as Fix 5a**: the glow effect is now a static radial gradient on a pseudo-element, and only `opacity` is animated. The `border-radius: inherit` ensures the glow follows the parent element's shape. The `inset: -8px` extends it slightly beyond the element's bounds to simulate the box-shadow spread.

---

## Fix 7: Convert Mobile Menu from `height: 'auto'` to CSS Grid (HIGH)

### Why This Matters

When Framer Motion sees `animate={{ height: 'auto' }}`, it has to:
1. Temporarily render the element at full height (off-screen or with `visibility: hidden`)
2. Read `element.offsetHeight` from the DOM — this forces a **synchronous layout calculation**
3. Animate from `height: 0` to that measured pixel value

Step 2 is called "layout thrashing" — it forces the browser to stop everything and compute layout right now, in the middle of a JavaScript execution. Safari's layout engine handles this noticeably worse than Chrome's.

The CSS `grid-template-rows: 0fr → 1fr` trick avoids all of this. The browser natively transitions the grid row height without any JavaScript measurement.

### How to Fix It

#### Step 7a: KavaLandingPage.jsx (lines 343-389)

Find the mobile menu block:
```jsx
{/* Mobile menu dropdown */}
<motion.div
  className="md:hidden overflow-hidden"
  initial={false}
  animate={{ 
    height: mobileMenuOpen ? 'auto' : 0,
    opacity: mobileMenuOpen ? 1 : 0
  }}
  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
>
  <div className={`px-6 py-4 border-t ${theme.border}/50 space-y-1`}>
    {/* ... menu items ... */}
  </div>
</motion.div>
```

Replace the wrapper with a plain `div` using CSS grid:
```jsx
{/* Mobile menu dropdown — CSS grid animation (no forced layout measurement) */}
<div
  className="md:hidden"
  style={{
    display: 'grid',
    gridTemplateRows: mobileMenuOpen ? '1fr' : '0fr',
    opacity: mobileMenuOpen ? 1 : 0,
    transition: 'grid-template-rows 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
  }}
>
  <div style={{ overflow: 'hidden' }}>
    <div className={`px-6 py-4 border-t ${theme.border}/50 space-y-1`}>
      {/* ... keep all the same menu items inside, unchanged ... */}
    </div>
  </div>
</div>
```

**Key things to notice:**
- `motion.div` becomes a regular `div`
- No more `initial`, `animate`, `transition` Framer Motion props — it's all CSS now
- You MUST add the extra `<div style={{ overflow: 'hidden' }}>` wrapper around the content — this is required for the `0fr` trick to work (the content needs an overflow container to collapse into)
- The `cubic-bezier(0.22, 1, 0.36, 1)` is the exact same easing curve that was in the Framer Motion transition
- Don't put `overflow-hidden` on the outer div — the grid needs to be allowed to control height

#### Step 7b: Do the exact same thing in MushroomsLandingPage.jsx (lines 189-230)

Same pattern — find `<motion.div ... animate={{ height: mobileMenuOpen ? 'auto' : 0 ... }}>` and replace with the CSS grid version. Keep all the menu items inside unchanged.

#### Step 7c: FAQ accordion in FAQPage.jsx (lines 156-170)

The FAQ accordion uses `AnimatePresence` + `height: 'auto'` for the expand/collapse:

```jsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <p className={`px-6 pb-5 ${theme.textSecondary} leading-relaxed`}>
        {answer}
      </p>
    </motion.div>
  )}
</AnimatePresence>
```

Replace the entire `<AnimatePresence>...</AnimatePresence>` block with:

```jsx
<div
  style={{
    display: 'grid',
    gridTemplateRows: isOpen ? '1fr' : '0fr',
    opacity: isOpen ? 1 : 0,
    transition: 'grid-template-rows 0.3s ease, opacity 0.25s ease',
  }}
>
  <div style={{ overflow: 'hidden' }}>
    <p className={`px-6 pb-5 ${theme.textSecondary} leading-relaxed`}>
      {answer}
    </p>
  </div>
</div>
```

Since you've removed the only usage of `AnimatePresence` in this file, also update the import at the top of `FAQPage.jsx` (line 3):
```
BEFORE: import { motion, AnimatePresence } from 'framer-motion';
AFTER:  import { motion } from 'framer-motion';
```

**Difference from the mobile menu:** The accordion answer content is now always mounted in the DOM (just collapsed to 0fr). This is actually better for accessibility — screen readers can find the content. The visual behavior is identical: it smoothly expands and collapses.

---

## Fix 8: Add `will-change` to Hero Parallax Element (LOW)

### Why This Matters

Framer Motion 11 auto-manages `will-change` for most animations, but for scroll-driven transforms via `useScroll` + `useTransform`, the hint isn't always applied proactively. Adding it explicitly tells Safari to pre-promote this element to its own GPU layer, preventing a stutter on the first scroll frame.

### How to Fix It

Open `src/components/KavaLandingPage.jsx` and find **line 398** — the hero `<motion.header>`:

```jsx
style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
```

Add `willChange`:
```jsx
style={{ opacity: heroOpacity, scale: heroScale, y: heroY, willChange: 'transform, opacity' }}
```

That's it. One property added.

**Don't** add `will-change` to every animated element — that would defeat the purpose by creating too many GPU layers. Only use it for continuously-animating scroll-driven elements like this one.

---

## After All Fixes: Verification Checklist

### Quick Visual Check (all browsers)

| Test | Chrome | Safari | Firefox |
|------|--------|--------|---------|
| Page loads, NanoScene renders | ☐ | ☐ | ☐ |
| Scroll through full page smoothly | ☐ | ☐ | ☐ |
| Navbar is readable (not too transparent) | ☐ | ☐ | ☐ |
| Dark mode looks correct | ☐ | ☐ | ☐ |
| Light mode looks correct | ☐ | ☐ | ☐ |
| Hover over btn-shine buttons (sweep works) | ☐ | ☐ | ☐ |
| Hover over nav "Get Started" (glow appears) | ☐ | ☐ | ☐ |
| CTA icon pulses green glow | ☐ | ☐ | ☐ |
| Mobile menu opens/closes on small screen | ☐ | ☐ | ☐ |
| FAQ accordion opens/closes | ☐ | ☐ | ☐ |
| NanoScene particles respond to mouse | ☐ | ☐ | ☐ |
| Hero parallax works on scroll | ☐ | ☐ | ☐ |
| Mushrooms page mobile menu works | ☐ | ☐ | ☐ |

### Safari Performance Profile (before/after comparison)

1. Open Safari → Develop → Show Web Inspector → Timelines
2. Click the **Frames** instrument (filmstrip icon)
3. Hit record, then scroll slowly through the entire Kava page over ~5 seconds
4. Stop recording
5. Look at the frame timeline — each green bar represents a frame:
   - **Green**: Frame completed in < 16.67ms (60fps) ✓
   - **Yellow**: Frame took 16-33ms (30-60fps) ⚠️
   - **Red**: Frame took > 33ms (< 30fps) ✗
6. **Before fixes**, you'll likely see many yellow/red bars
7. **After fixes**, most bars should be green

### Chrome DevTools Quick Check

1. Open DevTools → Performance → Record while scrolling
2. In the summary, check **Rendering** time — it should be lower after removing backdrop-filter layers
3. In the flame chart, yellow JS blocks per frame should be thinner after the NanoScene gradient fixes

---

## Understanding the Root Cause (Learning Section)

If you want to understand *why* Safari is slower, here's the fundamental architectural difference:

**Chrome (Blink + Skia)**:
- Aggressively promotes elements to GPU layers
- Uses Skia for 2D canvas, which is heavily optimized for radial gradients
- Batches multiple backdrop-filter elements into efficient compositing passes
- Caches box-shadow rasterization between frames when geometry doesn't change
- Layout calculations are highly optimized with aggressive caching

**Safari (WebKit + CoreGraphics)**:
- Conservative layer promotion (fewer GPU layers, less VRAM usage)
- Uses CoreGraphics for 2D canvas, which has slower gradient operations
- Each backdrop-filter element is a separate compositing pass
- Less aggressive box-shadow caching
- Layout calculations are reliable but slower for forced/synchronous measurements

Neither approach is "wrong" — Safari prioritizes battery life and memory efficiency (important on MacBooks and iPhones), while Chrome prioritizes raw rendering speed. As developers, we need to write code that works well with both strategies by sticking to compositor-only properties (`transform`, `opacity`) and avoiding excessive GPU layer creation.

### Further Reading

- https://web.dev/articles/animations-guide — Google's guide to compositor-eligible animations
- https://developer.mozilla.org/en-US/docs/Web/Performance/CSS_JavaScript_animation_performance — MDN's animation performance docs
- https://web.dev/articles/canvas-performance — Canvas 2D optimization techniques
- https://csstriggers.com — See which CSS properties trigger layout, paint, or composite in each browser
- https://css-tricks.com/css-grid-can-do-auto-height-transitions/ — The CSS grid height animation technique