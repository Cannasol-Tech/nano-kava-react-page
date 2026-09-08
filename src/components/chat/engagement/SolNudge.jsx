/**
 * @file: src/components/chat/engagement/SolNudge.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     The contextual bubble Sol raises above his launcher once a visitor settles on a section.
 *     Tapping it opens the panel with the question already asked, so the nudge starts a
 *     conversation rather than an empty box. See CLAUDE.md § Section-aware nudges.
 *
 * @See Also:
 *     src/components/chat/engagement/sectionPrompts.js
 *     src/components/chat/ChatWidget.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React from 'react';
import { X } from 'lucide-react';

export default function SolNudge({ prompt, isDark, shimmer = false, onAccept, onDismiss }) {
  if (!prompt) return null;

  return (
    <div
      className={`sol-nudge${shimmer ? ' sol-nudge--shimmer' : ''}`}
      data-theme={isDark ? 'dark' : 'light'}
      role="status"
    >
      <button
        type="button"
        className="sol-nudge__body"
        onClick={onAccept}
        data-intent={prompt.intent}
      >
        <span className="sol-nudge__who">Sol</span>
        <span className="sol-nudge__label">{prompt.label}</span>
      </button>
      <button
        type="button"
        className="sol-nudge__close"
        onClick={onDismiss}
        aria-label="Dismiss Sol's suggestion"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
