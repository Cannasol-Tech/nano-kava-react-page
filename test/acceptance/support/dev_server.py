"""
file: test/acceptance/support/dev_server.py
author: Stephen Boyett

description:
    Owns the Vite dev server for one session: reuses one already listening on APP_URL, otherwise
    starts `npx vite` itself with its output in test-results/dev-server.log and stops it at the end.
    Also reads the review links the dev server's DRY RUN lead handler prints, which is the only
    place a local run can get one. See test/acceptance/CLAUDE.md § The review link comes from the log.

See Also:
    vite.config.js
    functions/CLAUDE.md

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import os
import re
import signal
import subprocess
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from support.environment import REPO_ROOT, RESULTS_DIR, Targets

SUITE_LOG = RESULTS_DIR / "dev-server.log"
STARTUP_TIMEOUT_S = 90
STOP_TIMEOUT_S = 10
_REVIEW_LINK = re.compile(r"review link: \S*/sol-review\?token=([A-Za-z0-9_-]+)")


class DevServerUnavailable(RuntimeError):
    """The dev server could not be reached or started."""


def is_reachable(url: str, timeout: float = 2.0) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return response.status < 500
    except (urllib.error.URLError, OSError, ValueError):
        return False


@dataclass(frozen=True)
class ReviewLink:
    """One lead's /sol-review token, as printed by the dry-run lead handler."""

    token: str

    def url(self, app_url: str, rating: int | None = None) -> str:
        star = f"&rating={rating}" if rating is not None else ""
        return f"{app_url}/sol-review?token={self.token}{star}"


class ReviewLinkLog:
    """The dev server's stdout, read for review links printed after a given mark."""

    def __init__(self, path: Path | None) -> None:
        self.path = path

    def mark(self) -> int:
        """How much of the log exists now, so only links printed after this count."""
        return len(self._text())

    def wait_for_link(self, since: int, timeout_s: float = 20.0) -> ReviewLink:
        if self.path is None:
            raise DevServerUnavailable(
                "no dev-server log to read the review link from — the suite reused a server it did "
                "not start. Stop it, or point DEV_SERVER_LOG at that server's output."
            )
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            tokens = _REVIEW_LINK.findall(self._text()[since:])
            if tokens:
                return ReviewLink(tokens[-1])
            time.sleep(0.25)
        raise AssertionError(f"the dev server printed no review link within {timeout_s:.0f}s ({self.path})")

    def _text(self) -> str:
        if self.path is None or not self.path.exists():
            return ""
        return self.path.read_text(encoding="utf-8", errors="replace")


class DevServer:
    """The app process behind APP_URL — started here only when nothing already serves it."""

    def __init__(self, targets: Targets) -> None:
        self.targets = targets
        self._process: subprocess.Popen | None = None
        self._log_handle = None

    @property
    def started_by_suite(self) -> bool:
        return self._process is not None

    @property
    def review_links(self) -> ReviewLinkLog:
        return ReviewLinkLog(SUITE_LOG if self.started_by_suite else self.targets.dev_server_log)

    def ensure_running(self) -> None:
        if is_reachable(self.targets.app_url):
            return
        self._start()
        self._wait_until_ready()

    def stop(self) -> None:
        if self._process is None:
            return
        try:
            os.killpg(self._process.pid, signal.SIGTERM)
            self._process.wait(timeout=STOP_TIMEOUT_S)
        except (ProcessLookupError, subprocess.TimeoutExpired):
            self._kill()
        finally:
            self._log_handle.close()

    def _start(self) -> None:
        SUITE_LOG.parent.mkdir(parents=True, exist_ok=True)
        self._log_handle = SUITE_LOG.open("w", encoding="utf-8")
        command = [
            "npx", "vite",
            "--host", self.targets.app_host,
            "--port", str(self.targets.app_port),
            "--strictPort",
        ]
        # BROWSER=none: vite.config.js sets `open: true`, and a test run must not pop a tab.
        self._process = subprocess.Popen(
            command,
            cwd=REPO_ROOT,
            env={**os.environ, "BROWSER": "none", "FORCE_COLOR": "0"},
            stdout=self._log_handle,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )

    def _wait_until_ready(self) -> None:
        deadline = time.monotonic() + STARTUP_TIMEOUT_S
        while time.monotonic() < deadline:
            if self._process.poll() is not None:
                raise DevServerUnavailable(f"the dev server exited early:\n{self._log_tail()}")
            if is_reachable(self.targets.app_url):
                return
            time.sleep(0.5)
        self.stop()
        raise DevServerUnavailable(f"the dev server was not ready in {STARTUP_TIMEOUT_S}s:\n{self._log_tail()}")

    def _kill(self) -> None:
        try:
            os.killpg(self._process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass

    @staticmethod
    def _log_tail(lines: int = 30) -> str:
        return "\n".join(SUITE_LOG.read_text(errors="replace").splitlines()[-lines:])
