import { useRef, useState, useEffect } from 'react';

/**
 * Custom useInView hook — replaces Framer Motion's useInView.
 * Returns [ref, isInView] using IntersectionObserver.
 */
export function useInView({ once = true, margin = '-100px' } = {}) {
  const ref = useRef(null);
  // scripts/prerender.mjs sets this flag. Snapshotting sections already revealed keeps the
  // static HTML fully visible — legible to crawlers and to anyone whose JS never runs —
  // rather than freezing half the page at opacity 0. Real visitors still get the animation.
  const prerendering = typeof window !== 'undefined' && window.__PRERENDER__ === true;
  const [isInView, setIsInView] = useState(prerendering);

  useEffect(() => {
    if (prerendering) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsInView(false);
        }
      },
      { rootMargin: margin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, margin, prerendering]);

  return [ref, isInView];
}
