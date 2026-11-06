"""
file: test/acceptance/support/site.py
author: Stephen Boyett

description:
    The four public pages as the PRD names them, and what each must show: its heading, the copy a
    crawler must be able to read, and the navigation link that reaches it. Also reads the served
    head tags and JSON-LD of a page loaded with JavaScript disabled.

See Also:
    _bmad-output/planning-artifacts/PRD.md
    src/seo/routes.js

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass

from playwright.sync_api import Locator, Page

MAIN_NAVIGATION = "Main navigation"
ORGANIZATION_NAME = "Cannasol Technologies"
#: Canonical URLs always name production, whichever host SITE_URL points at (src/seo/routes.js SITE).
CANONICAL_ORIGIN = "https://enjoynano.com"
WHEEL_STEP_PX = 400


@dataclass(frozen=True)
class PublicPage:
    """One public route and the facts the acceptance suite checks about it."""

    path: str
    heading: re.Pattern
    readable_copy: re.Pattern
    nav_label: str
    home_link: str

    @property
    def is_home(self) -> bool:
        return self.path == "/"

    @property
    def canonical_url(self) -> str:
        return f"{CANONICAL_ORIGIN}{self.path}"


PUBLIC_PAGES: tuple[PublicPage, ...] = (
    PublicPage("/", re.compile(r"Nano Kava"), re.compile(r"nanoemulsion", re.I), "", ""),
    PublicPage("/faq", re.compile(r"Frequently Asked Questions"), re.compile(r"kavalactone", re.I), "FAQ", "Back to Home"),
    PublicPage("/contact", re.compile(r"Let.s Connect"), re.compile(r"Full Name"), "Contact", "Back to Home"),
    PublicPage("/mushrooms", re.compile(r"Nanoemulsified Functional Mushrooms"), re.compile(r"Reishi"), "Mushrooms", "Nano Kava"),
)
HOME = PUBLIC_PAGES[0]
CONTACT = next(p for p in PUBLIC_PAGES if p.path == "/contact")


def main_heading(page: Page, public_page: PublicPage) -> Locator:
    return page.get_by_role("heading", level=1, name=public_page.heading)


def main_navigation(page: Page) -> Locator:
    return page.get_by_role("navigation", name=MAIN_NAVIGATION)


def nav_link(page: Page, label: str) -> Locator:
    return main_navigation(page).get_by_role("link", name=label, exact=True).first


def is_shown(locator: Locator, timeout_ms: int = 10_000) -> bool:
    """An observation, not an assertion: whether the element became visible in time."""
    try:
        locator.first.wait_for(state="visible", timeout=timeout_ms)
        return True
    except Exception:  # noqa: BLE001 — Playwright's TimeoutError; False is the observation
        return False


def scroll_down(page: Page, *, to_px: int | None = None, to_fraction: float | None = None) -> None:
    """Scroll with the mouse wheel, as a visitor does, until the page is at least that far down."""
    target = to_px if to_px is not None else int(page.evaluate("document.documentElement.scrollHeight") * to_fraction)
    viewport = page.viewport_size or {"width": 400, "height": 800}
    page.mouse.move(viewport["width"] // 2, viewport["height"] // 2)
    for _ in range(60):
        if page.evaluate("window.scrollY") >= target:
            return
        page.mouse.wheel(0, WHEEL_STEP_PX)
        page.wait_for_timeout(120)
    raise AssertionError(f"could not scroll to {target}px (stuck at {page.evaluate('window.scrollY')}px)")


@dataclass(frozen=True)
class ServedHead:
    """The head tags and structured data of a page as served, read with JavaScript off."""

    titles: int
    descriptions: int
    canonicals: tuple[str, ...]
    json_ld: tuple[dict, ...]

    @classmethod
    def read(cls, page: Page) -> "ServedHead":
        head = page.locator("head")
        canonical = head.locator('link[rel="canonical"]')
        blocks = page.locator('script[type="application/ld+json"]').all_text_contents()
        return cls(
            titles=head.locator("title").count(),
            descriptions=head.locator('meta[name="description"]').count(),
            canonicals=tuple(canonical.nth(i).get_attribute("href") or "" for i in range(canonical.count())),
            json_ld=tuple(json.loads(block) for block in blocks),
        )

    def organizations(self) -> list[dict]:
        return [node for node in self._nodes() if "Organization" in _types(node)]

    def names_organization(self, name: str) -> bool:
        return any(node.get("name") == name for node in self.organizations())

    def _nodes(self) -> list[dict]:
        nodes: list[dict] = []
        for block in self.json_ld:
            nodes.extend(block.get("@graph", [block]))
        return nodes


def _types(node: dict) -> list[str]:
    declared = node.get("@type", [])
    return declared if isinstance(declared, list) else [declared]
