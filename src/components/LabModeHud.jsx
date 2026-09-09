/**
 * @file: src/components/LabModeHud.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Readout that rides the lab-mode easter egg — a nanometer figure settling onto Cannasol's
 *     ~20nm while NanoScene's particle field is spiked. See CLAUDE.md § Lab mode.
 *
 * @See Also:
 *     src/utils/labMode.js
 *     src/components/NanoScene.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React, { useEffect, useState } from 'react';
import { subscribeLabMode } from '../utils/labMode';

const TARGET_NM = 20;
const TICK_MS = 90;
const SETTLE_AFTER = 22; // ticks of scatter before the readout locks on

export default function LabModeHud() {
  const [active, setActive] = useState(false);
  const [nm, setNm] = useState(TARGET_NM);

  useEffect(() => subscribeLabMode(setActive), []);

  useEffect(() => {
    if (!active) return undefined;
    let tick = 0;
    const id = window.setInterval(() => {
      tick += 1;
      // Converges rather than randomising forever, so it reads as an instrument locking on.
      const spread = Math.max(0, 1 - tick / SETTLE_AFTER) * 9;
      setNm(TARGET_NM + (Math.random() - 0.5) * 2 * spread);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div className="lab-hud" role="status" aria-live="polite">
      <span className="lab-hud__dot" aria-hidden="true" />
      <span>LAB MODE</span>
      <span>
        DROPLET Ø <span className="lab-hud__value">{nm.toFixed(1)}</span> nm
      </span>
    </div>
  );
}
