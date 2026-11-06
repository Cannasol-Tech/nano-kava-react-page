"""
file: test/acceptance/support/contact.py
author: Stephen Boyett

description:
    The /contact form as a visitor fills it in: labelled fields, the inquiry-type buttons, the
    inline field errors and the confirmation that replaces the form on success.

See Also:
    src/components/ContactPage.jsx
    test/acceptance/support/guard.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

from dataclasses import dataclass

from playwright.sync_api import Locator, Page

DEFAULT_INQUIRY = "Request Samples"
FOLLOW_UP = "Josh will get back to you within 24 hours"


@dataclass(frozen=True)
class ContactDetails:
    """What a visitor types into the form."""

    name: str
    email: str
    message: str
    inquiry: str = DEFAULT_INQUIRY


class ContactForm:
    """The contact form on one page."""

    def __init__(self, page: Page) -> None:
        self.page = page

    @property
    def name(self) -> Locator:
        return self.page.get_by_label("Full Name")

    @property
    def email(self) -> Locator:
        return self.page.get_by_label("Email Address")

    @property
    def message(self) -> Locator:
        return self.page.get_by_label("Your Message")

    @property
    def confirmation(self) -> Locator:
        return self.page.get_by_role("heading", name="Message Sent!")

    def error(self, text: str) -> Locator:
        return self.page.get_by_text(text, exact=True)

    def choose_inquiry(self, label: str) -> None:
        self.page.get_by_role("button", name=label, exact=True).click()

    def fill(self, details: ContactDetails) -> None:
        self.name.fill(details.name)
        self.email.fill(details.email)
        self.choose_inquiry(details.inquiry)
        self.message.fill(details.message)

    def submit(self) -> None:
        self.page.get_by_role("button", name="Send Message").click()
