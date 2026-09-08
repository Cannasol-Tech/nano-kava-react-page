"""
file: docs/python-reference/nano_kava/chat_store.py
author: Stephen Boyett

description:
    Line-for-line Python replica of functions/lib/chatStore.js — the 30-turn cap, the 90-day
    retention stamp, the append rule and the transactional upsert. Behaviour is identical; only
    the idioms differ. Every place the two languages would have disagreed carries a `JS:` note.
    This file is a reading aid and is not imported by anything that runs in production.

See Also:
    functions/lib/chatStore.js
    docs/python-reference/README.md

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol

from .jsisms import UNDEFINED, falsy_or, is_truthy, js_clip, js_slice_tail, nullish

log = logging.getLogger(__name__)

COLLECTION = "chatSessions"

MAX_TURNS = 30
RETENTION_DAYS = 90
RETENTION = timedelta(days=RETENTION_DAYS)
MAX_TURN_CHARS = 2000
MAX_PAGE_CHARS = 200

# JS: /^[A-Za-z0-9_-]{8,64}$/ with re.match would be WRONG here — Python's `$` also matches
# before a trailing newline, so "abcdefgh\n" would pass in Python and fail in JS. re.fullmatch
# with no anchors is the faithful translation.
SESSION_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{8,64}")

ROLES = frozenset({"user", "model"})


@dataclass(frozen=True)
class Turn:
    """JS: a plain `{ role, text }` object literal."""

    role: str
    text: str


@dataclass
class StoredSession:
    """
    JS: the Firestore document, read back as a plain object. Every field is Optional because a
    document written by an older version may simply not have it — which is exactly the case the
    `??` fallbacks in `persist_transcript` exist to survive.
    """

    session_id: str | None = None
    messages: list[Turn] | None = None
    turn_count: int | None = None
    page: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    expires_at: datetime | None = None


@dataclass(frozen=True)
class WriteResult:
    """JS: `{ ok, reason }`. `reason` is absent rather than null on success."""

    ok: bool
    reason: str | None = None


def is_valid_session_id(session_id: Any) -> bool:
    """JS: `typeof id === 'string' && SESSION_ID_PATTERN.test(id)`."""
    return isinstance(session_id, str) and SESSION_ID_PATTERN.fullmatch(session_id) is not None


def _usable(turn: Any) -> bool:
    # JS: `t && ROLES.has(t.role) && typeof t.text === 'string' && t.text.trim()`
    if not is_truthy(turn):
        return False
    role = getattr(turn, "role", UNDEFINED)
    text = getattr(turn, "text", UNDEFINED)
    return role in ROLES and isinstance(text, str) and text.strip() != ""


def cap_turns(turns: Any) -> list[Turn]:
    """Keeps only usable turns, clips each, and keeps the most recent MAX_TURNS."""
    # JS: `if (!Array.isArray(turns)) return []` — a string is iterable in both languages, so
    # an isinstance check on `list` is what stops "nope" from becoming four turns.
    if not isinstance(turns, list):
        return []
    kept = [
        Turn(role=t.role, text=js_clip(t.text.strip(), MAX_TURN_CHARS))
        for t in turns
        if _usable(t)
    ]
    return js_slice_tail(kept, MAX_TURNS)


def expires_at_from(created_at: datetime) -> datetime:
    """Retention runs from creation, not last activity — an active chat still ages out."""
    return created_at + RETENTION


def _model_turn(text: Any) -> Turn:
    # JS: `{ role: 'model', text: typeof text === 'string' ? text : '' }`
    return Turn(role="model", text=text if isinstance(text, str) else "")


def additions_for(existing: StoredSession | None, history: Any, reply: Any) -> list[Turn]:
    """
    The client replays a sliding window of history every turn, so appending it wholesale would
    duplicate. An existing document therefore takes only the new exchange; a new one takes the
    whole window, which is the only chance to capture the client-owned greeting.
    """
    incoming = history if isinstance(history, list) else []
    if existing is None:
        return cap_turns([*incoming, _model_turn(reply)])
    # JS: `incoming[incoming.length - 1]` yields `undefined` on an empty array and cap_turns
    # filters it out. Python's `incoming[-1]` would raise IndexError, so the guard is explicit.
    last = incoming[-1] if incoming else UNDEFINED
    return cap_turns([last, _model_turn(reply)])


class Transaction(Protocol):
    """JS: the transaction object Firestore hands `runTransaction`'s callback."""

    def get(self, path: str) -> StoredSession | None: ...
    def set(self, path: str, document: StoredSession) -> None: ...


