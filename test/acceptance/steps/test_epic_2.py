"""
file: test/acceptance/steps/test_epic_2.py
author: Stephen Boyett

description:
    Steps for features/epic-2-sol.feature (F-002, Sol the sales concierge) that no other feature
    uses: editing every field of the sample card, the phone-only contact rule, and a phone visitor
    scrolling deep enough to cross every proactive trigger without the panel opening.

See Also:
    test/acceptance/features/epic-2-sol.feature
    test/acceptance/support/sol.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

from playwright.sync_api import expect
from pytest_bdd import scenarios, then, when

from common import *  # noqa: F403 — shared steps register only when imported into the test module
from support.journey import Journey
from support.site import scroll_down
from support.sol import GREETING_SETTLE_MS

scenarios("epic-2-sol.feature")

#: Past the 40% scroll-depth pop-in trigger, so the phone rule is tested against it too.
DEEP_SCROLL_FRACTION = 0.5
EDITS = {"name": "Dana R. Reyes", "phone": "(555) 010-9988", "email": "dana.edit@example.com", "company": "Brightwater Co"}


@then("every field on the card can be edited")
def card_fields_editable(journey: Journey) -> None:
    card = journey.card
    for field_name, value in EDITS.items():
        field = getattr(card, field_name)
        field.fill(value)
        expect(field).to_have_value(value)


@when("the visitor adds only a phone number")
def add_only_phone(journey: Journey) -> None:
    journey.card.phone.fill(journey.visitor.phone)


@then("the card can be sent")
def card_sendable(journey: Journey) -> None:
    expect(journey.card.send_button).to_be_enabled()


@when("the visitor waits past Sol's greeting and scrolls down the page")
def wait_and_scroll_deep(journey: Journey) -> None:
    journey.page.wait_for_timeout(GREETING_SETTLE_MS)
    scroll_down(journey.page, to_fraction=DEEP_SCROLL_FRACTION)
    journey.page.wait_for_timeout(2_000)


@when("the visitor taps Sol's launcher")
def tap_launcher(journey: Journey) -> None:
    journey.sol.launcher.tap()
