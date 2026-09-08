"""
file: docs/python-reference/tests/test_chat_digest.py
author: Stephen Boyett

description:
    Mirror of src/test/chatDigest.test.js — the browser-side packing. The floor is the point: a
    visitor who opened Sol and said nothing must produce no digest at all.

See Also:
    src/test/chatDigest.test.js
    src/components/chat/transport/chatDigest.js

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from nano_kava.chat_digest import PanelMessage, build_digest, extract_contact


class TestBuildDigest:
    def test_a_visit_with_no_visitor_turn_sends_nothing(self):
        assert build_digest([PanelMessage("model", "hi")]) is None
        assert build_digest([]) is None
        assert build_digest(None) is None

    def test_a_real_exchange_is_packed(self):
        digest = build_digest(
            [PanelMessage("model", "hi"), PanelMessage("user", "samples?")], page="/faq"
        )
        assert digest is not None
        assert digest.page == "/faq"
        assert [m.role for m in digest.messages] == ["model", "user"]

    def test_blank_turns_are_dropped(self):
        digest = build_digest(
            [PanelMessage("user", "real"), PanelMessage("model", "   ")]
        )
        assert len(digest.messages) == 1

    def test_a_lead_card_is_summarised_rather_than_transcribed(self):
        digest = build_digest([
            PanelMessage("user", "samples?"),
            PanelMessage("lead", fields={"interest": "seltzer", "reason": "launching Q3"}),
        ])
        assert digest.messages[-1].text == (
            "[lead card shown] interest: seltzer; why now: launching Q3"
        )

    def test_a_lead_card_with_no_fields_still_renders_placeholders(self):
        digest = build_digest([PanelMessage("user", "hi"), PanelMessage("lead", fields={})])
        assert "interest: —; why now: —" in digest.messages[-1].text

    def test_flags_pass_through_untouched(self):
        digest = build_digest([PanelMessage("user", "hi")], lead_sent=True, share_authorized=True)
        assert digest.lead_sent is True and digest.share_authorized is True


class TestExtractContact:
    def test_reads_the_last_lead_card_sent_or_not(self):
        messages = [
            PanelMessage("lead", fields={"email": "old@b.co"}),
            PanelMessage("lead", fields={"email": "new@b.co", "name": " Jo "}),
        ]
        assert extract_contact(messages) == {"name": "Jo", "email": "new@b.co"}

    def test_returns_nothing_when_no_card_ever_appeared(self):
        assert extract_contact([PanelMessage("user", "hi")]) == {}

    def test_does_not_mutate_the_callers_list(self):
        messages = [PanelMessage("user", "hi"), PanelMessage("lead", fields={"email": "a@b.co"})]
        extract_contact(messages)
        assert [m.role for m in messages] == ["user", "lead"]
