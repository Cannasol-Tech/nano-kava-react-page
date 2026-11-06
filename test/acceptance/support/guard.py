"""
file: test/acceptance/support/guard.py
author: Stephen Boyett

description:
    Keeps every test browser off production's write paths. Non-GET requests to the live site or
    the Cloud Functions are aborted and recorded as violations, analytics beacons are dropped, and
    the contact form's hard-coded production POST is forwarded to the dev server's DRY RUN handler.
    See test/acceptance/CLAUDE.md § The contact form posts to production.

See Also:
    src/components/ContactPage.jsx
    vite.config.js

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

from playwright.sync_api import BrowserContext, Route

from support.environment import Targets

PRODUCTION_FUNCTIONS = "https://us-central1-nano-kava-landing-page.cloudfunctions.net"
CONTACT_FUNCTION_PATH = "/sendContactEmail"
DRY_RUN_CONTACT_PATH = "/api/sendContactEmail"
READ_ONLY_METHODS = frozenset({"GET", "HEAD"})
ANALYTICS = re.compile(
    r"^https://([a-z0-9-]+\.)*(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net)/"
)
CORS_HEADERS = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
}


@dataclass
class ProductionGuard:
    """One browser context's record of what it tried to send, and where it really went."""

    targets: Targets
    violations: list[str] = field(default_factory=list)
    contact_submissions: list[str] = field(default_factory=list)

    def install(self, context: BrowserContext) -> None:
        context.route(ANALYTICS, lambda route: route.abort())
        context.route(f"{PRODUCTION_FUNCTIONS}/**", self._production_function)
        context.route(f"{self.targets.site_url}/**", self._production_site)

    def assert_clean(self) -> None:
        assert not self.violations, "a test browser tried to write to production:\n" + "\n".join(self.violations)

    def _production_site(self, route: Route) -> None:
        if route.request.method in READ_ONLY_METHODS:
            route.continue_()
            return
        self._refuse(route)

    def _production_function(self, route: Route) -> None:
        request = route.request
        if urlparse(request.url).path != CONTACT_FUNCTION_PATH:
            self._refuse(route)
        elif request.method == "OPTIONS":
            route.fulfill(status=204, headers=CORS_HEADERS)
        elif request.method == "POST":
            self._forward_to_dry_run(route)
        else:
            self._refuse(route)

    def _forward_to_dry_run(self, route: Route) -> None:
        self.contact_submissions.append(route.request.post_data or "")
        response = route.fetch(url=self.targets.app(DRY_RUN_CONTACT_PATH))
        route.fulfill(response=response, headers={**response.headers, **CORS_HEADERS})

    def _refuse(self, route: Route) -> None:
        self.violations.append(f"{route.request.method} {route.request.url}")
        route.abort()
