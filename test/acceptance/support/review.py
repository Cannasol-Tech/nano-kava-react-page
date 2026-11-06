"""
file: test/acceptance/support/review.py
author: Stephen Boyett

description:
    The /sol-review questionnaire a lead email links to: four 1-5 scales, two flag checkboxes, one
    free-text box, and the Saved page. Its radios and checkboxes are visually hidden behind styled
    pills, so a choice is made by clicking the pill's label, exactly as a reviewer taps it.

See Also:
    functions/lib/reviewForm.js
    functions/lib/solReviews.js

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

from dataclasses import dataclass

from playwright.sync_api import Locator, Page

SCALES = ("Overall", "Knowledge", "Tone", "Handoff")
COMMENT_BOX = "What should Sol have said or done instead?"
NOT_SAVED_YET = "It is not saved until you press Save."


@dataclass(frozen=True)
class FiledReview:
    """The answers one reviewer files, kept so a reopened link can be checked against them."""

    overall: int
    knowledge: int
    tone: int
    handoff: int
    comment: str

    def scores(self) -> tuple[tuple[str, int], ...]:
        return tuple(zip(SCALES, (self.overall, self.knowledge, self.tone, self.handoff)))


SAMPLE_REVIEW = FiledReview(4, 5, 4, 3, "Ask which beverage format they are building before quoting a dose.")


class ReviewForm:
    """The questionnaire on one page."""

    def __init__(self, page: Page) -> None:
        self.page = page

    def scale(self, label: str) -> Locator:
        return self.page.locator(".scale").filter(has=self.page.get_by_text(label, exact=True))

    def score(self, label: str, value: int) -> Locator:
        return self.scale(label).get_by_role("radio", name=str(value), exact=True)

    def checked_scores(self, label: str) -> Locator:
        return self.scale(label).get_by_role("radio", checked=True)

    @property
    def radios(self) -> Locator:
        return self.page.get_by_role("radio")

    @property
    def checkboxes(self) -> Locator:
        return self.page.get_by_role("checkbox")

    @property
    def comment_box(self) -> Locator:
        return self.page.get_by_role("textbox", name=COMMENT_BOX)

    @property
    def free_text_boxes(self) -> Locator:
        return self.page.locator("textarea")

    @property
    def not_saved_notice(self) -> Locator:
        return self.page.get_by_text(NOT_SAVED_YET)

    @property
    def saved_heading(self) -> Locator:
        return self.page.get_by_role("heading", name="Saved", exact=True)

    def choose(self, label: str, value: int) -> None:
        self.scale(label).locator("label").filter(has_text=str(value)).first.click()

    def submit(self) -> None:
        self.page.get_by_role("button", name="Save review").click()

    def file(self, review: FiledReview) -> None:
        for label, score in review.scores():
            self.choose(label, score)
        self.comment_box.fill(review.comment)
        self.submit()
