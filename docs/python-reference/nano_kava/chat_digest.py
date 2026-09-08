"""
file: docs/python-reference/nano_kava/chat_digest.py
author: Stephen Boyett

description:
    Python replica of src/components/chat/transport/chatDigest.js — the browser half that packs a
    Sol conversation for the team digest. `navigator.sendBeacon` has no Python equivalent and is
    omitted; what is here is the packing and the floor that stops a silent visit from mailing
    anyone.

See Also:
    src/components/chat/transport/chatDigest.js
    docs/python-reference/nano_kava/digest.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .jsisms import falsy_or, is_truthy

MIN_VISITOR_TURNS = 1
IDLE_TIMEOUT_MS = 3 * 60 * 1000

CONTACT_KEYS = ("name", "company", "email", "phone")


@dataclass
class PanelMessage:
    """JS: the in-panel message object. A `lead` carries `fields` instead of `text`."""

    role: str
    text: str = ""
    fields: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class WireMessage:
    role: str
    text: str


@dataclass(frozen=True)
class OutboundDigest:
    messages: tuple[WireMessage, ...]
    contact: dict[str, str]
    page: str
    lead_sent: bool
    share_authorized: bool
    reason: str


def extract_contact(messages: Any) -> dict[str, str]:
    """
    The lead card holds the best contact details we ever see — the model extracted them and the
    visitor may have corrected them — so they are read from the last lead message, sent or not.
    """
    # JS: `[...messages].reverse().find(...)` copies first so the caller's array is untouched.
    # Python's list.reverse() mutates in place; reversed() is the non-destructive spelling.
    lead = next(
        (m for m in reversed(list(messages or [])) if m.role == "lead" and is_truthy(m.fields)),
        None,
    )
    if lead is None:
        return {}

    contact = {}
    for key in CONTACT_KEYS:
        value = lead.fields.get(key)
        if is_truthy(value) and str(value).strip():
            contact[key] = str(value).strip()
    return contact


def _to_wire(message: PanelMessage) -> WireMessage:
    """Lead cards carry fields rather than prose, so they are summarised rather than transcribed."""
    if message.role != "lead":
        return WireMessage(role=message.role, text=falsy_or(message.text, ""))
    fields = message.fields or {}
    interest = falsy_or(fields.get("interest"), "—")
    reason = falsy_or(fields.get("reason"), "—")
    return WireMessage(
        role="lead", text=f"[lead card shown] interest: {interest}; why now: {reason}"
    )


def build_digest(
    messages: Any,
    *,
    page: str = "",
    lead_sent: bool = False,
    share_authorized: bool = False,
    reason: str = "closed",
) -> OutboundDigest | None:
    """Returns None — JS `null` — for a visit that produced no visitor turn."""
    wire = tuple(w for w in (_to_wire(m) for m in (messages or [])) if w.text.strip())
    visitor_turns = sum(1 for m in wire if m.role == "user")
    if visitor_turns < MIN_VISITOR_TURNS:
        return None

    return OutboundDigest(
        messages=wire,
        contact=extract_contact(messages or []),
        page=page,
        lead_sent=lead_sent,
        share_authorized=share_authorized,
        reason=reason,
    )
