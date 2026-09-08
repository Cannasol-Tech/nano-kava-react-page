"""
file: docs/python-reference/nano_kava/chat_request.py
author: Stephen Boyett

description:
    Python replica of the request-validation and rate-limiting halves of functions/lib/chat.js —
    `validateChatRequest` and `rateLimit`. The Gemini streaming loop is deliberately absent: it is
    network I/O against a vendor SDK, so a replica of it would teach the SDK rather than the
    language.

See Also:
    functions/lib/chat.js
    docs/python-reference/nano_kava/chat_store.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass
from typing import Any

from .chat_store import is_valid_session_id
from .jsisms import UNDEFINED, falsy_or, js_clip

MAX_MESSAGES = 20
MAX_MESSAGE_CHARS = 2000
MAX_PAYLOAD_CHARS = 12000
MAX_PAGE_CHARS = 200
RATE_LIMIT_MAX = 30
RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000


@dataclass(frozen=True)
class Message:
    role: str
    text: str


@dataclass(frozen=True)
class ChatRequest:
    """JS: `{ ok, messages, sessionId, page }` or `{ ok: false, error }` — one shape, two uses."""

    ok: bool
    error: str | None = None
    messages: tuple[Message, ...] = ()
    session_id: str | None = None
    page: str = ""


def validate_chat_request(body: Any) -> ChatRequest:
    """
    Normalizes and bounds an incoming chat request body. `session_id` and `page` feed transcript
    persistence only, so both degrade to a blank rather than rejecting the turn — an old cached
    bundle sends neither and must still get an answer.
    """
    # JS: `body && body.messages` returns the falsy left operand, not a boolean.
    raw = body.get("messages") if isinstance(body, dict) else None
    if not isinstance(raw, list) or len(raw) == 0:
        return ChatRequest(ok=False, error="messages must be a non-empty array")
    if len(raw) > MAX_MESSAGES:
        return ChatRequest(ok=False, error="This conversation is too long. Please start a new chat.")

    total_chars = 0
    for message in raw:
        role = message.get("role") if isinstance(message, dict) else UNDEFINED
        text = message.get("text") if isinstance(message, dict) else UNDEFINED
        if role not in ("user", "model"):
            return ChatRequest(ok=False, error='Each message needs a role of "user" or "model"')
        if not isinstance(text, str):
            return ChatRequest(ok=False, error="Each message needs a text string")
        if len(text) > MAX_MESSAGE_CHARS:
            return ChatRequest(
                ok=False, error=f"Messages are limited to {MAX_MESSAGE_CHARS} characters"
            )
        total_chars += len(text)

    if total_chars > MAX_PAYLOAD_CHARS:
        return ChatRequest(ok=False, error="This conversation is too long. Please start a new chat.")

    session_id = body.get("sessionId")
    return ChatRequest(
        ok=True,
        messages=tuple(Message(role=m["role"], text=m["text"]) for m in raw),
        session_id=session_id if is_valid_session_id(session_id) else None,
        page=js_clip(body.get("page"), MAX_PAGE_CHARS),
    )


@dataclass(frozen=True)
class RateLimitResult:
    ok: bool
    retry_after: int | None = None


class RateLimiter:
    """
    JS keeps `rateLimitBuckets` and `lastPrunedAt` in module scope, which is a singleton per
    process. A class is the Pythonic spelling of the same thing and makes it testable without
    reaching into module globals — the one place this replica is deliberately NOT line-for-line.

    Per-instance and best-effort in both languages: gen2 instances are ephemeral, so the counter
    resets on cold start and each instance counts independently.
    """

    def __init__(self) -> None:
        self._buckets: dict[str, list[float]] = {}
        self._last_pruned_at = self._now_ms()

    @staticmethod
    def _now_ms() -> float:
        # JS `Date.now()` is milliseconds; Python `time.time()` is seconds.
        return time.time() * 1000

    def _prune(self, now: float) -> None:
        self._last_pruned_at = now
        # JS deletes from the Map while iterating it, which is legal there. Python raises
        # RuntimeError for that, so the keys are collected first.
        stale = [k for k, hits in self._buckets.items() if now - hits[-1] >= RATE_LIMIT_WINDOW_MS]
        for key in stale:
            del self._buckets[key]

    def check(self, ip: Any, now: float | None = None) -> RateLimitResult:
        now = self._now_ms() if now is None else now
        if now - self._last_pruned_at >= RATE_LIMIT_WINDOW_MS:
            self._prune(now)

        key = falsy_or(ip, "unknown")  # JS `ip || 'unknown'`: '' and None both become 'unknown'.
        hits = [at for at in self._buckets.get(key, []) if now - at < RATE_LIMIT_WINDOW_MS]
        if len(hits) >= RATE_LIMIT_MAX:
            retry_after = math.ceil((RATE_LIMIT_WINDOW_MS - (now - hits[0])) / 1000)
            return RateLimitResult(ok=False, retry_after=retry_after)

        hits.append(now)
        self._buckets[key] = hits
        return RateLimitResult(ok=True)
