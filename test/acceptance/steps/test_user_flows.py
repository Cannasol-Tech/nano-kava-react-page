"""
file: test/acceptance/steps/test_user_flows.py
author: Stephen Boyett

description:
    Steps for features/user_flows.feature that only the journeys use: sending the card for real,
    the phone visitor tapping the greeting bubble, and a lead submitted through Sol rather than the
    form so UF-03 reviews a Sol conversation. Everything else is shared from common.py.

See Also:
    test/acceptance/features/user_flows.feature
    _bmad-output/planning-artifacts/user-flows/user-flows.md

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import re

from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from common import *  # noqa: F403 — shared steps register only when imported into the test module
from support.journey import Journey
from support.review import SAMPLE_REVIEW
from support.site import scroll_down
from support.sol import GREETING_BUBBLE_TEXT, GREETING_SETTLE_MS

scenarios("user_flows.feature")

PAST_THE_HERO_PX = 600


@then("Sol's launcher is visible")
def launcher_visible(journey: Journey) -> None:
    expect(journey.sol.launcher).to_be_visible()


@when("the visitor adds a phone number and sends the card")
def add_phone_and_send(journey: Journey) -> None:
    journey.card.phone.fill(journey.visitor.phone)
    journey.card.ensure_a_sample_line()
    journey.card.send()


@when("the visitor adds only a phone number and sends the card")
def add_only_phone_and_send(journey: Journey) -> None:
    journey.card.phone.fill(journey.visitor.phone)
    journey.card.send()


@then("the card confirms it was sent")
def card_sent(journey: Journey) -> None:
    expect(journey.sol.sent_confirmation).to_be_visible(timeout=SENT_TIMEOUT_MS)  # noqa: F405 — from common


@when("the visitor waits past Sol's greeting and scrolls past the hero")
def wait_and_scroll_past_hero(journey: Journey) -> None:
    journey.page.wait_for_timeout(GREETING_SETTLE_MS)
    scroll_down(journey.page, to_px=PAST_THE_HERO_PX)


@then("Sol offers a greeting bubble instead")
def greeting_bubble(journey: Journey) -> None:
    expect(journey.sol.greeting_bubble).to_be_visible()


@when("the visitor taps the greeting bubble")
def tap_greeting_bubble(journey: Journey) -> None:
    journey.sol.greeting_bubble.get_by_role("button", name=re.compile(GREETING_BUBBLE_TEXT)).tap()


@given("a prospect has sent a sample request through Sol")
def sent_through_sol(journey: Journey) -> None:
    card_shown(journey)  # noqa: F405 — from common
    journey.mark_dev_log()
    add_phone_and_send(journey)
    card_sent(journey)
    journey.capture_review_link()


@given("the reviewer has already filed a review")
def review_already_filed(journey: Journey) -> None:
    open_review_link(journey)  # noqa: F405 — from common
    journey.review_form.file(SAMPLE_REVIEW)
    journey.filed_review = SAMPLE_REVIEW
    expect(journey.review_form.saved_heading).to_be_visible()
