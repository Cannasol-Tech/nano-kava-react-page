"""
file: test/acceptance/conftest.py
author: Stephen Boyett

description:
    Configuration for the FR-level acceptance suite: the installed-Chrome browser, the dev server
    the suite owns when nothing else serves APP_URL, one guarded BrowserSession and Journey per
    scenario, @wip as a strict xfail, every .feature tag registered as a marker for FR=/STORY=
    filters, and the functionality report emitted after the JUnit is written.

See Also:
    test/acceptance/README.md
    test/acceptance/CLAUDE.md
    test/acceptance/functionality_report.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

from typing import Iterator

import pytest
from playwright.sync_api import Browser, Playwright, expect, sync_playwright

import corpus
import functionality_report
from support.browser import BrowserSession
from support.dev_server import DevServer
from support.environment import Targets
from support.journey import Journey

EXPECT_TIMEOUT_MS = 10_000
_WIP_REASON = (
    "@wip — the product does not meet this scenario yet; the reason is the comment above it in the "
    ".feature file. strict=True: the moment it passes, the run goes RED so someone removes @wip."
)


@pytest.hookimpl(tryfirst=True)
def pytest_configure(config) -> None:
    functionality_report.ensure_junit_path(config)
    for tag in sorted({t for s in corpus.all_scenarios() for t in s.tags}):
        config.addinivalue_line("markers", f"{tag}: Gherkin tag")
    expect.set_options(timeout=EXPECT_TIMEOUT_MS)


def pytest_unconfigure(config) -> None:
    """Emit the functionality report — after junitxml has written the file."""
    functionality_report.emit(config)


def pytest_bdd_apply_tag(tag, function):
    """`@wip` is a STRICT xfail, so a delivered fix breaks the build until the tag is removed."""
    if tag != "wip":
        return None
    pytest.mark.xfail(reason=_WIP_REASON, strict=True, run=True)(function)
    return True


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    setattr(item, f"rep_{report.when}", report)


@pytest.fixture(scope="session")
def targets() -> Targets:
    return Targets.from_environment()


@pytest.fixture(scope="session")
def app_server(targets: Targets) -> Iterator[DevServer]:
    """Started lazily by the first scenario that opens APP_URL; stopped only if the suite started it."""
    server = DevServer(targets)
    yield server
    server.stop()


@pytest.fixture(scope="session")
def playwright_instance() -> Iterator[Playwright]:
    with sync_playwright() as playwright:
        yield playwright


@pytest.fixture(scope="session")
def browser(playwright_instance: Playwright, targets: Targets) -> Iterator[Browser]:
    channel = targets.browser_channel or None
    launched = playwright_instance.chromium.launch(channel=channel, headless=not targets.headed)
    yield launched
    launched.close()


@pytest.fixture
def journey(request, browser: Browser, targets: Targets, app_server: DevServer) -> Iterator[Journey]:
    session = BrowserSession(browser, targets)
    yield Journey(targets=targets, session=session, app=app_server)
    call = getattr(request.node, "rep_call", None)
    failed = bool(call and (call.failed or hasattr(call, "wasxfail")))
    session.close(request.node.name, failed)
