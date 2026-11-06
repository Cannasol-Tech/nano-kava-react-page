"""
file: test/acceptance/functionality_report.py
author: Stephen Boyett

description:
    Makes every COMPLETE run leave durable evidence: it defaults the JUnit path, and once the run is
    over — only if every scenario in the pinned corpus ran — generates the functionality report and
    archives it with the JUnit. A filtered or interrupted run writes nothing, on purpose. Neither step
    can change the suite's exit code. See test/acceptance/CLAUDE.md § Evidence never gates.

See Also:
    test/acceptance/corpus.py
    scripts/generate_functionality_report.py
    scripts/archive_acceptance_evidence.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import corpus

GENERATOR = corpus.REPO_ROOT / "scripts/generate_functionality_report.py"
ARCHIVER = corpus.REPO_ROOT / "scripts/archive_acceptance_evidence.py"
#: Points the emit layer at another generator, so "a broken generator cannot change the verdict" is checkable.
GENERATOR_OVERRIDE = "ACCEPTANCE_REPORT_GENERATOR"
DISABLE = "ACCEPTANCE_FUNCTIONALITY_REPORT"
_OFF = {"0", "false", "no", "off"}


def _enabled() -> bool:
    return os.environ.get(DISABLE, "1").strip().lower() not in _OFF


def ensure_junit_path(config) -> None:
    """Default --junitxml so a bare `pytest test/acceptance` still leaves evidence."""
    if getattr(config.option, "xmlpath", None):
        return
    corpus.JUNIT.parent.mkdir(parents=True, exist_ok=True)
    config.option.xmlpath = str(corpus.JUNIT)


def emit(config) -> None:
    """Report + archive the finished JUnit, only when it describes the whole corpus. Never raises."""
    if getattr(config.option, "collectonly", False):
        return
    xml = Path(getattr(config.option, "xmlpath", "") or corpus.JUNIT)
    if not xml.exists():
        return
    if not corpus.is_complete_run(xml):
        print(
            f"⚠ functionality report SKIPPED — {corpus.executed_cases(xml)} of {corpus.corpus_size()} "
            "scenarios ran, so this run cannot describe the corpus. Run `make test-acceptance` "
            "unfiltered to produce evidence.",
            file=sys.stderr,
        )
        return
    if _enabled():
        _run(Path(os.environ.get(GENERATOR_OVERRIDE) or GENERATOR), "--junit", str(xml), "--soft-fail")
    # Archived even with reporting off: the JUnit is the irreplaceable half.
    _run(ARCHIVER, "--junit", str(xml), "--soft-fail")


def _run(script: Path, *args: str) -> None:
    if not script.exists():
        print(f"⚠ {script.name} missing — evidence step skipped", file=sys.stderr)
        return
    try:
        subprocess.run([sys.executable, str(script), *args], cwd=corpus.REPO_ROOT, check=False, timeout=600)
    except (OSError, subprocess.SubprocessError) as exc:
        print(f"⚠ {script.name} skipped — {exc}", file=sys.stderr)
