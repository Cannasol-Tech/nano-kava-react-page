import { useRef, useState, useEffect } from 'react';

/**
 * Custom useInView hook — replaces Framer Motion's useInView.
 * Returns [ref, isInView] using IntersectionObserver.
 */
export function useInView({ once = true, margin = '-100px' } = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
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
  }, [once, margin]);

  return [ref, isInView];
}
