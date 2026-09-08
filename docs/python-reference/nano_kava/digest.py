"""
file: docs/python-reference/nano_kava/digest.py
author: Stephen Boyett

description:
    Python replica of the pure half of functions/lib/digest.js — validation, HTML escaping,
    recipient selection and the per-IP limiter. The SendGrid call is omitted; everything that
    decides WHAT gets sent, and to WHOM, is here, because that is the security surface.

See Also:
    functions/lib/digest.js
    functions/lib/CLAUDE.md

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from typing import Any

from .jsisms import UNDEFINED, is_truthy, js_clip, js_string, nullish

MAX_MESSAGES = 60
MAX_MESSAGE_CHARS = 2000
MAX_FIELD_CHARS = 200
MIN_MESSAGES = 2
RATE_LIMIT_MAX = 6
RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

ROLES = frozenset({"user", "model", "system", "lead"})

REVIEWER = "stephen.boyett@cannasolusa.com"
FOUNDER = "josh.detzel@cannasolusa.com"

CONTACT_KEYS = ("name", "company", "email", "phone")
REASONS = ("timeout", "closed", "lead")

HTML_ESCAPES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}


def escape_html(value: Any) -> str:
    """
    Every value reaching this is visitor-authored or LLM-summarised. Note it escapes `'` to
    `&#39;`, which Python's own html.escape(quote=True) renders as `&#x27;` — same meaning,
    different bytes, so the replica spells the table out rather than reaching for the stdlib.
    """
    # JS: String(value ?? '').replace(/[&<>"']/g, c => HTML_ESCAPES[c])
    return re.sub(r"[&<>\"']", lambda m: HTML_ESCAPES[m.group(0)], js_string(nullish(value, "")))


@dataclass(frozen=True)
class DigestCounts:
    received: int
    visitor_turns: int
    page: str


@dataclass(frozen=True)
class DigestMessage:
    role: str
    text: str


@dataclass(frozen=True)
class Digest:
    messages: tuple[DigestMessage, ...]
    contact: dict[str, str]
    page: str
    lead_sent: bool
    share_authorized: bool
    reason: str


@dataclass(frozen=True)
class DigestValidation:
    ok: bool
    received: int = 0
    visitor_turns: int = 0
    page: str = ""
    error: str | None = None
    digest: Digest | None = None


def recipients_for(lead_sent: bool, share_authorized: bool) -> list[str]:
    """Recipients are earned, not default. Stephen's rule, 2026-08-25."""
    return [REVIEWER, FOUNDER] if lead_sent or share_authorized else [REVIEWER]


def summarise_digest(payload: Any) -> DigestCounts:
    """
    Everything a rejection may be logged with. Deliberately excludes message text: the log line
    lands in Cloud Logging and the text is visitor-authored.
    """
    raw = payload.get("messages") if isinstance(payload, dict) else None
    messages = raw if isinstance(raw, list) else []
    page = payload.get("page") if isinstance(payload, dict) else UNDEFINED
    return DigestCounts(
        received=len(messages),
        visitor_turns=sum(
            1 for m in messages if isinstance(m, dict) and m.get("role") == "user"
        ),
        page=js_clip(page, MAX_FIELD_CHARS),
    )


def validate_digest(payload: Any) -> DigestValidation:
    """
    Rejects anything not worth mailing, and normalises what is. Returning ok=False for a short
    conversation is the main volume control — most visits open Sol and say nothing.
    """
    counts = summarise_digest(payload)
    raw = payload.get("messages") if isinstance(payload, dict) else None
    if not isinstance(raw, list):
        return DigestValidation(ok=False, error="messages-not-an-array", **vars(counts))

    usable = [
        m
        for m in raw
        if isinstance(m, dict)
        and m.get("role") in ROLES
        and isinstance(m.get("text"), str)
        and is_truthy(m["text"].strip())
    ]
    cleaned = tuple(
        DigestMessage(role=m["role"], text=js_clip(m["text"].strip(), MAX_MESSAGE_CHARS))
        for m in usable[-MAX_MESSAGES:]
    )

    if len(cleaned) < MIN_MESSAGES:
        return DigestValidation(ok=False, error="conversation-too-short", **vars(counts))
    if not any(m.role == "user" for m in cleaned):
        return DigestValidation(ok=False, error="no-visitor-turns", **vars(counts))

    contact_in = payload.get("contact") or {}
    contact = {}
    for key in CONTACT_KEYS:
        value = js_clip(contact_in.get(key) if isinstance(contact_in, dict) else None,
                        MAX_FIELD_CHARS).strip()
        if value:
            contact[key] = value

    reason = payload.get("reason")
    return DigestValidation(
        ok=True,
        **vars(counts),
        digest=Digest(
            messages=cleaned,
            contact=contact,
            page=counts.page,
            lead_sent=bool(payload.get("leadSent")),
            share_authorized=bool(payload.get("shareAuthorized")),
            reason=reason if reason in REASONS else "closed",
        ),
    )


class DigestRateLimiter:
    """Same shape as the chat limiter, and the same caveat: per-instance and best-effort."""

    def __init__(self) -> None:
        self._buckets: dict[str, list[float]] = {}

    def check(self, ip: Any, now: float | None = None) -> bool:
        now = time.time() * 1000 if now is None else now
        key = ip if is_truthy(ip) else "unknown"
        hits = [at for at in self._buckets.get(key, []) if now - at < RATE_LIMIT_WINDOW_MS]
        if len(hits) >= RATE_LIMIT_MAX:
            return False
        hits.append(now)
        self._buckets[key] = hits
        return True
