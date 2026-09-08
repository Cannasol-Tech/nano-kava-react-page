"""
file: docs/python-reference/tests/test_digest.py
author: Stephen Boyett

description:
    Mirror of the validation and escaping halves of functions/test/digest.test.js. This endpoint
    mails visitor-authored text to the team, so its caps and its escaping ARE the security
    surface — which is why they are the part worth replicating.

See Also:
    functions/test/digest.test.js
    functions/lib/CLAUDE.md

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from nano_kava.digest import (
    FOUNDER,
    MAX_MESSAGES,
    MAX_MESSAGE_CHARS,
    MIN_MESSAGES,
    RATE_LIMIT_MAX,
    REVIEWER,
    DigestRateLimiter,
    escape_html,
    recipients_for,
    summarise_digest,
    validate_digest,
)


def chat(n=4):
    return [{"role": "user" if i % 2 == 0 else "model", "text": f"turn {i}"} for i in range(n)]


class TestVolumeControl:
    def test_accepts_a_real_conversation(self):
        result = validate_digest({"messages": chat(4)})
        assert result.ok is True
        assert len(result.digest.messages) == 4

    def test_drops_a_conversation_nobody_actually_had(self):
        assert validate_digest({"messages": chat(1)}).ok is False
        assert validate_digest({"messages": []}).ok is False
        assert validate_digest({}).ok is False
        assert validate_digest({"messages": "nope"}).ok is False

    def test_requires_at_least_one_visitor_turn(self):
        greeting_only = [{"role": "model", "text": "hi"}, {"role": "model", "text": "still here"}]
        assert validate_digest({"messages": greeting_only}).ok is False

    def test_keeps_the_most_recent_turns_when_a_transcript_runs_long(self):
        result = validate_digest({"messages": chat(MAX_MESSAGES + 20)})
        assert len(result.digest.messages) == MAX_MESSAGES
        assert result.digest.messages[-1].text == f"turn {MAX_MESSAGES + 19}"

    def test_clips_an_oversized_message(self):
        long = [{"role": "user", "text": "x" * (MAX_MESSAGE_CHARS + 400)},
                {"role": "model", "text": "ok"}]
        assert len(validate_digest({"messages": long}).digest.messages[0].text) == MAX_MESSAGE_CHARS

    def test_drops_unknown_roles_and_blank_turns(self):
        mixed = [{"role": "user", "text": "real"}, {"role": "hacker", "text": "nope"},
                 {"role": "model", "text": "   "}, {"role": "lead", "text": "card"}]
        kept = validate_digest({"messages": mixed}).digest.messages
        assert [m.role for m in kept] == ["user", "lead"]


class TestRecipients:
    def test_a_timed_out_chat_is_review_material_only(self):
        assert recipients_for(False, False) == [REVIEWER]

    def test_a_submitted_lead_or_explicit_consent_earns_the_founder(self):
        assert recipients_for(True, False) == [REVIEWER, FOUNDER]
        assert recipients_for(False, True) == [REVIEWER, FOUNDER]


class TestEscaping:
    def test_nothing_hostile_survives_into_the_html_body(self):
        assert escape_html("<script>alert(1)</script>") == (
            "&lt;script&gt;alert(1)&lt;/script&gt;"
        )

    def test_ordinary_input_is_unchanged_for_a_human_reader(self):
        assert escape_html("O'Brien") == "O&#39;Brien"

    def test_a_missing_value_escapes_to_a_blank_not_the_word_none(self):
        assert escape_html(None) == ""


class TestNormalisation:
    def test_reason_falls_back_to_closed_for_anything_unrecognised(self):
        assert validate_digest({"messages": chat(), "reason": "timeout"}).digest.reason == "timeout"
        assert validate_digest({"messages": chat(), "reason": "hacked"}).digest.reason == "closed"

    def test_contact_keeps_only_known_keys_clipped_and_non_blank(self):
        payload = {"messages": chat(),
                   "contact": {"email": " a@b.co ", "company": "", "evil": "x", "name": "y" * 400}}
        contact = validate_digest(payload).digest.contact
        assert contact["email"] == "a@b.co"
        assert "company" not in contact and "evil" not in contact
        assert len(contact["name"]) == 200

    def test_summarise_reports_counts_without_leaking_message_text(self):
        counts = summarise_digest({"messages": chat(4), "page": "/faq"})
        assert (counts.received, counts.visitor_turns, counts.page) == (4, 2, "/faq")


class TestRateLimit:
    def test_allows_the_cap_then_refuses(self):
        limiter = DigestRateLimiter()
        assert all(limiter.check("1.2.3.4", now=0) for _ in range(RATE_LIMIT_MAX))
        assert limiter.check("1.2.3.4", now=0) is False
