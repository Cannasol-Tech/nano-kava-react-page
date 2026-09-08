/**
 * @file: src/hooks/useSectionDwell.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Reports the section a visitor has actually settled on, rather than every section they
 *     scrolled past. IntersectionObserver plus a dwell timer, never a scroll listener.
 *
 * @See Also:
 *     src/components/chat/engagement/sectionPrompts.js
 *     src/hooks/useScrollDepth.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { useEffect, useRef } from 'react';
import { DWELL_MS } from '../components/chat/engagement/sectionPrompts';

// Routes are lazy, so the sections may not exist yet when this first runs.
const ATTACH_RETRY_MS = 400;
const ATTACH_GIVE_UP_MS = 6000;

export function useSectionDwell(sectionIds, onDwell, { enabled = true, dwellMs = DWELL_MS } = {}) {
  const onDwellRef = useRef(onDwell);
  onDwellRef.current = onDwell;

  const key = sectionIds.join(',');

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return undefined;

    const timers = new Map();
    let observer = null;
    let retryId = null;
    let waited = 0;

    const clearTimer = (id) => {
      if (!timers.has(id)) return;
      clearTimeout(timers.get(id));
      timers.delete(id);
    };

    const attach = () => {
      const elements = key.split(',').map((id) => document.getElementById(id)).filter(Boolean);
      if (elements.length === 0) {
        waited += ATTACH_RETRY_MS;
        if (waited < ATTACH_GIVE_UP_MS) retryId = setTimeout(attach, ATTACH_RETRY_MS);
        return;
      }

      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          if (!entry.isIntersecting) {
            clearTimer(id);
            return;
          }
          if (timers.has(id)) return;
          timers.set(id, setTimeout(() => {
            timers.delete(id);
            onDwellRef.current(id);
          }, dwellMs));
        });
      }, { threshold: 0.35 });

      elements.forEach((el) => observer.observe(el));
    };

    attach();

    return () => {
      if (retryId) clearTimeout(retryId);
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      observer?.disconnect();
    };
  }, [enabled, dwellMs, key]);
}
