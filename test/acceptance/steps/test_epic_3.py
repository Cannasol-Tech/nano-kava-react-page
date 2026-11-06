"""
file: test/acceptance/steps/test_epic_3.py
author: Stephen Boyett

description:
    Steps for features/epic-3-contact-form.feature (F-003, Contact form) that no other feature
    uses: the empty submission and the submission missing only its message. Whether anything was
    posted is read off the browser's own network traffic via the context's ProductionGuard.

See Also:
    test/acceptance/features/epic-3-contact-form.feature
    test/acceptance/support/contact.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

from playwright.sync_api import expect
from pytest_bdd import scenarios, then, when

from common import *  # noqa: F403 — shared steps register only when imported into the test module
from support.journey import Journey

scenarios("epic-3-contact-form.feature")

#: Long enough for a submission the form wrongly lets through to reach the guard.
SUBMIT_SETTLE_MS = 3_000


@when("the visitor submits the contact form empty")
def submit_empty(journey: Journey) -> None:
    journey.contact_form.submit()


@then("the form names the Name and Email fields as needing attention")
def name_and_email_flagged(journey: Journey) -> None:
    form = journey.contact_form
    expect(form.error("Name is required")).to_be_visible()
    expect(form.error("Email is required")).to_be_visible()
    expect(form.name).to_have_attribute("aria-invalid", "true")
    expect(form.email).to_have_attribute("aria-invalid", "true")


@when("the visitor submits the contact form with everything but a message")
def submit_without_message(journey: Journey) -> None:
    form = journey.contact_form
    form.name.fill(journey.visitor.name)
    form.email.fill(journey.visitor.email)
    form.choose_inquiry("Request Samples")
    form.submit()
    journey.page.wait_for_timeout(SUBMIT_SETTLE_MS)


@then("the form names the Message field as needing attention")
def message_flagged(journey: Journey) -> None:
    expect(journey.contact_form.message).to_have_attribute("aria-invalid", "true", timeout=3_000)
