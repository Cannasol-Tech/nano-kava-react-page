"""
file: test/acceptance/support/browser.py
author: Stephen Boyett

description:
    Opens the browser contexts one scenario needs — a desktop visitor, a phone, or a crawler with
    JavaScript disabled — each behind its own ProductionGuard, and closes them afterwards. On a
    failed or xfailed scenario every open page is screenshotted into test-results/screenshots/.

See Also:
    test/acceptance/support/guard.py
    test/acceptance/conftest.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from playwright.sync_api import Browser, BrowserContext, Page

from support.environment import RESULTS_DIR, Targets
from support.guard import ProductionGuard

SCREENSHOTS = RESULTS_DIR / "screenshots"
DEFAULT_TIMEOUT_MS = 15_000
DESKTOP = {"viewport": {"width": 1280, "height": 800}}
PHONE = {"viewport": {"width": 390, "height": 844}, "is_mobile": True, "has_touch": True, "device_scale_factor": 3}
CRAWLER = {**DESKTOP, "java_script_enabled": False}


@dataclass
class GuardedPage:
    """A page plus the guard watching what its context tried to send."""

    page: Page
    guard: ProductionGuard


@dataclass
class BrowserSession:
    """Every context one scenario opened, so teardown can screenshot and close them all."""

    browser: Browser
    targets: Targets
    _opened: list[tuple[BrowserContext, GuardedPage]] = field(default_factory=list)

    def desktop(self) -> GuardedPage:
        return self._open(DESKTOP)

    def phone(self) -> GuardedPage:
        return self._open(PHONE)

    def crawler(self) -> GuardedPage:
        return self._open(CRAWLER)

    def close(self, scenario_name: str, failed: bool) -> None:
        if failed:
            self._screenshot(scenario_name)
        for context, _ in self._opened:
            context.close()
        for _, guarded in self._opened:
            guarded.guard.assert_clean()

    def _open(self, options: dict) -> GuardedPage:
        context = self.browser.new_context(locale="en-US", **options)
        context.set_default_timeout(DEFAULT_TIMEOUT_MS)
        guard = ProductionGuard(self.targets)
        guard.install(context)
        guarded = GuardedPage(context.new_page(), guard)
        self._opened.append((context, guarded))
        return guarded

    def _screenshot(self, scenario_name: str) -> None:
        SCREENSHOTS.mkdir(parents=True, exist_ok=True)
        stem = re.sub(r"[^A-Za-z0-9_-]+", "_", scenario_name)[:120]
        for index, (_, guarded) in enumerate(self._opened):
            try:
                guarded.page.screenshot(path=str(SCREENSHOTS / f"{stem}-{index}.png"), full_page=False)
            except Exception:  # noqa: BLE001 — a closed page cannot be photographed; the verdict stands
                pass
