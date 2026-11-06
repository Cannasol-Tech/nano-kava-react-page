"""
file: test/acceptance/support/sol.py
author: Stephen Boyett

description:
    Drives Sol the way a visitor does — launcher, composer, the sample-request card — and judges a
    real model's replies structurally: non-empty, streamed, and free of forbidden claim vocabulary.
    Timeouts are generous because every reply is a live Gemini call through the dev server.
    See test/acceptance/CLAUDE.md § Sol is a live model.

See Also:
    src/components/chat/ChatWidget.jsx
    src/components/chat/lead/LeadCard.jsx
    functions/CLAUDE.md

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import re
import time
import uuid
from dataclasses import dataclass

from playwright.sync_api import Locator, Page, expect

from support.site import is_shown

REPLY_TIMEOUT_S = 60
SETTLE_POLLS = 4
POLL_S = 0.5
CARD_TIMEOUT_MS = 60_000
GREETING_BUBBLE_TEXT = "questions on specs or samples"
#: Past the 3.8s load-sequence greeting (src/utils/loadSequence.js) with margin for a cold dev server.
GREETING_SETTLE_MS = 6_000
OFFLINE_MARKER = "can't reach my knowledge base"
DIALOG_NAME = "Chat with Sol, the Cannasol nano kava assistant"
CARD_NAME = "Confirm your details before sending"

# Records the last new model bubble's length on every DOM change, so a streamed reply is observable.
_STREAM_PROBE = """(before) => {
  window.__solStream = [];
  const root = document.querySelector('[role="dialog"]');
  const record = () => {
    const bubbles = root.querySelectorAll('.sol-bubble--model');
    if (bubbles.length > before) window.__solStream.push(bubbles[bubbles.length - 1].textContent.length);
  };
  window.__solStreamObserver?.disconnect();
  window.__solStreamObserver = new MutationObserver(record);
  window.__solStreamObserver.observe(root, { subtree: true, childList: true, characterData: true });
}"""


class ClaimVocabulary:
    """The efficacy claims Sol may never make, matched only where a sentence asserts them."""

    FORBIDDEN = re.compile(
        r"\b(reduces? (stress|anxiety)|treats|cures?|improves? (focus|sleep|mood)"
        r"|helps? (with )?(sleep|anxiety|stress)|relieves?)\b",
        re.I,
    )
    NEGATED = re.compile(r"\b(not|no|never|cannot|unable|avoid|rather than)\b|n't\b", re.I)
    DECLINED = re.compile(
        r"can't|cannot|can not|not able|unable|won't|not (in a position|something I)|doctor|physician"
        r"|healthcare|medical (advice|professional)|personal (dosing|advice|consumption|use)|consult",
        re.I,
    )

    @classmethod
    def claims_in(cls, text: str) -> list[str]:
        sentences = re.split(r"(?<=[.!?])\s+", text)
        return [s for s in sentences if cls.FORBIDDEN.search(s) and not cls.NEGATED.search(s)]

    @classmethod
    def declines(cls, text: str) -> bool:
        return bool(cls.DECLINED.search(text))


@dataclass(frozen=True)
class SolReply:
    """One finished model turn as the transcript showed it, plus how its length grew."""

    text: str
    observed_lengths: tuple[int, ...]

    @property
    def streamed(self) -> bool:
        """Two or more distinct partial lengths before the final text means it arrived in pieces."""
        partial = {n for n in self.observed_lengths if 0 < n}
        return len(partial) >= 2

    @property
    def is_offline(self) -> bool:
        return OFFLINE_MARKER in self.text


@dataclass(frozen=True)
class Visitor:
    """A unique prospect per scenario, because the lead queue keys one person on their email."""

    first_name: str
    last_name: str
    company: str
    email: str
    phone: str

    @classmethod
    def unique(cls) -> "Visitor":
        tag = uuid.uuid4().hex[:8]
        return cls("Dana", "Reyes", "Brightwater Beverages", f"dana.reyes+{tag}@example.com", "(555) 010-4477")

    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def sample_request(self) -> str:
        return (
            f"Hi, I'm {self.name} from {self.company}. We're formulating a kava seltzer. Please send us a "
            f"free Nano Kava sample — my email is {self.email}. Please put the sample request together now."
        )


class LeadCardForm:
    """The editable sample-request card Sol proposes and only the visitor can send."""

    def __init__(self, card: Locator) -> None:
        self.card = card

    @property
    def name(self) -> Locator:
        return self.card.get_by_label("Name", exact=True)

    @property
    def email(self) -> Locator:
        return self.card.get_by_label("Email", exact=True)

    @property
    def phone(self) -> Locator:
        return self.card.get_by_label(re.compile(r"^Phone"))

    @property
    def company(self) -> Locator:
        return self.card.get_by_label(re.compile(r"^Company"))

    @property
    def send_button(self) -> Locator:
        return self.card.get_by_role("button", name=re.compile(r"^Send\b"))

    @property
    def confirm_button(self) -> Locator:
        return self.card.get_by_role("button", name=re.compile(r"^Confirm"))

    def ensure_a_sample_line(self) -> None:
        """Send also needs one sample pill; select Nano Kava if the model preselected none."""
        if self.card.locator('button[aria-pressed="true"]').count() == 0:
            self.card.get_by_role("button", name="Nano Kava", exact=True).click()

    def remove_contact_methods(self) -> None:
        self.phone.fill("")
        self.email.fill("")

    def send(self) -> None:
        """Send, then Confirm & send — the card's two-click gate."""
        self.send_button.click()
        self.confirm_button.click()


