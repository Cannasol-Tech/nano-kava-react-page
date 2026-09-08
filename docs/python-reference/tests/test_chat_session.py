"""
file: docs/python-reference/tests/test_chat_session.py
author: Stephen Boyett

description:
    Mirror of src/test/chatSession.test.js. The throwing storage stands in for Safari private
    mode, and the cross-check against the server's own validator is the same guard the JavaScript
    test makes — here it is a direct import rather than a reach across the repo.

See Also:
    src/test/chatSession.test.js

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from nano_kava.chat_session import SESSION_KEY, ChatSession
from nano_kava.chat_store import is_valid_session_id


class MemoryStorage:
    def __init__(self, seed=None):
        self.store = dict(seed or {})

    def get_item(self, key):
        return self.store.get(key)

    def set_item(self, key, value):
        self.store[key] = value


class ThrowingStorage:
    """Safari private mode raises on access rather than returning null."""

    def get_item(self, key):
        raise RuntimeError("private mode")

    def set_item(self, key, value):
        raise RuntimeError("private mode")


class TestChatSessionId:
    def test_mints_an_id_the_server_will_accept(self):
        assert is_valid_session_id(ChatSession(MemoryStorage()).session_id())

    def test_returns_the_same_id_for_every_turn(self):
        session = ChatSession(MemoryStorage())
        assert session.session_id() == session.session_id()

    def test_persists_it_so_a_remounted_panel_keeps_the_same_transcript(self):
        storage = MemoryStorage()
        session = ChatSession(storage)
        first = session.session_id()
        session.reset()
        assert session.session_id() == first
        assert storage.store[SESSION_KEY] == first

    def test_replaces_a_stored_value_the_server_would_reject(self):
        storage = MemoryStorage({SESSION_KEY: "../../admin"})
        minted = ChatSession(storage).session_id()
        assert minted != "../../admin"
        assert is_valid_session_id(minted)

    def test_still_returns_a_usable_stable_id_when_storage_throws(self):
        session = ChatSession(ThrowingStorage())
        minted = session.session_id()
        assert is_valid_session_id(minted)
        assert session.session_id() == minted

    def test_mints_a_distinct_id_per_visitor(self):
        assert ChatSession(MemoryStorage()).session_id() != ChatSession(MemoryStorage()).session_id()

    def test_the_fallback_mint_is_also_valid(self):
        session = ChatSession(MemoryStorage())
        assert is_valid_session_id(session._mint())
