"""
file: test/acceptance/corpus.py
author: Stephen Boyett

description:
    The single source of truth for this suite's evidence chain: its name, its pinned Gherkin corpus,
    its JUnit, report and archive paths, and how the corpus is counted and read scenario by scenario.
    The emit layer, the report generator, the archiver and both gates import it rather than restating it.

See Also:
    test/acceptance/functionality_report.py
    scripts/generate_functionality_report.py
    scripts/check_acceptance_evidence.py
    scripts/check_scenario_levels.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SUITE = "e2e"
FEATURE_ROOT = REPO_ROOT / "test/acceptance/features"
JUNIT = REPO_ROOT / "test-results/e2e-results.xml"
REPORT_ROOT = REPO_ROOT / "test-results/functionality-report-e2e"
REPORT_DIR = REPORT_ROOT / "latest"
ARCHIVE_ROOT = REPO_ROOT / "_bmad-output/test-artifacts/functionality-reports/runs"
REPORT_HTML = "executive-report.html"
REPORT_JSON = "executive-report.json"
REPORT_META = "report-meta.json"

_SCENARIO = re.compile(r"^\s*Scenario(?: Outline)?:\s*(?P<title>.+?)\s*$")
_FEATURE = re.compile(r"^\s*Feature:")
_TAGLINE = re.compile(r"^\s*@")
_TAG = re.compile(r"@([A-Za-z0-9_]+)")
_TESTCASE = re.compile(r"<testcase\b")


def relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


@dataclass(frozen=True)
class Scenario:
    """One scenario: where it is, what it is called, and every tag pytest-bdd applies to it."""

    path: Path
    line: int
    title: str
    tags: tuple[str, ...]

    def tagged(self, prefix: str) -> tuple[str, ...]:
        return tuple(t for t in self.tags if t.startswith(prefix))


class FeatureFile:
    """One .feature file, read scenario by scenario with the Feature line's tags folded in."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.lines = path.read_text(encoding="utf-8").split("\n")

    @property
    def feature_tags(self) -> tuple[str, ...]:
        return next((self._tags_above(i) for i, line in enumerate(self.lines) if _FEATURE.match(line)), ())

    def scenarios(self) -> list[Scenario]:
        feature = self.feature_tags
        return [
            Scenario(self.path, i + 1, m.group("title"), feature + self._tags_above(i))
            for i, line in enumerate(self.lines)
            if (m := _SCENARIO.match(line))
        ]

    def _tags_above(self, index: int) -> tuple[str, ...]:
        found: list[str] = []
        j = index - 1
        while j >= 0 and _TAGLINE.match(self.lines[j]):
            found = _TAG.findall(self.lines[j]) + found
            j -= 1
        return tuple(found)


def feature_files(root: Path = FEATURE_ROOT) -> list[FeatureFile]:
    return [FeatureFile(path) for path in sorted(root.glob("**/*.feature"))]


def all_scenarios(root: Path = FEATURE_ROOT) -> list[Scenario]:
    return [s for f in feature_files(root) for s in f.scenarios()]


def corpus_size() -> int:
    """Scenarios in the pinned corpus. Zero — never a guess — when it cannot be read."""
    try:
        return len(all_scenarios())
    except OSError:
        return 0


def executed_cases(xml: Path) -> int:
    """Testcases the JUnit records. Counted, not parsed: a parser buys nothing here."""
    try:
        return len(_TESTCASE.findall(xml.read_text(encoding="utf-8", errors="replace")))
    except OSError:
        return 0


def is_complete_run(xml: Path) -> bool:
    """Whether every scenario in the corpus ran — the bar for describing the corpus."""
    corpus = corpus_size()
    return bool(corpus) and executed_cases(xml) >= corpus


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else ""