class Firestore(Protocol):
    def run_transaction(self, fn: Any) -> Any: ...


def persist_transcript(
    *,
    db: Firestore,
    session_id: Any,
    history: Any = None,
    reply: Any = None,
    page: Any = None,
    now: datetime | None = None,
) -> WriteResult:
    """
    Upserts one turn's worth of transcript. Never raises: a lost transcript is telemetry, and the
    visitor's answer has already streamed by the time this runs.
    """
    # JS: `now = new Date()` as a default parameter is evaluated at CALL time. Python evaluates
    # defaults once at DEF time, so a `datetime.now()` default would freeze at import. Hence None.
    if now is None:
        now = datetime.now(timezone.utc)

    # Absent is ordinary — an old cached bundle sends none. Present-and-wrong is worth a line.
    if session_id is None or session_id is UNDEFINED:
        return WriteResult(ok=False, reason="no-session-id")
    if not is_valid_session_id(session_id):
        log.warning("[chatStore] rejected: malformed sessionId")
        return WriteResult(ok=False, reason="invalid-session-id")
    if not additions_for(None, history, reply):
        return WriteResult(ok=False, reason="nothing-to-store")

    try:
        path = f"{COLLECTION}/{session_id}"

        def txn(tx: Transaction) -> None:
            existing = tx.get(path)
            additions = additions_for(existing, history, reply)

            # Every fallback is `??`/`||` exactly as the JS has it, never a plain `or`: Firestore
            # rejects an undefined field value, and this function swallows the throw, so one
            # missing field would silently lose every later turn of that chat.
            tx.set(
                path,
                StoredSession(
                    session_id=session_id,
                    messages=cap_turns(
                        [*falsy_or(getattr(existing, "messages", None), []), *additions]
                    ),
                    turn_count=falsy_or(getattr(existing, "turn_count", None), 0) + len(additions),
                    page=nullish(getattr(existing, "page", None), js_clip(page, MAX_PAGE_CHARS)),
                    created_at=nullish(getattr(existing, "created_at", None), now),
                    updated_at=now,
                    expires_at=nullish(
                        getattr(existing, "expires_at", None), expires_at_from(now)
                    ),
                ),
            )

        db.run_transaction(txn)
        return WriteResult(ok=True)
    except Exception as error:  # JS: `catch (error)` catches everything thrown.
        log.error("[chatStore] failed to persist transcript: %s", error)
        return WriteResult(ok=False, reason="write-failed")


@dataclass
class TranscriptRecorder:
    """
    Wraps the SSE sink so the turn's spoken text can be stored without the streaming core knowing
    a database exists. Text frames are the only ones that make it into a transcript.
    """

    on_event: Any = None
    _spoken: list[str] = field(default_factory=list)

    def emit(self, event: Any) -> None:
        # JS: `event?.type === 'text'` — optional chaining short-circuits on null/undefined.
        if isinstance(event, dict) and event.get("type") == "text":
            delta = event.get("delta")
            if isinstance(delta, str):
                self._spoken.append(delta)
        if self.on_event is not None:
            self.on_event(event)

    def reply(self) -> str:
        return "".join(self._spoken)


def create_transcript_recorder(on_event: Any = None) -> TranscriptRecorder:
    return TranscriptRecorder(on_event=on_event)
