"""
file: test/acceptance/steps/test_epic_4.py
author: Stephen Boyett

description:
    Steps for features/epic-4-lead-review-loop.feature (F-004) that no other feature uses. FR-0401
    is provable only against the deployed functions with real email, so it runs
    test/e2e/review-loop.mjs under DEPLOYED_E2E=1 and is otherwise skipped with that reason.

See Also:
    test/acceptance/features/epic-4-lead-review-loop.feature
    test/e2e/review-loop.mjs

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import subprocess

import pytest
from playwright.sync_api import expect
from pytest_bdd import given, parsers, scenarios, then, when

from common import *  # noqa: F403 — shared steps register only when imported into the test module
from support.environment import REPO_ROOT
from support.journey import Journey
from support.review import SCALES

scenarios("epic-4-lead-review-loop.feature")

REVIEW_LOOP_SCRIPT = "test/e2e/review-loop.mjs"
REVIEW_LOOP_TIMEOUT_S = 45 * 60
DEPLOYED_ONLY = (
    "FR-0401 needs the DEPLOYED functions and real email: one lead email after the 20-minute quiet "
    "period (~25 min). It emails the sales team, so it runs only with DEPLOYED_E2E=1."
)


@given("the deployed functions and real email are available")
def deployed_available(journey: Journey) -> None:
    if not journey.targets.deployed_e2e:
        pytest.skip(DEPLOYED_ONLY)


@when("one person sends a Sol sample card and a contact form to the deployed functions")
def run_review_loop(journey: Journey) -> None:
    journey.deployed_run = subprocess.run(
        ["node", REVIEW_LOOP_SCRIPT], cwd=REPO_ROOT, capture_output=True, text=True,
        timeout=REVIEW_LOOP_TIMEOUT_S, check=False,
    )


@then("the sales team receives one lead email carrying every conversation after the quiet period")
def one_lead_email(journey: Journey) -> None:
    run = journey.deployed_run
    assert run.returncode == 0, f"{REVIEW_LOOP_SCRIPT} failed:\n{run.stdout[-3000:]}\n{run.stderr[-2000:]}"


@then("no score has been saved")
def nothing_saved(journey: Journey) -> None:
    form = journey.review_form
    for label in SCALES:
        expect(form.checked_scores(label)).to_have_count(0)


@when(parsers.parse("the reviewer changes the overall score to {score:d} and submits again"))
def change_overall(journey: Journey, score: int) -> None:
    form = journey.review_form
    form.choose("Overall", score)
    form.submit()
    expect(form.saved_heading).to_be_visible()


@then(parsers.parse("reopening the review link shows an overall score of {score:d}"))
def reopened_shows(journey: Journey, score: int) -> None:
    open_review_link(journey)  # noqa: F405 — from common
    expect(journey.review_form.score("Overall", score)).to_be_checked()
