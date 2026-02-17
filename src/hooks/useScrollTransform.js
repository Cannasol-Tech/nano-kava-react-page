import { useState, useEffect } from 'react';

/**
 * Custom scroll transform hook — replaces Framer Motion's useScroll + useTransform.
 * Returns a style object { opacity, transform } that interpolates based on
 * how far the target element has scrolled past the viewport top.
 *
 * Matches the original FM behavior:
 *   heroOpacity:  scrollYProgress [0, 0.5] → [1, 0]
 *   heroScale:    scrollYProgress [0, 0.5] → [1, 0.95]
 *   heroY:        scrollYProgress [0, 0.5] → [0, 100]
 */
export function useScrollTransform(ref) {
  const [style, setStyle] = useState({
    opacity: 1,
    transform: 'scale(1) translateY(0px)',
    willChange: 'transform, opacity',
  });

  useEffect(() => {
    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) { ticking = false; return; }

        const rect = el.getBoundingClientRect();
        // scrollYProgress: 0 when element top is at viewport top, 1 when element bottom reaches viewport top
        const progress = Math.min(1, Math.max(0, -rect.top / rect.height));
        // Map [0, 0.5] progress → [0, 1] for the transform factor
        const t = Math.min(1, progress / 0.5);

        const opacity = 1 - t;
        const scale = 1 - t * 0.05;
        const y = t * 100;

        setStyle({
          opacity,
          transform: `scale(${scale}) translateY(${y}px)`,
          willChange: 'transform, opacity',
        });

        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ref]);

  return style;
}