class SolWidget:
    """The launcher, the panel and its transcript on one page."""

    def __init__(self, page: Page) -> None:
        self.page = page

    @property
    def launcher(self) -> Locator:
        return self.page.get_by_role("button", name="Chat with Sol", exact=True)

    @property
    def dialog(self) -> Locator:
        return self.page.get_by_role("dialog", name=DIALOG_NAME)

    @property
    def model_bubbles(self) -> Locator:
        return self.dialog.locator(".sol-bubble--model")

    @property
    def greeting_bubble(self) -> Locator:
        return self.page.get_by_role("status").filter(has_text=GREETING_BUBBLE_TEXT)

    @property
    def sent_confirmation(self) -> Locator:
        return self.dialog.get_by_text("Sent", exact=True)

    def latest_card(self) -> LeadCardForm:
        return LeadCardForm(self.dialog.get_by_role("group", name=CARD_NAME).last)

    def open_from_launcher(self) -> None:
        """Close the panel if Sol opened himself on arrival, then open it from the launcher."""
        self.dismiss_greeting()
        self.launcher.click()
        expect(self.dialog).to_be_visible()

    def dismiss_greeting(self, settle_ms: int = 5_000) -> None:
        """Close Sol's self-opened desktop panel; closing writes sol:dismissed, so it stays shut."""
        remaining = max(0, settle_ms - int(self.page.evaluate("performance.now()")))
        if remaining:
            self._opened_within(remaining)
        if self.dialog.is_visible():
            self.dialog.get_by_role("button", name="Close chat").click()
            expect(self.launcher).to_have_attribute("aria-expanded", "false")

    def greeting(self) -> str:
        first = self.model_bubbles.first
        expect(first).not_to_be_empty()
        return first.inner_text().strip()

    def ask(self, question: str) -> SolReply:
        before = self.model_bubbles.count()
        self.page.evaluate(_STREAM_PROBE, before)
        self.dialog.get_by_role("textbox", name="Message Sol").fill(question)
        self.dialog.get_by_role("button", name="Send message").click()
        text = self._settled_text(before)
        return SolReply(text, tuple(self.page.evaluate("window.__solStream || []")))

    def request_sample(self, visitor: Visitor) -> LeadCardForm:
        """Ask for a sample; one plain nudge if Sol answers with a question instead of the card."""
        card = self.dialog.get_by_role("group", name=CARD_NAME)
        reply = self.ask(visitor.sample_request())
        assert not reply.is_offline, f"Sol could not reach the model: {reply.text}"
        if not is_shown(card.last, 5_000):
            self.ask("Yes — that's all the detail I have. Please prepare the sample request card now.")
        expect(card.last).to_be_visible(timeout=CARD_TIMEOUT_MS)
        return self.latest_card()

    def _settled_text(self, before: int) -> str:
        """The new model bubble's text once it is non-empty and unchanged for a few polls."""
        deadline = time.monotonic() + REPLY_TIMEOUT_S
        last, steady = "", 0
        while time.monotonic() < deadline:
            text = self._bubble_text(before)
            steady = steady + 1 if text and text == last else 0
            if steady >= SETTLE_POLLS:
                return text
            last = text
            time.sleep(POLL_S)
        raise AssertionError(f"Sol's reply did not settle within {REPLY_TIMEOUT_S}s (last seen: {last!r})")

    def _bubble_text(self, index: int) -> str:
        bubbles = self.model_bubbles
        return bubbles.nth(index).inner_text().strip() if bubbles.count() > index else ""

    def _opened_within(self, timeout_ms: int) -> bool:
        return is_shown(self.dialog, timeout_ms)
