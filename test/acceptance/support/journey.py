"""
file: test/acceptance/support/journey.py
author: Stephen Boyett

description:
    One scenario's state, handed from step to step: the page the visitor is on, who the visitor is,
    the card Sol proposed, the review link the lead minted and what each visited page showed.
    Every step reads and writes this rather than its own fixture, so steps compose across files.

See Also:
    test/acceptance/conftest.py
    test/acceptance/steps/common.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass, field

from playwright.sync_api import Page, Response

from support.browser import BrowserSession, GuardedPage
from support.contact import ContactForm
from support.dev_server import DevServer, ReviewLink
from support.environment import Targets
from support.review import FiledReview, ReviewForm
from support.site import ServedHead
from support.sol import LeadCardForm, SolReply, SolWidget, Visitor


@dataclass(frozen=True)
class PageVisit:
    """What one public page showed when the scenario opened it."""

    path: str
    status: int
    heading_visible: bool
    navigation_visible: bool
    copy_visible: bool
    head: ServedHead | None = None


@dataclass
class Journey:
    """The visitor's state across one scenario's steps."""

    targets: Targets
    session: BrowserSession
    app: DevServer
    visitor: Visitor = field(default_factory=Visitor.unique)
    current: GuardedPage | None = None
    card: LeadCardForm | None = None
    reply: SolReply | None = None
    review_link: ReviewLink | None = None
    filed_review: FiledReview | None = None
    deployed_run: subprocess.CompletedProcess | None = None
    response: Response | None = None
    visits: list[PageVisit] = field(default_factory=list)
    log_mark: int = 0

    @property
    def page(self) -> Page:
        assert self.current is not None, "no page is open yet — a Given step must open one"
        return self.current.page

    @property
    def sol(self) -> SolWidget:
        return SolWidget(self.page)

    @property
    def contact_form(self) -> ContactForm:
        return ContactForm(self.page)

    @property
    def review_form(self) -> ReviewForm:
        return ReviewForm(self.page)

    def open_app(self, path: str, device: str = "desktop") -> Page:
        """Open a page on the dev server, starting it first if the suite owns it."""
        self.app.ensure_running()
        if self.current is None or device != "desktop":
            self.current = self.session.phone() if device == "phone" else self.session.desktop()
        self.response = self.page.goto(self.targets.app(path))
        return self.page

    def open_site(self, path: str, crawler: bool = False) -> Page:
        """GET a production page — read-only, enforced by the context's guard."""
        if self.current is None:
            self.current = self.session.crawler() if crawler else self.session.desktop()
        self.response = self.page.goto(self.targets.site(path))
        return self.page

    def mark_dev_log(self) -> None:
        self.log_mark = self.app.review_links.mark()

    def capture_review_link(self) -> ReviewLink:
        self.review_link = self.app.review_links.wait_for_link(self.log_mark)
        return self.review_link
