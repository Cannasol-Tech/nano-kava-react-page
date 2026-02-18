import { useEffect, useRef } from 'react';
import { trackScrollDepth } from '../utils/gtag';

/**
 * Track scroll depth milestones (25%, 50%, 75%, 100%)
 * using IntersectionObserver for performance.
 *
 * Only fires once per milestone per page load.
 */
export function useScrollDepth() {
  const tracked = useRef({ 25: false, 50: false, 75: false, 100: false });

  useEffect(() => {
    // Create sentinel elements at each depth milestone
    const sentinels = [];
    const depths = [25, 50, 75, 100];

    depths.forEach((depth) => {
      const sentinel = document.createElement('div');
      sentinel.style.position = 'absolute';
      sentinel.style.top = `${depth}%`;
      sentinel.style.height = '1px';
      sentinel.style.width = '1px';
      sentinel.style.opacity = '0';
      sentinel.style.pointerEvents = 'none';
      sentinel.setAttribute('data-scroll-depth', depth);
      document.body.appendChild(sentinel);
      sentinels.push(sentinel);
    });

    // Observe sentinels with IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const depth = parseInt(entry.target.getAttribute('data-scroll-depth'), 10);
            if (!tracked.current[depth]) {
              tracked.current[depth] = true;
              trackScrollDepth(depth);
            }
          }
        });
      },
      { threshold: 0 }
    );

    sentinels.forEach((sentinel) => observer.observe(sentinel));

    // Cleanup
    return () => {
      observer.disconnect();
      sentinels.forEach((sentinel) => document.body.removeChild(sentinel));
    };
  }, []);
}
