#!/usr/bin/env python3
"""
file: scripts/archive_acceptance_evidence.py
author: Stephen Boyett

description:
    Copies a complete acceptance run's JUnit and functionality report out of the disposable
    test-results/ into the tracked archive, at runs/<UTC-STAMP>-<suite>-<commit>/. The suite and
    commit come from the report's own metadata, never from a caller's flag, and old runs beyond
    the retention count are pruned. Called by the emit layer; never fails a run under --soft-fail.

See Also:
    test/acceptance/corpus.py
    test/acceptance/functionality_report.py
    scripts/check_acceptance_evidence.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "test/acceptance"))

import corpus  # noqa: E402

RETENTION = 30
ARTIFACTS = (corpus.REPORT_HTML, corpus.REPORT_JSON, corpus.REPORT_META)
_RUN_DIR = re.compile(r"^\d{8}T\d{6}Z-[a-z0-9]+-[0-9a-f]+$")


@dataclass(frozen=True)
class RunIdentity:
    """What names one archived run: when, which suite, which commit."""

    stamp: str
    suite: str
    commit: str

    @property
    def directory_name(self) -> str:
        return f"{self.stamp}-{self.suite}-{self.commit}"

    @classmethod
    def from_report(cls, report_dir: Path) -> "RunIdentity":
        meta = json.loads((report_dir / corpus.REPORT_META).read_text(encoding="utf-8"))
        generated = datetime.fromisoformat(meta["generated_at"]).astimezone(timezone.utc)
        return cls(generated.strftime("%Y%m%dT%H%M%SZ"), meta["suite"], meta["commit_short"])

    @classmethod
    def without_report(cls) -> "RunIdentity":
        """A JUnit with no report still names its suite — from the corpus constant, not a flag."""
        commit = subprocess.run(["git", "rev-parse", "--short=12", "HEAD"], cwd=REPO_ROOT,
                                capture_output=True, text=True, check=False).stdout.strip() or "unknown"
        return cls(datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"), corpus.SUITE, commit)


class EvidenceArchive:
    """The tracked runs/ directory, newest last, pruned to a fixed retention."""

    def __init__(self, root: Path, retention: int) -> None:
        self.root = root
        self.retention = retention

    def store(self, report_dir: Path | None, junit: Path) -> Path:
        identity = RunIdentity.from_report(report_dir) if report_dir else RunIdentity.without_report()
        target = self.root / identity.directory_name
        target.mkdir(parents=True, exist_ok=True)
        shutil.copy2(junit, target / junit.name)
        for name in ARTIFACTS if report_dir else ():
            if (report_dir / name).exists():
                shutil.copy2(report_dir / name, target / name)
        self._prune()
        return target

    def runs(self) -> list[Path]:
        if not self.root.exists():
            return []
        return sorted(p for p in self.root.iterdir() if p.is_dir() and _RUN_DIR.match(p.name))

    def _prune(self) -> None:
        for stale in self.runs()[:-self.retention]:
            shutil.rmtree(stale)


def report_describing(junit: Path, report_dir: Path) -> Path | None:
    """The report only if it was rendered from THIS JUnit — a stale latest/ is not this run's."""
    meta = report_dir / corpus.REPORT_META
    if not meta.exists():
        return None
    rendered_from = json.loads(meta.read_text(encoding="utf-8")).get("junit_sha256")
    return report_dir if rendered_from == corpus.sha256_of(junit) else None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Archive a complete acceptance run's evidence.")
    parser.add_argument("--junit", type=Path, default=corpus.JUNIT)
    parser.add_argument("--report-dir", type=Path, default=corpus.REPORT_DIR)
    parser.add_argument("--retention", type=int, default=RETENTION)
    parser.add_argument("--soft-fail", action="store_true", help="always exit 0 — archiving never fails a run")
    args = parser.parse_args(argv)

    if not args.junit.exists():
        print(f"⚠ nothing to archive — no JUnit at {corpus.relative(args.junit)}", file=sys.stderr)
        return 0 if args.soft_fail else 1
    try:
        report_dir = report_describing(args.junit, args.report_dir)
        landed = EvidenceArchive(corpus.ARCHIVE_ROOT, args.retention).store(report_dir, args.junit)
    except (OSError, KeyError, ValueError) as exc:
        print(f"⚠ acceptance evidence NOT archived — {exc}", file=sys.stderr)
        return 0 if args.soft_fail else 1
    print(f"✓ acceptance evidence archived → {corpus.relative(landed)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
