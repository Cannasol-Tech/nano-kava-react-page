#!/usr/bin/env python3
"""
file: scripts/check_acceptance_evidence.py
author: Stephen Boyett

description:
    The separate gate that asks whether the evidence is real, because every producer in the chain
    runs soft-fail and a missing report is otherwise silent. A complete run must have a report
    rendered from this exact JUnit, naming the pinned corpus, with an equal scenario count, and an
    archived copy. A partial run must have written no report at all. Meant to FAIL loudly.

See Also:
    test/acceptance/corpus.py
    scripts/generate_functionality_report.py
    scripts/archive_acceptance_evidence.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from xml.etree import ElementTree

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "test/acceptance"))

import corpus  # noqa: E402


@dataclass
class Findings:
    """What the evidence chain got wrong, plus what it got right, in reading order."""

    failures: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def fail(self, what: str, why: str) -> None:
        self.failures.append(f"{what}\n      → {why}")

    def note(self, what: str) -> None:
        self.notes.append(what)


@dataclass
class JUnitEvidence:
    """The irreplaceable half: what actually ran."""

    path: Path
    cases: int = 0
    errors: int = 0
    failures: int = 0
    skipped: int = 0

    def read(self, found: Findings) -> bool:
        if not self.path.exists() or self.path.stat().st_size == 0:
            found.fail(f"no JUnit at {corpus.relative(self.path)}", "the suite never ran to completion.")
            return False
        try:
            root = ElementTree.parse(self.path).getroot()
        except ElementTree.ParseError as exc:
            found.fail(f"JUnit at {corpus.relative(self.path)} is not parseable", str(exc)[:200])
            return False
        for suite in root.iter("testsuite"):
            self.cases += int(suite.get("tests") or 0)
            self.errors += int(suite.get("errors") or 0)
            self.failures += int(suite.get("failures") or 0)
            self.skipped += int(suite.get("skipped") or 0)
        if self.cases == 0:
            found.fail("the JUnit records ZERO test cases", "the suite collected nothing.")
            return False
        if self.errors:
            found.fail(f"the JUnit records {self.errors} collection/setup ERROR(s)", "an absent pass is not a result.")
        found.note(f"JUnit: {self.cases} case(s) · {self.failures} failed · {self.skipped} skipped · {self.errors} error(s)")
        return True

    @property
    def complete(self) -> bool:
        return corpus.is_complete_run(self.path)


@dataclass
class ReportEvidence:
    """The rendered report, and whether it describes the run that just happened."""

    directory: Path
    meta: dict = field(default_factory=dict)

    def exists(self) -> bool:
        return (self.directory / corpus.REPORT_META).exists()

    def rendered_from(self, junit: JUnitEvidence) -> bool:
        return self._meta().get("junit_sha256") == corpus.sha256_of(junit.path)

    def check(self, junit: JUnitEvidence, found: Findings) -> None:
        for name in (corpus.REPORT_HTML, corpus.REPORT_JSON, corpus.REPORT_META):
            artifact = self.directory / name
            if not artifact.exists() or artifact.stat().st_size == 0:
                found.fail(f"report is missing {name}", "the generator did not run or crashed — usually the "
                           "silverline.reporting toolkit is not installed (make acceptance-setup).")
                return
        if not self.rendered_from(junit):
            found.fail("the report was rendered from a DIFFERENT JUnit than this run's",
                       "a stale test-results/ copy: a report that does not describe this run is worse than none.")
            return
        self._check_counts(junit, found)
        self._check_corpus(found)

    def _check_counts(self, junit: JUnitEvidence, found: Findings) -> None:
        reported = json.loads((self.directory / corpus.REPORT_JSON).read_text()).get("summary", {}).get("total_scenarios")
        if reported != junit.cases:
            found.fail(f"report describes {reported} scenario(s) but the JUnit records {junit.cases}",
                       "the report and the run disagree about what ran.")
        else:
            found.note(f"report: {reported} scenario(s), matches the JUnit exactly")

    def _check_corpus(self, found: Findings) -> None:
        named = self._meta().get("corpus", {})
        expected = corpus.relative(corpus.FEATURE_ROOT)
        if named.get("corpus_root") != expected or named.get("suite") != corpus.SUITE:
            found.fail(f"report names corpus {named.get('corpus_root')!r} / suite {named.get('suite')!r}",
                       f"it must describe the pinned acceptance corpus {expected!r}, suite {corpus.SUITE!r}.")
        else:
            found.note(f"report names its corpus: {expected} ({named.get('scenarios')} scenarios), suite {corpus.SUITE}")

    def _meta(self) -> dict:
        if not self.meta and self.exists():
            self.meta = json.loads((self.directory / corpus.REPORT_META).read_text())
        return self.meta


class ArchiveEvidence:
    """The tracked copy: a complete run must have landed under runs/ with its suite in the name."""

    def __init__(self, root: Path) -> None:
        self.root = root

    def check(self, junit: JUnitEvidence, found: Findings) -> None:
        digest = corpus.sha256_of(junit.path)
        for run in sorted(self.root.glob(f"*-{corpus.SUITE}-*"), reverse=True):
            if corpus.sha256_of(run / junit.path.name) == digest:
                found.note(f"archived: {corpus.relative(run)}")
                return
        found.fail("this run is not in the archive", f"no {corpus.relative(self.root)}/*-{corpus.SUITE}-* holds this JUnit.")


class EvidenceCheck:
    """Runs every assertion and reports them together, so one run names every gap."""

    def __init__(self, junit: Path, report_dir: Path) -> None:
        self.junit = JUnitEvidence(junit)
        self.report = ReportEvidence(report_dir)
        self.archive = ArchiveEvidence(corpus.ARCHIVE_ROOT)

    def run(self) -> Findings:
        found = Findings()
        if not self.junit.read(found):
            return found
        if self.junit.complete:
            self.report.check(self.junit, found)
            self.archive.check(self.junit, found)
        else:
            self._check_partial(found)
        return found

    def _check_partial(self, found: Findings) -> None:
        ran, size = self.junit.cases, corpus.corpus_size()
        if self.report.exists() and self.report.rendered_from(self.junit):
            found.fail(f"a PARTIAL run ({ran} of {size} scenarios) produced a report",
                       "only a run of the whole corpus may describe it.")
        else:
            found.note(f"partial run ({ran} of {size} scenarios): no report written for it — the correct outcome")


def _render(found: Findings) -> int:
    for note in found.notes:
        print(f"  ✓ {note}")
    if not found.failures:
        print("\n✅ the acceptance evidence chain produced everything it promised.")
        return 0
    print(f"\n✗ THE EVIDENCE CHAIN IS BROKEN — {len(found.failures)} problem(s).")
    print("  The tests own the product's verdict; this check owns whether the evidence is real.\n")
    for index, failure in enumerate(found.failures, start=1):
        print(f"  {index}. {failure}\n")
    return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Assert the acceptance suite left the evidence it promised.")
    parser.add_argument("--junit", type=Path, default=corpus.JUNIT)
    parser.add_argument("--report-dir", type=Path, default=corpus.REPORT_DIR)
    args = parser.parse_args(argv)
    print("── acceptance evidence check ──")
    return _render(EvidenceCheck(args.junit, args.report_dir).run())


if __name__ == "__main__":
    raise SystemExit(main())
