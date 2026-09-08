/**
 * @file: src/components/LoadPulse.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     The ultrasonic pulse — three concentric rings emitted from the primary sphere once
 *     it has coalesced, then gone. Mounts on its mark and unmounts after, so the settled
 *     page carries no residual compositing layer. See CLAUDE.md § Load sequence.
 *
 * @See Also:
 *     src/utils/loadSequence.js
 *     src/components/NanoScene.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React, { useEffect, useRef, useState } from 'react';
import { SEQUENCE, isSequenceEnabled, msUntil } from '../utils/loadSequence';
import { PRIMARY_SPHERE_ANCHOR } from './NanoScene';

export default function LoadPulse() {
  const enabledRef = useRef(isSequenceEnabled());
  const [ringing, setRinging] = useState(false);

  useEffect(() => {
    if (!enabledRef.current) return undefined;
    const on = window.setTimeout(() => setRinging(true), msUntil(SEQUENCE.pulseAtMs));
    const off = window.setTimeout(() => setRinging(false), msUntil(SEQUENCE.pulseAtMs + SEQUENCE.pulseMs));
    return () => { window.clearTimeout(on); window.clearTimeout(off); };
  }, []);

  if (!ringing) return null;

  return (
    <div
      className="nano-pulse"
      aria-hidden="true"
      style={{ left: `${PRIMARY_SPHERE_ANCHOR.xPct}%`, top: `${PRIMARY_SPHERE_ANCHOR.yPct}%` }}
    >
      <span /><span /><span />
    </div>
  );
}
