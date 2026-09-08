"""
file: docs/python-reference/tests/test_chat_store.py
author: Stephen Boyett

description:
    Mirror of functions/test/chatStore.test.js. Test names match the JavaScript `it(...)` strings
    so the two suites can be read side by side; if a case here has no twin over there, that is a
    bug in this file rather than extra coverage.

See Also:
    functions/test/chatStore.test.js
    docs/python-reference/nano_kava/chat_store.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timezone

import pytest

from nano_kava.chat_store import (
    COLLECTION,
    MAX_TURNS,
    MAX_TURN_CHARS,
    RETENTION_DAYS,
    StoredSession,
    Turn,
    cap_turns,
    create_transcript_recorder,
    expires_at_from,
    is_valid_session_id,
    persist_transcript,
)


def turn(i: int) -> Turn:
    return Turn(role="user" if i % 2 == 0 else "model", text=f"turn {i}")


def conversation(n: int) -> list[Turn]:
    return [turn(i) for i in range(n)]


class FakeDb:
    """In-memory stand-in for Firestore; enough surface for a read-modify-write transaction."""

    def __init__(self, seed: dict[str, StoredSession] | None = None) -> None:
        self.docs: dict[str, StoredSession] = dict(seed or {})

    def run_transaction(self, fn):
        outer = self

        class Tx:
            def get(self, path):
                return outer.docs.get(path)

            def set(self, path, document):
                outer.docs[path] = document

        return fn(Tx())


class FailingDb:
    def run_transaction(self, fn):
        raise RuntimeError("PERMISSION_DENIED")


def stored(db: FakeDb, session_id: str) -> StoredSession:
    return db.docs[f"{COLLECTION}/{session_id}"]


UTC = timezone.utc


class TestCapTurns:
    def test_keeps_a_conversation_that_fits_untouched(self):
        kept = cap_turns(conversation(4))
        assert len(kept) == 4
        assert kept[0] == Turn(role="user", text="turn 0")

    def test_caps_a_long_conversation_keeping_the_most_recent(self):
        kept = cap_turns(conversation(MAX_TURNS + 25))
        assert len(kept) == MAX_TURNS
        assert kept[-1].text == f"turn {MAX_TURNS + 24}"
        assert kept[0].text == "turn 25"

    def test_caps_at_exactly_30(self):
        assert MAX_TURNS == 30

    def test_drops_entries_that_are_not_usable_turns(self):
        kept = cap_turns([
            Turn("user", "real"),
            Turn("user", "   "),
            Turn("nonsense", "wrong role"),
            Turn("model", 42),
            None,
            Turn("model", "also real"),
        ])
        assert kept == [Turn("user", "real"), Turn("model", "also real")]

    def test_clips_a_single_oversized_turn(self):
        (only,) = cap_turns([Turn("user", "x" * (MAX_TURN_CHARS + 500))])
        assert len(only.text) == MAX_TURN_CHARS

    def test_survives_a_non_array(self):
        assert cap_turns(None) == []
        assert cap_turns("nope") == []


class TestExpiresAtFrom:
    def test_is_90_days_after_creation(self):
        assert RETENTION_DAYS == 90
        created = datetime(2026, 1, 1, tzinfo=UTC)
        assert expires_at_from(created) == datetime(2026, 4, 1, tzinfo=UTC)


class TestIsValidSessionId:
    def test_accepts_an_opaque_url_safe_id(self):
        assert is_valid_session_id("7f3a9c21-4b1e-4a77-9d0c-2b8e5f6a1d34")
        assert is_valid_session_id("AbC_123-xyz789")

    @pytest.mark.parametrize(
        "bad",
        ["short", "has/slash/inside", "has spaces here", "..", "a" * 200, "", None, 123456789,
         "abcdefgh\n"],
    )
    def test_rejects_anything_that_could_steer_a_document_path(self, bad):
        assert is_valid_session_id(bad) is False


class TestFirstWrite:
    NOW = datetime(2026, 2, 1, 12, 0, tzinfo=UTC)

    def test_stores_the_whole_opening_history_plus_the_reply(self):
        db = FakeDb()
        persist_transcript(
            db=db,
            session_id="session-aaaaaaaa",
            history=[Turn("model", "greeting"), Turn("user", "hi")],
            reply="hello back",
            page="/mushrooms",
            now=self.NOW,
        )
        doc = stored(db, "session-aaaaaaaa")
        assert doc.messages == [
            Turn("model", "greeting"),
            Turn("user", "hi"),
            Turn("model", "hello back"),
        ]
        assert doc.session_id == "session-aaaaaaaa"
        assert doc.page == "/mushrooms"
        assert doc.turn_count == 3

    def test_stamps_created_updated_and_the_90_day_expiry(self):
        db = FakeDb()
        persist_transcript(db=db, session_id="session-bbbbbbbb",
                           history=[Turn("user", "hi")], reply="yo", now=self.NOW)
        doc = stored(db, "session-bbbbbbbb")
        assert doc.created_at == self.NOW
        assert doc.updated_at == self.NOW
        assert doc.expires_at == datetime(2026, 5, 2, 12, 0, tzinfo=UTC)

    def test_caps_the_opening_write_too(self):
        db = FakeDb()
        persist_transcript(db=db, session_id="session-cccccccc",
                           history=conversation(60), reply="ok", now=self.NOW)
        doc = stored(db, "session-cccccccc")
        assert len(doc.messages) == MAX_TURNS
        assert doc.messages[-1] == Turn("model", "ok")

    def test_refuses_a_malformed_session_id(self):
        db = FakeDb()
        result = persist_transcript(db=db, session_id="../../admin",
                                    history=[Turn("user", "hi")], reply="yo", now=self.NOW)
        assert result.ok is False
        assert db.docs == {}

    def test_writes_nothing_with_no_reply_and_no_history(self):
        db = FakeDb()
        result = persist_transcript(db=db, session_id="session-dddddddd",
                                    history=[], reply="", now=self.NOW)
        assert result.ok is False
        assert db.docs == {}


class TestSubsequentWrites:
    CREATED = datetime(2026, 2, 1, 12, 0, tzinfo=UTC)
    LATER = datetime(2026, 2, 1, 12, 5, tzinfo=UTC)

    def seeded(self, messages, **extra):
        doc = StoredSession(
            session_id="session-eeeeeeee",
            messages=list(messages),
            turn_count=len(messages),
            page="/",
            created_at=self.CREATED,
            updated_at=self.CREATED,
            expires_at=expires_at_from(self.CREATED),
        )
        return FakeDb({f"{COLLECTION}/session-eeeeeeee": replace(doc, **extra)})

    def test_appends_only_the_new_exchange(self):
        base = [Turn("model", "greeting"), Turn("user", "hi"), Turn("model", "hello back")]
        db = self.seeded(base)
        persist_transcript(db=db, session_id="session-eeeeeeee",
                           history=[*base, Turn("user", "second question")],
                           reply="second answer", now=self.LATER)
        assert stored(db, "session-eeeeeeee").messages == [
            *base, Turn("user", "second question"), Turn("model", "second answer"),
        ]

    def test_drops_the_oldest_turns_once_at_the_cap(self):
        db = self.seeded(conversation(MAX_TURNS))
        persist_transcript(db=db, session_id="session-eeeeeeee",
                           history=[*conversation(MAX_TURNS), Turn("user", "newest question")],
                           reply="newest answer", now=self.LATER)
        doc = stored(db, "session-eeeeeeee")
        assert len(doc.messages) == MAX_TURNS
        assert doc.messages[-2] == Turn("user", "newest question")
        assert doc.messages[-1] == Turn("model", "newest answer")
        assert not any(m.text == "turn 0" for m in doc.messages)

    def test_counts_every_turn_the_chat_ever_had(self):
        db = self.seeded(conversation(MAX_TURNS), turn_count=44)
        persist_transcript(db=db, session_id="session-eeeeeeee",
                           history=[*conversation(MAX_TURNS), Turn("user", "q")],
                           reply="a", now=self.LATER)
        assert stored(db, "session-eeeeeeee").turn_count == 46

    def test_leaves_created_at_and_expires_at_alone(self):
        db = self.seeded([Turn("user", "hi")])
        persist_transcript(db=db, session_id="session-eeeeeeee",
                           history=[Turn("user", "hi"), Turn("user", "again")],
                           reply="sure", now=self.LATER)
        doc = stored(db, "session-eeeeeeee")
        assert doc.created_at == self.CREATED
        assert doc.expires_at == expires_at_from(self.CREATED)
        assert doc.updated_at == self.LATER


class TestFailure:
    def test_reports_failure_without_raising(self, caplog):
        result = persist_transcript(db=FailingDb(), session_id="session-ffffffff",
                                    history=[Turn("user", "hi")], reply="yo")
        assert result.ok is False
        assert result.reason == "write-failed"


class TestTranscriptRecorder:
    def test_passes_every_frame_through_untouched(self):
        seen = []
        recorder = create_transcript_recorder(seen.append)
        frames = [
            {"type": "text", "delta": "Nano kava "},
            {"type": "lead_proposed", "fields": {"interest": "seltzer"}},
            {"type": "done", "usage": {"totalTokenCount": 12}},
        ]
        for f in frames:
            recorder.emit(f)
        assert seen == frames

    def test_accumulates_only_the_spoken_text_in_order(self):
        recorder = create_transcript_recorder()
        for f in [
            {"type": "text", "delta": "Nano kava "},
            {"type": "tool", "name": "show_nano_explainer", "status": "requested"},
            {"type": "text", "delta": "sits around 18nm."},
            {"type": "done"},
        ]:
            recorder.emit(f)
        assert recorder.reply() == "Nano kava sits around 18nm."

    def test_reports_an_empty_reply_for_a_tools_only_turn(self):
        recorder = create_transcript_recorder()
        recorder.emit({"type": "sample_quiz"})
        assert recorder.reply() == ""

    def test_works_with_no_downstream_sink(self):
        recorder = create_transcript_recorder()
        recorder.emit({"type": "text", "delta": "hi"})
        assert recorder.reply() == "hi"


class TestSessionIdAbsence:
    def test_skips_quietly_when_a_client_sent_none(self):
        db = FakeDb()
        result = persist_transcript(db=db, session_id=None,
                                    history=[Turn("user", "hi")], reply="yo")
        assert result.ok is False and result.reason == "no-session-id"
        assert db.docs == {}


class TestIncompleteExistingDocument:
    NOW = datetime(2026, 3, 1, tzinfo=UTC)

    def test_never_writes_an_undefined_field_forward(self):
        db = FakeDb({
            f"{COLLECTION}/session-77777777": StoredSession(
                session_id="session-77777777", messages=[Turn("user", "hi")]
            )
        })
        result = persist_transcript(db=db, session_id="session-77777777",
                                    history=[Turn("user", "hi"), Turn("user", "more")],
                                    reply="sure", page="/faq", now=self.NOW)
        assert result.ok is True
        doc = stored(db, "session-77777777")
        assert [k for k, v in vars(doc).items() if v is None] == []

    def test_back_fills_the_retention_stamps(self):
        db = FakeDb({
            f"{COLLECTION}/session-66666666": StoredSession(
                session_id="session-66666666", messages=[Turn("user", "hi")]
            )
        })
        persist_transcript(db=db, session_id="session-66666666",
                           history=[Turn("user", "hi")], reply="sure", now=self.NOW)
        doc = stored(db, "session-66666666")
        assert doc.created_at == self.NOW
        assert doc.expires_at == datetime(2026, 5, 30, tzinfo=UTC)
