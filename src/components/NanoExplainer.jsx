/**
 * @file: src/components/NanoExplainer.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     The scale visual Sol raises when someone asks how small ~18nm is. Rises into place while
 *     its blur, tint and shadow resolve on one shared timer, plays a five-second comparison,
 *     and hands off to the sample request. See CLAUDE.md § The nano explainer.
 *
 * @See Also:
 *     src/utils/explainer.js
 *     functions/lib/persona.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { subscribeExplainer, closeExplainer } from '../utils/explainer';
import { trackCTAClick, trackEvent } from '../utils/gtag';

const CLOSE_MS = 260;

// Widths are log-scaled: linear, 18nm against a hair is an invisible sliver next to a full bar.
// Both figures are the site's own stat cards, and the persona confirms absorption and onset are
// in the knowledge base. Stated as specs, never as an outcome for a person.
const STATS = [
  { value: '5\u00d7', label: 'bioavailability' },
  { value: '5 min', label: 'onset time' },
];

const SCALE = [
  { label: 'Human hair', size: '80,000 nm', pct: 100 },
  { label: 'Red blood cell', size: '7,000 nm', pct: 74 },
  { label: 'Virus', size: '100 nm', pct: 38 },
  { label: 'Cannasol droplet', size: '~18 nm', pct: 17, ours: true },
];

export default function NanoExplainer() {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  const dismiss = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      closeExplainer();
      restoreFocusRef.current?.focus?.();
    }, CLOSE_MS);
  }, []);

  useEffect(() => subscribeExplainer((open) => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement;
    setIsClosing(false);
    setIsOpen(true);
    trackEvent('sol_nano_explainer_shown', { page: window.location.pathname });
  }), []);

  useEffect(() => {
    if (!isOpen) return undefined;
    panelRef.current?.focus();
    // Captured and stopped, or the same press also unmounts ChatPanel behind this modal.
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      dismiss();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [dismiss, isOpen]);

  if (!isOpen) return null;

  const suffix = isClosing ? '--closing' : '';

  return (
    <div className={`nano-modal-root${suffix}`} role="presentation">
      <div className="nano-modal-scrim" onClick={dismiss} aria-hidden="true" />

      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nano-explainer-title"
        data-theme={isDark ? 'dark' : 'light'}
        className={`nano-modal${suffix}`}
      >
        <button type="button" className="nano-modal__close" onClick={dismiss} aria-label="Close">
          <X className="w-4 h-4" />
        </button>

        <p className="nano-modal__eyebrow">Ultrasonic nanoemulsification</p>
        <h2 id="nano-explainer-title" className="nano-modal__title">
          How small is 18 nanometres?
        </h2>

        <ul className="nano-modal__scale">
          {SCALE.map((row, i) => (
            <li
              key={row.label}
              className={`nano-modal__row${row.ours ? ' nano-modal__row--ours' : ''}`}
              style={{ '--row-index': i }}
            >
              <span className="nano-modal__label">{row.label}</span>
              <span className="nano-modal__track">
                <span className="nano-modal__bar" style={{ '--bar-pct': `${row.pct}%` }} />
              </span>
              <span className="nano-modal__size">{row.size}</span>
            </li>
          ))}
        </ul>

        <div className="nano-modal__clarity">
          <div className="nano-modal__clarity-strip">
            <span className="nano-modal__clarity-text">kavalactones in suspension</span>
            <span className="nano-modal__clarity-cloud" aria-hidden="true" />
          </div>
          <div className="nano-modal__clarity-legend">
            <span>Traditional emulsion — cloudy</span>
            <span className="nano-modal__clarity-legend-ours">Nano — clear</span>
          </div>
        </div>

        <ul className="nano-modal__stats">
          {STATS.map((stat, i) => (
            <li key={stat.label} className="nano-modal__stat" style={{ '--stat-index': i }}>
              <span className="nano-modal__stat-value">{stat.value}</span>
              <span className="nano-modal__stat-label">{stat.label}</span>
            </li>
          ))}
        </ul>

        <p className="nano-modal__note">
          Ultrasonic cavitation shears botanical oils and resins into droplets roughly four thousand times
          thinner than a hair — small enough that the emulsion stays clear in the finished drink
          instead of clouding it.
        </p>

        <div className="nano-modal__actions">
          <Link
            to="/contact?inquiry=samples&product=nano-kava"
            className="nano-modal__cta"
            onClick={() => {
              trackCTAClick('Request a free sample', 'nano_explainer');
              dismiss();
            }}
          >
            Request a free sample
          </Link>
          <button type="button" className="nano-modal__dismiss" onClick={dismiss}>
            Keep chatting
          </button>
        </div>
      </section>
    </div>
  );
}
