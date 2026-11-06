#!/usr/bin/env python3
"""
file: scripts/generate_functionality_report.py
author: Stephen Boyett

description:
    Renders the Silverline functionality report for one COMPLETE acceptance run through
    cd-pipeline's shared generator. Requirements come from the PRD, coverage from the pinned
    acceptance corpus (a constant — there is no flag to point it elsewhere), and the header states
    that corpus plus an honest proof-level split. Writes test-results/functionality-report-e2e/latest/.

See Also:
    test/acceptance/corpus.py
    test/acceptance/functionality_report.py
    scripts/archive_acceptance_evidence.py
    scripts/check_acceptance_evidence.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
import types
from dataclasses import asdict, dataclass, field, replace
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "test/acceptance"))

import corpus  # noqa: E402

PRD = REPO_ROOT / "_bmad-output/planning-artifacts/PRD.md"
OWNER, REPO = "Cannasol-Technologies", "nano-kava-react-page"
_FEATURE_HEADING = re.compile(r"^### (F-\d{3}) — (.+?)\s*$", re.M)
_REQUIREMENT = re.compile(r"^- \*\*(FR-\d{4})\*\* — (.+?)(?=^- \*\*|^#|\Z)", re.M | re.S)
_FR_TAG = re.compile(r"^@?N?FR[_-](\d{4})$", re.I)
PASSED = "passed"


# ── the PRD, as the toolkit's requirements manifest ──────────────────────────


@dataclass(frozen=True)
class FeatureArea:
    code: str
    name: str
    order: int


@dataclass(frozen=True)
class Requirement:
    id: str
    feature: str
    description: str


class PrdCatalogue:
    """Every FR and Feature the PRD defines — the report's requirement SSoT."""

    def __init__(self, path: Path = PRD) -> None:
        text = path.read_text(encoding="utf-8")
        self.features = [FeatureArea(code, name, i) for i, (code, name) in enumerate(_FEATURE_HEADING.findall(text), 1)]
        self.requirements = [
            Requirement(rid, f"F-0{rid[3:5]}", " ".join(body.split()))
            for rid, body in _REQUIREMENT.findall(text)
        ]

    def manifest_module(self) -> types.ModuleType:
        """The `requirements_manifest` module cd-pipeline loads at import time."""
        from silverline.reporting.phases import Phase

        module = types.ModuleType("requirements_manifest")
        module.PHASES = {0: {"name": "As-built baseline", "description": "Behaviour the site already ships."}}
        module.CATEGORIES = {
            f.code: {"name": f.name, "description": f.name, "phase": 0, "order": f.order} for f in self.features
        }
        module.REQUIREMENTS = {r.id: (r.description, "P0", "Implemented", Phase.MVP) for r in self.requirements}
        module.normalize_tag = normalize_tag
        module.get_category_key = lambda rid: f"F-0{rid[3:5]}"
        return module


def normalize_tag(tag: str) -> str:
    """`@FR_0101` (how .feature files write it) → `FR-0101` (how the PRD writes it)."""
    match = _FR_TAG.match(tag.strip())
    return f"FR-{match.group(1)}" if match else tag


# ── the shared toolkit, taught this repo's conventions ───────────────────────


class ToolkitMissing(RuntimeError):
    """silverline.reporting is not importable — install test/acceptance/requirements.txt."""


def load_toolkit(catalogue: PrdCatalogue):
    """Import the generator with our manifest preloaded, then fix its two wrong assumptions."""
    sys.modules["requirements_manifest"] = catalogue.manifest_module()
    try:
        import silverline.reporting.generate as generate
    except ImportError as exc:
        raise ToolkitMissing(f"silverline.reporting is not installed ({exc}) — run `make acceptance-setup`") from None
    from pytest_bdd.scenario import make_python_name

    # Its category is `id.split('-')[0]` ("FR" for every id) and its test name is an approximation.
    lookup = sys.modules["requirements_manifest"].get_category_key
    generate.NORM_REQUIREMENTS = {rid: replace(r, category=lookup(rid)) for rid, r in generate.NORM_REQUIREMENTS.items()}
    generate.JUnitParser.scenario_to_test_name = staticmethod(lambda name: f"test_{make_python_name(name)}")
    return generate


def read_features(generate) -> list[dict]:
    """The pinned corpus, with requirement tags in the PRD's own spelling."""
    features = generate.GherkinParser().parse_dir(corpus.FEATURE_ROOT)
    for feature in features:
        feature["source"] = corpus.relative(corpus.FEATURE_ROOT / feature["file"])
        for scenario in feature["scenarios"]:
            ids = [normalize_tag(t) for t in scenario["tags"] if _FR_TAG.match(t)]
            scenario["req_tags"] = list(dict.fromkeys(ids))
    return features


