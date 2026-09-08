/**
 * @file: src/components/chat/transport/chatSession.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Mints and remembers the id every stored transcript is filed under. One id per BROWSER,
 *     held in localStorage, so a visitor's tabs and their return visits all append to a single
 *     stored conversation rather than scattering into one document each. See CLAUDE.md § The
 *     session id.
 *
 * @See Also:
 *     functions/lib/chatStore.js
 *     src/components/chat/transport/useChatStream.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

export const SESSION_KEY = 'sol:session-id';

// Must stay in step with SESSION_ID_PATTERN in functions/lib/chatStore.js; a mismatch means the
// server silently files nothing. src/test/chatSession.test.js asserts the two agree.
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

// Firestore rejects a document id matching __.*__ , so the server drops one and stores nothing.
// Mirrors RESERVED_ID_PATTERN in functions/lib/chatStore.js.
const RESERVED_ID_PATTERN = /^__.*__$/;

let cachedId = null;

const isUsable = (id) =>
  typeof id === 'string' && SESSION_ID_PATTERN.test(id) && !RESERVED_ID_PATTERN.test(id);

/** randomUUID is absent on insecure origins and older Safari; the fallback is not a security boundary. */
function mint() {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (isUsable(uuid)) return uuid;
  } catch { /* unavailable in this context */ }
  return `sol-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// localStorage, NOT sessionStorage: Stephen chose to stitch return visits into one transcript
// (2026-08-26). The consequence is a persistent identifier — see CLAUDE.md § The session id.
// Safari private mode throws on access rather than returning null, so both directions are guarded.
const read = () => { try { return window.localStorage.getItem(SESSION_KEY); } catch { return null; } };
const write = (id) => { try { window.localStorage.setItem(SESSION_KEY, id); } catch { /* private mode */ } };

/**
 * The id for this browser's conversation. Losing storage costs transcript continuity, never the
 * chat: an unstorable id still lives in the module memo for the life of the page.
 */
export function chatSessionId() {
  if (isUsable(cachedId)) return cachedId;

  const stored = read();
  cachedId = isUsable(stored) ? stored : mint();
  if (cachedId !== stored) write(cachedId);
  return cachedId;
}

/** Drops the memo so the next call re-reads storage. The seam src/test/chatSession.test.js needs. */
export function resetChatSession() {
  cachedId = null;
}
