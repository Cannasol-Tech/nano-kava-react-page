/**
 * @file: src/components/chat/panel/EmojiPicker.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Dependency-free emoji popover for the Sol composer: a curated grid of beverage,
 *     lab and business glyphs kept as a plain array so nothing ships to npm for it. Lazy
 *     imported by ChatPanel so the grid stays out of the initial bundle, and it swallows
 *     Escape in the capture phase so dismissing the picker never closes the whole panel.
 *
 * @See Also:
 *     src/components/chat/panel/ChatPanel.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import themesConfig from '../../../theme/themes';

const EMOJI = [
  '👋', '🙂', '😄', '😉', '🤝', '🙏', '👍', '👏', '🎉', '✨',
  '🔥', '💡', '✅', '❓', '❗', '⏱️', '📅', '📈', '📊', '📦',
  '🧪', '🔬', '⚗️', '🧬', '💧', '🫧', '🌿', '🍃', '🥤', '🧃',
  '🍹', '🍵', '🧉', '🍶', '🍫', '🍬', '🥥', '🍋', '🍊', '🫐',
  '🏭', '⚙️', '🔧', '📐', '🧾', '💵', '💰', '🚚', '🛒', '🏷️',
  '📞', '✉️', '📎', '📝', '🔗', '🌎', '🚀', '⭐', '❤️', '🤙',
];

export default function EmojiPicker({ onSelect, onDismiss }) {
  const { isDark } = useTheme();
  const theme = isDark ? themesConfig.dark : themesConfig.light;
  const rootRef = useRef(null);

  useEffect(() => {
    const swallowEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onDismiss();
    };
    const dismissOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) onDismiss();
    };
    document.addEventListener('keydown', swallowEscape, true);
    document.addEventListener('mousedown', dismissOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', swallowEscape, true);
      document.removeEventListener('mousedown', dismissOnOutsideClick);
    };
  }, [onDismiss]);

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Emoji"
      className={`sol-emoji-pop absolute bottom-full left-0 mb-2 w-64 rounded-xl border p-2 ${theme.bgCardStats} ${theme.borderCard} ${theme.shadowXl}`}
    >
      <div className="grid grid-cols-10 gap-0.5 max-h-40 overflow-y-auto overscroll-contain">
        {EMOJI.map((glyph) => (
          <button
            key={glyph}
            type="button"
            aria-label={`Insert ${glyph}`}
            onClick={() => onSelect(glyph)}
            className="interactive-btn hover-scale active-press-sm rounded text-base leading-none py-1"
          >
            {glyph}
          </button>
        ))}
      </div>
    </div>
  );
}