# ── proof levels: what each requirement was actually proven at ───────────────


@dataclass(frozen=True)
class RequirementProof:
    """How one requirement was proven in this run. `level` never claims more than a pass."""

    requirement: str
    level: str
    tool: str
    scenarios: int
    passing: int

    @property
    def hover(self) -> str:
        return {
            "e2e": f"Proven end-to-end: a real browser drove {self.passing} passing scenario(s).",
            "service": f"Proven at service level: {self.passing} passing scenario(s), no screen involved.",
            "written_not_passing": f"{self.scenarios} scenario(s) written; none passed in this run.",
            "none": "No acceptance scenario is written for this requirement.",
        }[self.level]


@dataclass
class ProofLedger:
    """Per-requirement proof, split so a fallback bucket is never summarised as a level."""

    proofs: list[RequirementProof] = field(default_factory=list)

    @classmethod
    def build(cls, catalogue: PrdCatalogue, features: list[dict], statuses: dict[str, str], name_of) -> "ProofLedger":
        ledger = cls()
        for requirement in catalogue.requirements:
            tagged = [s for f in features for s in f["scenarios"] if requirement.id in s["req_tags"]]
            passed = [s for s in tagged if statuses.get(name_of(s["name"])) == PASSED]
            ledger.proofs.append(RequirementProof(
                requirement.id, cls._level(tagged, passed), cls._tool(tagged), len(tagged), len(passed)
            ))
        return ledger

    @staticmethod
    def _level(tagged: list[dict], passed: list[dict]) -> str:
        if any("e2e" in s["tags"] for s in passed):
            return "e2e"
        if any("service" in s["tags"] for s in passed):
            return "service"
        return "written_not_passing" if tagged else "none"

    @staticmethod
    def _tool(tagged: list[dict]) -> str:
        return "playwright" if any("e2e" in s["tags"] for s in tagged) else ("service" if tagged else "")

    def summary(self) -> dict[str, int]:
        counts = {level: 0 for level in ("e2e", "service", "written_not_passing", "none")}
        for proof in self.proofs:
            counts[proof.level] += 1
        return {**counts, "requirements": len(self.proofs)}


# ── the report ────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class CorpusStatement:
    """The line that makes a wrong report self-evident: which corpus, which suite, how much."""

    suite: str
    corpus_root: str
    requirements_traced: int
    scenarios: int

    def sentence(self) -> str:
        return (
            f"Headline coverage is the acceptance corpus <code>{html.escape(self.corpus_root)}</code>, "
            f"run by the <strong>{html.escape(self.suite)}</strong> suite: "
            f"{self.requirements_traced} requirements traced across {self.scenarios} scenarios."
        )


class ReportHtml:
    """Adds the corpus statement, the honest proof split and a muted tool tag per requirement."""

    def __init__(self, statement: CorpusStatement, ledger: ProofLedger) -> None:
        self.statement = statement
        self.ledger = ledger

    def apply(self, page: str) -> str:
        page = page.replace("<main>", f"<main>{self._section()}", 1)
        for proof in self.ledger.proofs:
            tag = f'<code class="req-id">{proof.requirement}</code>'
            page = page.replace(tag, f'{tag}{self._tool_tag(proof)}')
        return page.replace("</style>", f"{_STYLE}</style>", 1)

    def _section(self) -> str:
        counts = self.ledger.summary()
        return (
            '<section id="corpus" class="section"><h2 class="section-title">What this report describes</h2>'
            f'<div class="silver-line"></div><p class="corpus-line">{self.statement.sentence()}</p>'
            f'<p class="corpus-line">Of {counts["requirements"]} requirements: '
            f'<strong>{counts["e2e"]}</strong> proven end-to-end in a real browser · '
            f'<strong>{counts["service"]}</strong> proven at service level · '
            f'<strong>{counts["written_not_passing"]}</strong> written, nothing passing in this run · '
            f'<strong>{counts["none"]}</strong> with no scenario.</p></section>'
        )

    @staticmethod
    def _tool_tag(proof: RequirementProof) -> str:
        label = proof.tool or "none"
        return f'<span class="tool-tag" title="{html.escape(proof.hover)}">{label}</span>'


_STYLE = (
    ".corpus-line{margin:.4rem 0;line-height:1.5}"
    ".tool-tag{margin-left:.5rem;font-size:.7rem;opacity:.6;font-family:'DM Mono',monospace}"
)


