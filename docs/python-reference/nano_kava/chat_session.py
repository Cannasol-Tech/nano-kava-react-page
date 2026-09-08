"""
file: docs/python-reference/nano_kava/chat_session.py
author: Stephen Boyett

description:
    Python replica of src/components/chat/transport/chatSession.js — the browser-side id every
    stored transcript is filed under. `sessionStorage` has no Python equivalent, so the Storage
    Protocol here stands in for it and the tests supply one that throws, which is what Safari
    private mode actually does.

See Also:
    src/components/chat/transport/chatSession.js
    docs/python-reference/nano_kava/chat_store.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from __future__ import annotations

import random
import re
import time
import uuid
from typing import Any, Protocol

SESSION_KEY = "sol:session-id"

# Must stay in step with SESSION_ID_PATTERN in functions/lib/chatStore.js; a mismatch means the
# server silently files nothing.
SESSION_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{8,64}")


class Storage(Protocol):
    """JS: `window.sessionStorage`. May raise on every method — see Safari private mode."""

    def get_item(self, key: str) -> str | None: ...
    def set_item(self, key: str, value: str) -> None: ...


def _usable(session_id: Any) -> bool:
    return isinstance(session_id, str) and SESSION_ID_PATTERN.fullmatch(session_id) is not None


def _to_base36(number: int) -> str:
    """JS `Number.prototype.toString(36)`. Python's int() parses base 36 but cannot emit it."""
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    if number == 0:
        return "0"
    out = ""
    while number:
        number, remainder = divmod(number, 36)
        out = digits[remainder] + out
    return out


class ChatSession:
    """
    JS holds `cachedId` in module scope, so one browser tab has exactly one. A class instance is
    the same singleton made explicit; `reset()` is the seam the JS exposes as `resetChatSession`.
    """

    def __init__(self, storage: Storage | None = None) -> None:
        self._storage = storage
        self._cached_id: str | None = None

    def _mint(self) -> str:
        """randomUUID is absent on insecure origins and older Safari; the fallback is not a
        security boundary."""
        try:
            candidate = str(uuid.uuid4())
            if _usable(candidate):
                return candidate
        except Exception:
            pass  # JS: `catch { /* unavailable in this context */ }`
        stamp = _to_base36(int(time.time() * 1000))
        noise = _to_base36(random.getrandbits(52))[:10]
        return f"sol-{stamp}-{noise}"

    def _read(self) -> str | None:
        # Safari private mode raises on access rather than returning null, so both directions
        # are guarded. JS: `try { … } catch { return null }`.
        try:
            return self._storage.get_item(SESSION_KEY) if self._storage else None
        except Exception:
            return None

    def _write(self, session_id: str) -> None:
        try:
            if self._storage:
                self._storage.set_item(SESSION_KEY, session_id)
        except Exception:
            pass

    def session_id(self) -> str:
        """
        The id for this tab's conversation. Losing storage costs one transcript continuity, never
        the chat: an unstorable id still lives in the memo for the life of the page.
        """
        if _usable(self._cached_id):
            return self._cached_id  # type: ignore[return-value]

        stored = self._read()
        self._cached_id = stored if _usable(stored) else self._mint()
        if self._cached_id != stored:
            self._write(self._cached_id)
        return self._cached_id

    def reset(self) -> None:
        """Drops the memo so the next call re-reads storage."""
        self._cached_id = None
