"""
file: test/acceptance/support/environment.py
author: Stephen Boyett

description:
    The two targets the suite drives and the browser it drives them with, read once from the
    environment. APP_URL is the Vite dev server (everything interactive); SITE_URL is production,
    which the suite may only GET. See test/acceptance/CLAUDE.md § Two targets.

See Also:
    test/acceptance/conftest.py
    test/acceptance/README.md

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).resolve().parents[3]
RESULTS_DIR = REPO_ROOT / "test-results"
DEFAULT_APP_URL = "http://localhost:3000"
DEFAULT_SITE_URL = "https://enjoynano.com"


def _flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Targets:
    """Where each kind of scenario points, and how the browser is launched."""

    app_url: str
    site_url: str
    browser_channel: str
    headed: bool
    deployed_e2e: bool
    dev_server_log: Path | None

    @classmethod
    def from_environment(cls) -> "Targets":
        log = os.environ.get("DEV_SERVER_LOG", "").strip()
        return cls(
            app_url=os.environ.get("APP_URL", DEFAULT_APP_URL).rstrip("/"),
            site_url=os.environ.get("SITE_URL", DEFAULT_SITE_URL).rstrip("/"),
            browser_channel=os.environ.get("ACCEPTANCE_BROWSER_CHANNEL", "chrome").strip(),
            headed=_flag("HEADED"),
            deployed_e2e=_flag("DEPLOYED_E2E"),
            dev_server_log=Path(log) if log else None,
        )

    @property
    def app_port(self) -> int:
        return urlparse(self.app_url).port or 80

    @property
    def app_host(self) -> str:
        return urlparse(self.app_url).hostname or "localhost"

    def app(self, path: str) -> str:
        return f"{self.app_url}{path}"

    def site(self, path: str) -> str:
        return f"{self.site_url}{path}"