@dataclass(frozen=True)
class GitState:
    commit: str
    branch: str
    dirty: bool

    @classmethod
    def read(cls) -> "GitState":
        return cls(_git("rev-parse", "HEAD") or "unknown", _git("rev-parse", "--abbrev-ref", "HEAD"), bool(_git("status", "--porcelain")))

    @property
    def short(self) -> str:
        return self.commit[:12]


def _git(*args: str) -> str:
    try:
        return subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


class FunctionalityReport:
    """Builds the report for one JUnit and writes it to the suite's `latest/` directory."""

    def __init__(self, junit: Path) -> None:
        self.junit = junit
        self.git = GitState.read()

    def build(self) -> Path:
        catalogue = PrdCatalogue()
        generate = load_toolkit(catalogue)
        features = read_features(generate)
        results = generate.JUnitParser().parse(self.junit)
        builder = generate.ReportBuilder(owner=OWNER, repo=REPO, release_tag=f"local-{self.git.short}", commit_sha=self.git.short)
        report = builder.build_executive_report(results, None, features)
        statuses = {c["name"]: c["status"] for s in results["suites"] for c in s["testcases"]}
        ledger = ProofLedger.build(catalogue, features, statuses, generate.JUnitParser.scenario_to_test_name)
        statement = CorpusStatement(corpus.SUITE, corpus.relative(corpus.FEATURE_ROOT), len(report["requirements"]),
                                    sum(len(f["scenarios"]) for f in features))
        self._annotate(report, ledger, statement)
        page = ReportHtml(statement, ledger).apply(builder.build_executive_html(report, features))
        return self._write(report, page, self._meta(report, statement, ledger))

    @staticmethod
    def _annotate(report: dict, ledger: ProofLedger, statement: CorpusStatement) -> None:
        by_id = {p.requirement: p for p in ledger.proofs}
        for entry in report["requirements"]:
            if entry["requirement_id"] in by_id:
                entry["proof"] = asdict(by_id[entry["requirement_id"]])
        report["summary"]["corpus"] = asdict(statement)
        report["summary"]["proof_levels"] = ledger.summary()

    def _meta(self, report: dict, statement: CorpusStatement, ledger: ProofLedger) -> dict:
        summary = report["summary"]
        return {
            "generated_at": report["generated_at"],
            "suite": corpus.SUITE,
            "corpus": asdict(statement),
            "commit": self.git.commit,
            "commit_short": self.git.short,
            "branch": self.git.branch,
            "worktree_dirty": self.git.dirty,
            "junit_xml": corpus.relative(self.junit),
            "junit_sha256": corpus.sha256_of(self.junit),
            **{k: summary[k] for k in ("overall_status", "total_scenarios", "passed", "failed", "skipped", "pass_rate")},
            "proof_levels": ledger.summary(),
        }

    @staticmethod
    def _write(report: dict, page: str, meta: dict) -> Path:
        out = corpus.REPORT_DIR
        out.mkdir(parents=True, exist_ok=True)
        (out / corpus.REPORT_JSON).write_text(json.dumps(report, indent=2), encoding="utf-8")
        (out / corpus.REPORT_HTML).write_text(page, encoding="utf-8")
        (out / corpus.REPORT_META).write_text(json.dumps(meta, indent=2), encoding="utf-8")
        return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Silverline functionality report for the acceptance suite.")
    parser.add_argument("--junit", type=Path, default=corpus.JUNIT, help="the run's JUnit XML")
    parser.add_argument("--soft-fail", action="store_true", help="always exit 0 — a report never changes a verdict")
    args = parser.parse_args(argv)
    try:
        if not args.junit.exists():
            raise FileNotFoundError(f"no JUnit XML at {args.junit}")
        written = FunctionalityReport(args.junit).build()
    except (Exception, SystemExit) as exc:  # noqa: BLE001 — soft-fail is the whole contract
        print(f"⚠ functionality report NOT generated — {exc}", file=sys.stderr)
        return 0 if args.soft_fail else 1
    meta = json.loads((written / corpus.REPORT_META).read_text())
    levels = meta["proof_levels"]
    print(f"✓ functionality report → {corpus.relative(written / corpus.REPORT_HTML)}")
    print(f"  headline corpus     → {meta['corpus']['corpus_root']} ({meta['corpus']['requirements_traced']} requirements, "
          f"{meta['corpus']['scenarios']} scenarios) · run by the {meta['suite']} suite")
    print(f"  proof level         → {levels['e2e']} proven end-to-end · {levels['service']} proven at service level · "
          f"{levels['written_not_passing']} written, nothing passing · {levels['none']} with no scenario")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
