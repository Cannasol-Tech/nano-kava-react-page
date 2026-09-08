"""
file: docs/python-reference/tests/test_chat_request.py
author: Stephen Boyett

description:
    Mirror of functions/test/chatRequest.test.js, plus the rate-limiter cases the JavaScript
    covers only indirectly. Pins the asymmetry that matters: persistence fields degrade to blank,
    message guards reject.

See Also:
    functions/test/chatRequest.test.js

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

import pytest

from nano_kava.chat_request import (
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
    Message,
    RateLimiter,
    validate_chat_request,
)


def body(**extra):
    return {"messages": [{"role": "user", "text": "hi"}], **extra}


class TestSessionId:
    def test_passes_a_well_formed_session_id_through(self):
        result = validate_chat_request(body(sessionId="7f3a9c21-4b1e-4a77-9d0c-2b8e5f6a1d34"))
        assert result.ok is True
        assert result.session_id == "7f3a9c21-4b1e-4a77-9d0c-2b8e5f6a1d34"

    def test_still_answers_a_client_that_sends_none(self):
        result = validate_chat_request(body())
        assert result.ok is True
        assert result.session_id is None

    @pytest.mark.parametrize("bad", ["../../admin", "short", "x" * 200, 42, {}])
    def test_drops_a_malformed_session_id_instead_of_rejecting(self, bad):
        result = validate_chat_request(body(sessionId=bad))
        assert result.ok is True
        assert result.session_id is None

    def test_passes_the_originating_page_through_clipped(self):
        assert validate_chat_request(body(page="/mushrooms")).page == "/mushrooms"
        assert len(validate_chat_request(body(page="x" * 500)).page) == 200
        assert validate_chat_request(body()).page == ""


class TestMessageGuards:
    def test_leaves_the_existing_guards_exactly_as_they_were(self):
        assert validate_chat_request({"messages": []}).ok is False
        assert validate_chat_request({"messages": [{"role": "wrong", "text": "x"}]}).ok is False
        assert validate_chat_request({"messages": [{"role": "user", "text": 1}]}).ok is False
        assert validate_chat_request(
            {"messages": [{"role": "user", "text": "x"}] * 40}
        ).ok is False

    def test_rejects_a_payload_over_the_total_character_budget(self):
        big = [{"role": "user", "text": "x" * 2000} for _ in range(7)]
        assert validate_chat_request({"messages": big}).ok is False

    def test_normalises_to_message_objects(self):
        assert validate_chat_request(body()).messages == (Message("user", "hi"),)


class TestRateLimiter:
    def test_allows_up_to_the_cap_then_refuses(self):
        limiter = RateLimiter()
        for _ in range(RATE_LIMIT_MAX):
            assert limiter.check("1.2.3.4", now=0).ok is True
        refused = limiter.check("1.2.3.4", now=0)
        assert refused.ok is False
        assert refused.retry_after == RATE_LIMIT_WINDOW_MS // 1000

    def test_counts_each_ip_separately_and_folds_blanks_into_unknown(self):
        limiter = RateLimiter()
        for _ in range(RATE_LIMIT_MAX):
            limiter.check("1.2.3.4", now=0)
        assert limiter.check("5.6.7.8", now=0).ok is True
        for _ in range(RATE_LIMIT_MAX):
            limiter.check("", now=0)
        assert limiter.check(None, now=0).ok is False  # both collapse to 'unknown'

    def test_forgets_hits_once_the_window_has_passed(self):
        limiter = RateLimiter()
        for _ in range(RATE_LIMIT_MAX):
            limiter.check("1.2.3.4", now=0)
        assert limiter.check("1.2.3.4", now=RATE_LIMIT_WINDOW_MS + 1).ok is True
