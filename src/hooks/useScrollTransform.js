import { useState, useEffect } from 'react';

const STATIC_STYLE = { opacity: 1, transform: 'scale(1) translateY(0px)' };

const PREFERS_REDUCED_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Scroll-driven fade/scale/lift for the hero, mapping scroll progress [0, 0.5] onto
 * opacity [1, 0], scale [1, 0.95] and translateY [0, 100px].
 *
 * Quantised to 0.5% steps so an unchanged frame does not re-render the subtree —
 * see CLAUDE.md § useScrollTransform quantises its progress.
 */
export function useScrollTransform(ref) {
  const [style, setStyle] = useState(STATIC_STYLE);

  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return;

    let ticking = false;
    let lastStep = -1;

    function onScroll() {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        const el = ref.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, -rect.top / rect.height));
        const t = Math.min(1, progress / 0.5);

        const step = Math.round(t * 200);
        if (step === lastStep) return;
        lastStep = step;

        const q = step / 200;
        setStyle({
          opacity: 1 - q,
          transform: `scale(${1 - q * 0.05}) translateY(${q * 100}px)`,
          // Held only mid-transition; a permanent hint pins a compositor layer forever.
          ...(q > 0 && q < 1 ? { willChange: 'transform, opacity' } : null),
        });
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ref]);

  return style;
}
