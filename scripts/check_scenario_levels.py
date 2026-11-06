#!/usr/bin/env python3
"""
file: scripts/check_scenario_levels.py
author: Stephen Boyett

description:
    Lint for the acceptance corpus's tags. Every scenario claims exactly one tier (@e2e or @service);
    an @e2e scenario names exactly one surface (@web), and @service names none. Every scenario also
    carries an @FR_<EENN> and an @story_<E>_<N> tag, and every epic file a @feature_F_<NNN> tag.
    The report reads proof levels off these tags, so a wrong one overclaims to the client.

See Also:
    test/acceptance/corpus.py
    test/acceptance/CLAUDE.md

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "test/acceptance"))

import corpus  # noqa: E402

TIERS = ("e2e", "service")
#: This project ships a website only; a phone is the @web surface at a phone-sized viewport.
SURFACES = ("web",)
FOREIGN_SURFACES = ("mobile", "api")
_REQUIREMENT = re.compile(r"^N?FR_\d{4}$")
_STORY = re.compile(r"^story_\d+_\d+$")
_FEATURE = re.compile(r"^feature_F_\d{3}$")


@dataclass(frozen=True)
class Finding:
    where: str
    title: str
    tags: tuple[str, ...]
    reason: str


def level_verdict(tags: tuple[str, ...]) -> str:
    """Why a scenario's level claim cannot hold, or '' when it can."""
    tiers = [t for t in TIERS if t in tags]
    surfaces = [s for s in SURFACES + FOREIGN_SURFACES if s in tags]
    if len(tiers) != 1:
        return f"claims {len(tiers)} tiers — exactly one of @e2e or @service"
    if foreign := [s for s in surfaces if s in FOREIGN_SURFACES]:
        return f"names @{foreign[0]}, a surface this project does not have — @web is the only one"
    if tiers == ["service"] and surfaces:
        return "is @service yet names a surface — @service means no screen can observe it"
    if tiers == ["e2e"] and len(surfaces) != 1:
        return f"is @e2e with {len(surfaces)} surfaces — it needs exactly @web"
    return ""


def traceability_verdict(tags: tuple[str, ...]) -> str:
    if not any(_REQUIREMENT.match(t) for t in tags):
        return "has no @FR_<EENN> tag (underscores, not hyphens)"
    if not any(_STORY.match(t) for t in tags):
        return "has no @story_<E>_<N> tag"
    return ""


def findings() -> tuple[list[Finding], int]:
    found: list[Finding] = []
    scanned = 0
    for feature_file in corpus.feature_files():
        where = corpus.relative(feature_file.path)
        if feature_file.path.name.startswith("epic-") and not any(_FEATURE.match(t) for t in feature_file.feature_tags):
            found.append(Finding(where, "(Feature line)", feature_file.feature_tags, "has no @feature_F_<NNN> tag"))
        for scenario in feature_file.scenarios():
            scanned += 1
            reason = level_verdict(scenario.tags) or traceability_verdict(scenario.tags)
            if reason:
                found.append(Finding(f"{where}:{scenario.line}", scenario.title, scenario.tags, reason))
    return found, scanned


def main() -> int:
    found, scanned = findings()
    if not scanned:
        print(f"✗ no scenarios under {corpus.relative(corpus.FEATURE_ROOT)}", file=sys.stderr)
        return 2
    if not found:
        print(f"✓ scenario levels: all {scanned} scenarios claim one tier, the right surface, an FR and a story.")
        return 0
    print(f"✗ scenario levels: {len(found)} problem(s) across {scanned} scenarios.\n")
    for finding in found:
        print(f"  {finding.where}\n      Scenario: {finding.title}\n      tags: "
              f"{' '.join('@' + t for t in finding.tags)}\n      → {finding.reason}\n")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
