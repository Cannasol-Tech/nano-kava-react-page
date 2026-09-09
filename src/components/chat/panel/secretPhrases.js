/**
 * @file: src/components/chat/panel/secretPhrases.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Chat easter egg (idea #11). Matches only a deliberate one-word entry, so a formulator
 *     asking a real question about 20nm still reaches Sol. See CLAUDE.md § The secret phrase.
 *
 * @See Also:
 *     src/utils/nanoRainbow.js
 *     src/components/chat/panel/ChatPanel.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

export const SECRET_PHRASES = [
  {
    key: 'bula',
    triggers: ['bula', 'bula!'],
    reply: 'Bula! That is the toast — and the welcome. Watch the particles for a second.',
  },
  {
    key: '20nm',
    triggers: ['20nm', '20 nm', '~20nm'],
    reply: 'Twenty nanometres, on the nose. Here is what that looks like when it lights up.',
  },
];

/**
 * Exact match on the trimmed entry only. Substring matching would swallow "can you hold 20nm
 * through hot-fill?", which is a real question and the opposite of an easter egg.
 */
export function matchSecretPhrase(text) {
  const entry = (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!entry) return null;
  return SECRET_PHRASES.find((phrase) => phrase.triggers.includes(entry)) || null;
}
