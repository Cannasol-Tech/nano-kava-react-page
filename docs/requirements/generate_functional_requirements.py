"""
file: docs/requirements/generate_functional_requirements.py
author: Stephen Boyett

description:
    Renders functional-requirements.html, the branded Internal Engineering Reference. FEATURES is
    parsed from the PRD on every run, so it cannot drift from it; each FR's Planned / Implemented /
    Tested state comes from the RTM, which the page links to rather than copies. Stdlib only.

See Also:
    _bmad-output/planning-artifacts/PRD.md
    docs/REQUIREMENTS_TRACEABILITY_MATRIX.md
    docs/requirements/README.md

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from __future__ import annotations

import base64
import html
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import date
from enum import Enum
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
PRD_PATH = REPO_ROOT / "_bmad-output" / "planning-artifacts" / "PRD.md"
RTM_PATH = REPO_ROOT / "docs" / "REQUIREMENTS_TRACEABILITY_MATRIX.md"
OUT_PATH = HERE / "functional-requirements.html"
LOGO_ON_DARK = HERE / "assets" / "cannasol-logo-white.png"
LOGO_ON_LIGHT = HERE / "assets" / "cannasol-logo.png"
REGENERATE_COMMAND = "python3 docs/requirements/generate_functional_requirements.py"
COMPANY = "Cannasol Technologies LLC"
HEX_PATH = "M12 1.6 21 6.8v10.4L12 22.4 3 17.2V6.8z"


class RequirementsDocError(Exception):
    """An input problem that must stop generation rather than ship a wrong page."""


class MissingInputError(RequirementsDocError):
    pass


class PrdFormatError(RequirementsDocError):
    pass


class RtmFormatError(RequirementsDocError):
    pass


class State(Enum):
    # Declared in ascending order of proof; furthest() relies on it.
    PLANNED = "Planned"
    IMPLEMENTED = "Implemented"
    TESTED = "Tested"

    @property
    def css(self) -> str:
        return self.name.lower()

    @property
    def meaning(self) -> str:
        return STATE_MEANINGS[self]

    @classmethod
    def from_label(cls, label: str) -> State:
        word = re.sub(r"[^a-z]", "", label.lower())
        for state in cls:
            if state.value.lower() == word:
                return state
        raise ValueError(f"unknown Status {label!r}; expected one of {', '.join(s.value for s in cls)}")

    @classmethod
    def furthest(cls, first: State, second: State) -> State:
        order = list(cls)
        return max(first, second, key=order.index)


STATE_MEANINGS = {
    State.TESTED: "A passing acceptance scenario proves it.",
    State.IMPLEMENTED: "Built, but no acceptance scenario proves it yet.",
    State.PLANNED: "Specified. Not yet traced to built code.",
}
DISPLAY_ORDER = (State.TESTED, State.IMPLEMENTED, State.PLANNED)


@dataclass(frozen=True)
class Requirement:
    id: str
    text: str
    state: State

    @property
    def digits(self) -> str:
        return self.id.removeprefix("FR-")

    @property
    def tag(self) -> str:
        return f"@FR_{self.digits}"

    @property
    def anchor(self) -> str:
        return f"fr-{self.digits}"

    @property
    def sequence(self) -> str:
        return self.digits[2:]

    @property
    def feature_number(self) -> int:
        return int(self.digits[:2])


@dataclass(frozen=True)
class Feature:
    number: int
    name: str
    requirements: tuple[Requirement, ...]

    @property
    def code(self) -> str:
        return f"F-{self.number:03d}"

    @property
    def anchor(self) -> str:
        return f"f-{self.number:03d}"

    def count(self, state: State) -> int:
        return sum(requirement.state is state for requirement in self.requirements)


def table_cells(line: str) -> list[str] | None:
    """Cells of a Markdown table row, or None when the line is not one."""
    stripped = line.strip()
    if not stripped.startswith("|"):
        return None
    return [cell.strip() for cell in re.split(r"(?<!\\)\|", stripped.strip("|"))]


class RtmParser:
    """Reads the RTM's FR table; any other table in the file is ignored."""

    REQUIREMENT_HEADER = "PRD Requirement"
    STATUS_HEADER = "Status"
    _FR_CELL = re.compile(r"^`(FR-\d{4})`")
    _SEPARATOR_CELL = re.compile(r"^:?-{3,}:?$")

    def parse(self, text: str) -> dict[str, State]:
        states: dict[str, State] = {}
        status_column: int | None = None
        for number, line in enumerate(text.splitlines(), start=1):
            cells = table_cells(line)
            if cells is None:
                status_column = None
            elif status_column is None:
                status_column = self._status_column(cells)
            elif not self._is_separator(cells):
                self._record(states, cells, status_column, number)
        return states

    def _status_column(self, cells: list[str]) -> int | None:
        if cells[0] == self.REQUIREMENT_HEADER and self.STATUS_HEADER in cells:
            return cells.index(self.STATUS_HEADER)
        return None

    def _is_separator(self, cells: list[str]) -> bool:
        return all(self._SEPARATOR_CELL.match(cell) for cell in cells)

    def _record(self, states: dict[str, State], cells: list[str], status_column: int, line: int) -> None:
        match = self._FR_CELL.match(cells[0])
        if not match:
            return
        if status_column >= len(cells):
            raise RtmFormatError(f"{RTM_PATH.name} line {line}: row has no Status cell")
        try:
            state = State.from_label(cells[status_column])
        except ValueError as error:
            raise RtmFormatError(f"{RTM_PATH.name} line {line}: {error}") from error
        fr_id = match.group(1)
        states[fr_id] = State.furthest(states.get(fr_id, State.PLANNED), state)


class StateLedger:
    """FR id to its furthest RTM state; an FR the matrix does not list is Planned."""

    def __init__(self, states: dict[str, State], source: Path | None):
        self._states = states
        self.source = source

    @classmethod
    def read(cls, path: Path) -> StateLedger:
        if not path.exists():
            return cls({}, None)
        return cls(RtmParser().parse(path.read_text(encoding="utf-8")), path)

    @property
    def is_present(self) -> bool:
        return self.source is not None

    def state_of(self, fr_id: str) -> State:
        return self._states.get(fr_id, State.PLANNED)

    def ids_missing_from(self, known_ids: set[str]) -> list[str]:
        return sorted(set(self._states) - known_ids)


class PrdParser:
    """Derives FEATURES from the PRD's Functional Requirements section."""

    _SECTION = re.compile(r"^## Functional Requirements[ \t]*$(.*?)(?=^## |\Z)", re.M | re.S)
    _HEADING = re.compile(r"^### F-(\d{3})\s+[—–-]\s+(.+?)[ \t]*$", re.M)
    _BULLET = re.compile(r"^- \*\*(FR-\d{4})\*\*\s+[—–-]\s+(.+?)(?=^\S|\Z)", re.M | re.S)

    def __init__(self, ledger: StateLedger):
        self._ledger = ledger

    def parse(self, prd_text: str) -> list[Feature]:
        blocks = self._feature_blocks(self._section(prd_text))
        features = sorted((self._feature(heading, body) for heading, body in blocks), key=lambda f: f.number)
        self._reject_duplicates(features)
        return features

    def _section(self, prd_text: str) -> str:
        match = self._SECTION.search(prd_text)
        if not match:
            raise PrdFormatError(f"{PRD_PATH.name} has no '## Functional Requirements' section")
        return match.group(1)

    def _feature_blocks(self, section: str) -> list[tuple[re.Match[str], str]]:
        headings = list(self._HEADING.finditer(section))
        if not headings:
            raise PrdFormatError(f"{PRD_PATH.name} has no '### F-NNN — <Feature Name>' headings")
        ends = [heading.start() for heading in headings[1:]] + [len(section)]
        return [(heading, section[heading.end():end]) for heading, end in zip(headings, ends)]

    def _feature(self, heading: re.Match[str], body: str) -> Feature:
        number, name = int(heading.group(1)), heading.group(2)
        requirements = tuple(self._requirement(bullet, number) for bullet in self._BULLET.finditer(body))
        if not requirements:
            raise PrdFormatError(f"F-{number:03d} has no '- **FR-NNNN** — <text>' bullets")
        return Feature(number, name, requirements)

    def _requirement(self, bullet: re.Match[str], feature_number: int) -> Requirement:
        fr_id = bullet.group(1)
        requirement = Requirement(fr_id, " ".join(bullet.group(2).split()), self._ledger.state_of(fr_id))
        if requirement.feature_number != feature_number:
            raise PrdFormatError(f"{fr_id} sits under F-{feature_number:03d} but its id names Feature {requirement.feature_number}")
        return requirement

    @staticmethod
    def _reject_duplicates(features: list[Feature]) -> None:
        counts = Counter(requirement.id for feature in features for requirement in feature.requirements)
        duplicates = sorted(fr_id for fr_id, seen in counts.items() if seen > 1)
        if duplicates:
            raise PrdFormatError(f"duplicate FR ids in {PRD_PATH.name}: {', '.join(duplicates)}")


def load_features(ledger: StateLedger) -> list[Feature]:
    """FEATURES, the FR single source of truth, read fresh from the PRD."""
    if not PRD_PATH.exists():
        raise MissingInputError(f"PRD not found at {PRD_PATH}")
    return PrdParser(ledger).parse(PRD_PATH.read_text(encoding="utf-8"))


@dataclass(frozen=True)
class Brand:
    logo_on_dark: str
    logo_on_light: str

    @classmethod
    def load(cls) -> Brand:
        return cls(png_data_uri(LOGO_ON_DARK), png_data_uri(LOGO_ON_LIGHT))


def png_data_uri(path: Path) -> str:
    if not path.exists():
        raise MissingInputError(f"logo missing at {path}; copy it from public/")
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def esc(text: str) -> str:
    return html.escape(text, quote=True)


def render_inline(markdown: str) -> str:
    """The PRD's inline `code` and **bold** spans as HTML; everything else escaped."""
    pieces = re.split(r"`([^`]+)`", markdown)
    return "".join(f"<code>{esc(p)}</code>" if i % 2 else _bold(esc(p)) for i, p in enumerate(pieces))


def _bold(escaped: str) -> str:
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)


def plain_text(markdown: str) -> str:
    return re.sub(r"[`*]", "", markdown)


def relative_link(target: Path) -> str:
    return Path(os.path.relpath(target, OUT_PATH.parent)).as_posix()


def repo_path(target: Path) -> str:
    return target.relative_to(REPO_ROOT).as_posix()


def plural(count: int, noun: str) -> str:
    return f"{count} {noun}{'' if count == 1 else 's'}"


def glyph(state: State) -> str:
    return f'<svg class="glyph glyph--{state.css}" viewBox="0 0 24 24" aria-hidden="true"><path d="{HEX_PATH}"/></svg>'


def state_breakdown(feature: Feature) -> str:
    parts = [f"{feature.count(s)} {s.value.lower()}" for s in DISPLAY_ORDER if feature.count(s)]
    return ", ".join(parts)


def render_state_bar(feature: Feature) -> str:
    total = len(feature.requirements)
    segments = "".join(
        f'<span class="seg seg--{s.css}" style="width:{feature.count(s) / total * 100:.2f}%"></span>'
        for s in DISPLAY_ORDER if feature.count(s)
    )
    return f'<span class="bar" role="img" aria-label="{esc(state_breakdown(feature))}">{segments}</span>'


def render_nav_item(feature: Feature) -> str:
    return f"""
      <a class="nav-item" href="#{feature.anchor}">
        <span class="nav-code">{feature.code}</span>
        <span class="nav-count">{len(feature.requirements)}</span>
        <span class="nav-name">{esc(feature.name)}</span>
        {render_state_bar(feature)}
      </a>"""


def render_cell(requirement: Requirement, index: int) -> str:
    label = f"{requirement.id}, {requirement.state.value}"
    return (f'<a class="cell cell--{requirement.state.css}" href="#{requirement.anchor}" style="--i:{index}" '
            f'title="{esc(label)}" aria-label="{esc(label)}"><span>{requirement.sequence}</span></a>')


def render_cluster(feature: Feature, first_index: int) -> str:
    cells = "".join(render_cell(r, first_index + n) for n, r in enumerate(feature.requirements))
    return f"""
        <div class="cluster">
          <a class="cluster-head" href="#{feature.anchor}"><span class="cluster-code">{feature.code}</span>{esc(feature.name)}</a>
          <div class="chain">{cells}</div>
        </div>"""


def render_requirement(requirement: Requirement, feature: Feature) -> str:
    search = " ".join([requirement.id, requirement.tag, feature.code, feature.name, plain_text(requirement.text)])
    state = requirement.state
    return f"""
          <li class="fr" id="{requirement.anchor}" data-state="{state.css}" data-search="{esc(search.lower())}">
            <a class="fr-id" href="#{requirement.anchor}">{requirement.id}</a>
            <p class="fr-text">{render_inline(requirement.text)}</p>
            <button class="fr-tag" type="button" data-tag="{requirement.tag}" aria-label="Copy test tag {requirement.tag}">{requirement.tag}</button>
            <span class="state state--{state.css}">{glyph(state)}{state.value}</span>
          </li>"""


def render_feature(feature: Feature) -> str:
    rows = "".join(render_requirement(r, feature) for r in feature.requirements)
    return f"""
      <section class="feature" id="{feature.anchor}" aria-labelledby="{feature.anchor}-title">
        <header class="feature-head">
          <div>
            <p class="feature-code">{feature.code}</p>
            <h2 id="{feature.anchor}-title">{esc(feature.name)}</h2>
          </div>
          <div class="feature-summary">
            <p><strong>{plural(len(feature.requirements), 'requirement')}</strong> {esc(state_breakdown(feature))}</p>
            {render_state_bar(feature)}
          </div>
        </header>
        <ol class="fr-list">{rows}
        </ol>
      </section>"""


def render_legend_item(state: State, count: int) -> str:
    return f"""
          <div class="legend-item">
            {glyph(state)}
            <p class="legend-name">{state.value} <span class="legend-count">{count}</span></p>
            <p class="legend-meaning">{state.meaning}</p>
          </div>"""


def render_filter(state: State) -> str:
    return (f'<button class="filter" type="button" data-filter="{state.css}" aria-pressed="true">'
            f'{glyph(state)}{state.value}</button>')


class ReferencePage:
    """The whole self-contained HTML document for one generation run."""

    def __init__(self, features: list[Feature], ledger: StateLedger, brand: Brand, generated_on: date):
        self._features = features
        self._ledger = ledger
        self._brand = brand
        self._generated_on = generated_on
        self._totals = Counter(r.state for f in features for r in f.requirements)
        self._total = sum(self._totals.values())

    def html(self) -> str:
        return f"""<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nano Kava functional requirements</title>
<meta name="description" content="Internal Engineering Reference: every functional requirement of the Nano Kava landing page at enjoynano.com, by feature, with its test state.">
<meta name="robots" content="noindex">
<link rel="icon" href="{self._brand.logo_on_light}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&family=Sora:wght@500;600&display=swap">
<script>try{{var t=localStorage.getItem("fr-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}}catch(e){{}}</script>
<style>{CSS}</style>
<style>:root{{--logo:url("{self._brand.logo_on_dark}")}}:root[data-theme="light"]{{--logo:url("{self._brand.logo_on_light}")}}</style>
</head>
<body>
{self._topbar()}
<div class="scrim" id="scrim" hidden></div>
{self._sidebar()}
<main class="main" id="top">
  <div class="content">
    {self._hero()}
    {''.join(render_feature(f) for f in self._features)}
    <div class="empty" id="fr-empty" hidden>
      <p>No requirement matches this search with the states you have switched on.</p>
      <button class="empty-reset" id="fr-reset" type="button">Show all requirements</button>
    </div>
    {self._colophon()}
  </div>
</main>
<p class="visually-hidden" id="fr-announce" aria-live="polite"></p>
<script>{JS}</script>
</body>
</html>
"""

    def _topbar(self) -> str:
        return """<header class="topbar">
  <button class="menu" id="menu" type="button" aria-controls="sidebar" aria-expanded="false" aria-label="Open the feature index">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
  </button>
  <span class="logo logo--small" role="img" aria-label="Cannasol Technologies"></span>
  <span class="topbar-title">Functional requirements</span>
</header>"""

    def _sidebar(self) -> str:
        filters = "".join(render_filter(s) for s in DISPLAY_ORDER)
        nav = "".join(render_nav_item(f) for f in self._features)
        return f"""<aside class="sidebar" id="sidebar" aria-label="Feature index">
  <a class="brand" href="#top">
    <span class="logo" role="img" aria-label="Cannasol Technologies"></span>
    <span class="brand-text"><span class="brand-name">Cannasol Technologies</span><span class="brand-product">Nano Kava landing page</span></span>
  </a>
  <div class="tools">
    <label class="search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>
      <span class="visually-hidden">Search requirements</span>
      <input id="fr-search" type="search" placeholder="Search requirements" autocomplete="off" spellcheck="false">
      <kbd aria-hidden="true">/</kbd>
    </label>
    <div class="filters" role="group" aria-label="Show requirements in these states">{filters}</div>
    <p class="result-status" id="fr-status">Showing all {self._total} requirements</p>
  </div>
  <nav class="nav" aria-label="Features">{nav}
  </nav>
  <div class="sidebar-foot">
    <button class="theme-toggle" id="theme-toggle" type="button">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>
      <span>Light theme</span>
    </button>
    <span class="generated">Generated<span>{self._generated_label()}</span></span>
  </div>
</aside>"""

    def _hero(self) -> str:
        clusters, index = [], 0
        for feature in self._features:
            clusters.append(render_cluster(feature, index))
            index += len(feature.requirements)
        legend = "".join(render_legend_item(s, self._totals[s]) for s in DISPLAY_ORDER)
        return f"""<header class="hero">
      <h1>Functional requirements</h1>
      <p class="subtitle">Internal Engineering Reference for the Nano Kava landing page</p>
      <p class="lead">Everything enjoynano.com has to do, grouped by feature. {plural(self._total, 'requirement')} across
        {plural(len(self._features), 'feature')}, each with the tag its acceptance scenarios carry and the furthest state the
        traceability matrix records for it.</p>
      <div class="map">
        <div class="clusters">{''.join(clusters)}
        </div>
        <div class="legend">{legend}
        </div>
        <p class="map-caption">Each hexagon is one requirement, numbered within its feature. Select one to jump to it.</p>
      </div>
      {self._rtm_note()}
    </header>"""

    def _rtm_note(self) -> str:
        link = f'<a href="{relative_link(RTM_PATH)}">Requirements Traceability Matrix</a>'
        path = f"<code>{repo_path(RTM_PATH)}</code>"
        tags = ("The tag on each row, such as <code>@FR_0101</code>, is the literal tag in the <code>.feature</code> "
                "files, written with underscores. Select a tag to copy it.")
        if self._ledger.is_present:
            source = (f"State comes from the {link} ({path}), which this page references rather than copies. Open it "
                      f"for the scenario and step file behind each state. An FR on several rows takes its furthest "
                      f"state, and an FR the matrix does not list is Planned.")
        else:
            source = (f"State comes from the {link} at {path}. It did not exist when this page was generated, so every "
                      f"requirement shows as Planned. Run the generator again once it does.")
        return f"""<div class="note">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v5.5M12 7.6v.1"/></svg>
        <div><p>{source}</p><p>{tags}</p></div>
      </div>"""

    def _colophon(self) -> str:
        return f"""<footer class="colophon">
      <p>Generated {self._generated_label()} from <a href="{relative_link(PRD_PATH)}"><code>{repo_path(PRD_PATH)}</code></a>,
        which owns the requirement text. A feature's number is its epic number. After any change to the PRD or the matrix,
        regenerate with <code>{REGENERATE_COMMAND}</code>.</p>
      <p>Copyright © {self._generated_on.year} {COMPANY}. All Rights Reserved.</p>
    </footer>"""

    def _generated_label(self) -> str:
        return f"{self._generated_on.day} {self._generated_on:%B %Y}"


CSS = """
:root{
  color-scheme:dark;
  --ground:#0f172a;--sidebar:#0c1426;--panel:#131d33;--raised:#1a2640;
  --line:#25324f;--line-soft:#1c2843;
  --ink:#e9eef6;--ink-2:#b5c1d4;--ink-3:#8696ae;
  --green:#2ECC71;--teal:#17A2B8;--on-fill:#0f172a;
  --tested:#2ECC71;--tested-ink:#52dc8c;--tested-wash:rgba(46,204,113,.12);
  --implemented:#17A2B8;--implemented-ink:#4cc7db;--implemented-wash:rgba(23,162,184,.14);
  --planned:#5d6d88;--planned-ink:#a8b5c9;
  --focus:#f1f5f9;
  --shadow:0 20px 40px -28px rgba(0,0,0,.75);
  --sidebar-w:296px;
  --font-display:"Sora",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --font-body:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --font-code:"JetBrains Mono","SF Mono",ui-monospace,Menlo,Consolas,monospace;
}
:root[data-theme="light"]{
  color-scheme:light;
  --ground:#f5f7fa;--sidebar:#edf1f6;--panel:#ffffff;--raised:#f1f5f9;
  --line:#d7dfea;--line-soft:#e6ebf2;
  --ink:#0f172a;--ink-2:#334155;--ink-3:#5a6a80;
  --tested-ink:#137a3e;--tested-wash:rgba(46,204,113,.14);
  --implemented-ink:#0b6f80;--implemented-wash:rgba(23,162,184,.12);
  --planned:#9aa8bb;--planned-ink:#4b5a70;
  --focus:#0f172a;
  --shadow:0 18px 36px -26px rgba(15,23,42,.35);
}
*,*::before,*::after{box-sizing:border-box}
[hidden]{display:none!important}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--ground);color:var(--ink);font:400 15px/1.6 var(--font-body);-webkit-font-smoothing:antialiased}
a{color:inherit}
p{margin:0}
code{font-family:var(--font-code);font-size:.84em;padding:.1em .38em;border-radius:5px;background:var(--raised);border:1px solid var(--line-soft);overflow-wrap:anywhere}
button{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:6px}
.visually-hidden{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.logo{display:block;flex:none;width:40px;height:35px;background:var(--logo) center/contain no-repeat}
.logo--small{width:30px;height:26px}

.sidebar{position:fixed;inset:0 auto 0 0;width:var(--sidebar-w);display:flex;flex-direction:column;background:var(--sidebar);border-right:1px solid var(--line);z-index:30}
.brand{display:flex;align-items:center;gap:12px;padding:22px 22px 18px;text-decoration:none}
.brand-name{display:block;font:600 15px/1.25 var(--font-display);letter-spacing:-.01em}
.brand-product{display:block;font-size:12.5px;color:var(--ink-3)}
.tools{padding:2px 16px 14px;border-bottom:1px solid var(--line-soft)}
.search{position:relative;display:block}
.search svg{position:absolute;left:11px;top:50%;width:16px;height:16px;transform:translateY(-50%);fill:none;stroke:var(--ink-3);stroke-width:2;stroke-linecap:round}
.search input{width:100%;height:38px;padding:0 34px;border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--ink);font:400 13.5px var(--font-body);-webkit-appearance:none;appearance:none}
.search input::placeholder{color:var(--ink-3)}
.search input:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(23,162,184,.22)}
.search kbd{position:absolute;right:9px;top:50%;transform:translateY(-50%);font:500 11px/18px var(--font-code);color:var(--ink-3);border:1px solid var(--line);border-radius:4px;padding:0 5px}
.filters{display:flex;gap:6px;margin-top:10px}
.filter{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 4px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink-3);font-size:12px;font-weight:500;cursor:pointer}
.filter[aria-pressed="true"]{background:var(--panel);color:var(--ink)}
.filter[aria-pressed="false"]{text-decoration:line-through;opacity:.6}
.result-status{margin-top:10px;font-size:12px;color:var(--ink-3)}
.glyph{width:11px;height:11px;flex:none}
.glyph--tested{fill:var(--tested)}
.glyph--implemented{fill:var(--implemented)}
.glyph--planned{fill:none;stroke:var(--planned-ink);stroke-width:2.6}

.nav{flex:1;overflow-y:auto;padding:12px 10px 16px}
.nav-item{display:grid;grid-template-columns:1fr auto;gap:3px 10px;padding:11px 12px 12px;margin-bottom:2px;border-radius:10px;border:1px solid transparent;text-decoration:none;color:var(--ink-2)}
.nav-item:hover{background:var(--panel)}
.nav-item[aria-current="true"]{background:var(--panel);border-color:var(--line);color:var(--ink);box-shadow:inset 3px 0 0 var(--green)}
.nav-item.is-dim{opacity:.4}
.nav-code{font:500 11.5px/1.5 var(--font-code);color:var(--ink-3)}
.nav-count{font-size:12px;color:var(--ink-3);font-variant-numeric:tabular-nums}
.nav-name{grid-column:1/-1;font-size:13.5px;font-weight:500;line-height:1.35}
.nav-item .bar{grid-column:1/-1;margin-top:6px}
.bar{display:flex;width:100%;height:4px;border-radius:2px;overflow:hidden;background:var(--line-soft)}
.seg{display:block;height:100%}
.seg--tested{background:var(--tested)}
.seg--implemented{background:var(--implemented)}
.seg--planned{background:repeating-linear-gradient(135deg,var(--planned) 0 2px,transparent 2px 5px)}
.sidebar-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-top:1px solid var(--line-soft)}
.theme-toggle{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:transparent;font-size:12px;color:var(--ink-2);white-space:nowrap;cursor:pointer}
.theme-toggle:hover{background:var(--panel)}
.theme-toggle svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
.generated{font-size:11.5px;line-height:1.35;color:var(--ink-3);text-align:right}
.generated span{display:block;color:var(--ink-2)}

.main{margin-left:var(--sidebar-w)}
.content{max-width:960px;margin:0 auto;padding:64px 56px 88px}
.hero{padding-bottom:16px}
.hero h1{margin:0;font:600 clamp(36px,5vw,54px)/1.04 var(--font-display);letter-spacing:-.035em}
.subtitle{margin-top:12px;font:500 17px/1.4 var(--font-display);color:var(--ink-2);letter-spacing:-.01em}
.lead{margin-top:18px;max-width:62ch;font-size:16px;line-height:1.65;color:var(--ink-2)}

.map{margin-top:36px;padding:28px 28px 22px;border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:var(--shadow)}
.clusters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px 36px}
.cluster{min-width:0}
.cluster-head{display:flex;align-items:baseline;gap:9px;margin-bottom:12px;font-size:13.5px;font-weight:500;color:var(--ink-2);text-decoration:none}
.cluster-head:hover{color:var(--ink)}
.cluster-code{font:500 11.5px var(--font-code);color:var(--ink-3)}
.chain{--hw:46px;--hh:calc(var(--hw) * 1.1547);display:flex;align-items:flex-start}
.cell{--stroke:var(--planned);--fill:var(--panel);position:relative;flex:none;display:grid;place-items:center;width:var(--hw);height:var(--hh);background:var(--stroke);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);text-decoration:none;color:var(--planned-ink);font:600 12.5px var(--font-code);transition:transform .16s ease,opacity .2s ease}
.cell::before{content:"";position:absolute;inset:2px;background:var(--fill);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}
.cell span{position:relative}
.cell+.cell{margin-left:calc(var(--hw) * -.5 + 3px)}
.cell:nth-child(even){margin-top:calc(var(--hh) * .75 + 2px)}
.cell--tested{--stroke:var(--tested);--fill:var(--tested);color:var(--on-fill)}
.cell--implemented{--stroke:var(--implemented);--fill:var(--implemented);color:var(--on-fill)}
.cell:hover{transform:translateY(-2px)}
.cell:focus-visible{outline:none;--stroke:var(--focus)}
.cell:focus-visible::before{inset:3px}
.cell.is-dim{opacity:.2}
.legend{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 24px;margin-top:26px;padding-top:20px;border-top:1px solid var(--line-soft)}
.legend-item{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:2px 9px}
.legend-item .glyph{width:13px;height:13px}
.legend-name{font-size:14px;font-weight:600}
.legend-count{margin-left:4px;font-weight:500;color:var(--ink-3);font-variant-numeric:tabular-nums}
.legend-meaning{grid-column:2;font-size:12.5px;line-height:1.45;color:var(--ink-3)}
.map-caption{margin-top:18px;font-size:12.5px;color:var(--ink-3)}

.note{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;margin-top:20px;padding:16px 18px;border:1px solid var(--line-soft);border-radius:12px;font-size:13.5px;line-height:1.6;color:var(--ink-2)}
.note svg{width:18px;height:18px;margin-top:2px;fill:none;stroke:var(--teal);stroke-width:1.8;stroke-linecap:round}
.note p+p{margin-top:8px}
.note a{color:var(--implemented-ink);text-underline-offset:2px}

.feature{padding-top:60px;scroll-margin-top:24px}
.feature-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,220px);align-items:end;gap:10px 28px;margin-bottom:18px}
.feature-code{font:500 12.5px var(--font-code);color:var(--ink-3)}
.feature-head h2{margin:4px 0 0;font:600 26px/1.18 var(--font-display);letter-spacing:-.022em}
.feature-summary p{margin-bottom:8px;font-size:12.5px;color:var(--ink-3)}
.feature-summary strong{display:block;font-size:13.5px;font-weight:600;color:var(--ink-2)}
.fr-list{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:14px;background:var(--panel);box-shadow:var(--shadow);overflow:hidden}
.fr{display:grid;grid-template-columns:5.6rem minmax(0,1fr) auto;grid-template-areas:"id text state" "id tag state";gap:8px 18px;padding:17px 20px;scroll-margin-top:24px}
.fr:not([hidden])~.fr{border-top:1px solid var(--line-soft)}
.fr:target{background:var(--raised);box-shadow:inset 3px 0 0 var(--teal)}
.fr-id{grid-area:id;padding-top:1px;font:600 13px/1.6 var(--font-code);color:var(--ink);text-decoration:none;white-space:nowrap}
.fr-id:hover{color:var(--implemented-ink)}
.fr-text{grid-area:text;max-width:68ch;font-size:15px;line-height:1.6}
.fr-tag{grid-area:tag;justify-self:start;position:relative;padding:1px 7px;border:1px solid var(--line-soft);border-radius:6px;background:transparent;font:500 11.5px/1.7 var(--font-code);color:var(--ink-3);cursor:copy}
.fr-tag:hover{color:var(--ink-2);border-color:var(--line)}
.fr-tag[data-note]::after{content:attr(data-note);position:absolute;left:calc(100% + 8px);top:50%;transform:translateY(-50%);font:500 11.5px var(--font-body);color:var(--tested-ink);white-space:nowrap}
.state{grid-area:state;align-self:start;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
.state--tested{background:var(--tested-wash);color:var(--tested-ink)}
.state--implemented{background:var(--implemented-wash);color:var(--implemented-ink)}
.state--planned{border:1px solid var(--line);color:var(--planned-ink)}

.empty{margin-top:48px;padding:36px 24px;border:1px dashed var(--line);border-radius:14px;text-align:center;color:var(--ink-2)}
.empty-reset{margin-top:14px;height:34px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:var(--panel);font-size:13px;font-weight:500;cursor:pointer}
.colophon{margin-top:72px;padding-top:24px;border-top:1px solid var(--line-soft);font-size:12.5px;line-height:1.7;color:var(--ink-3)}
.colophon p+p{margin-top:8px}
.colophon a{color:inherit}

.topbar{display:none}
.scrim{position:fixed;inset:0;z-index:25;background:rgba(2,6,23,.55)}

@media (prefers-reduced-motion:no-preference){
  .cell{animation:cell-in .5s cubic-bezier(.2,.75,.25,1) backwards;animation-delay:calc(var(--i) * 32ms + 120ms)}
  @keyframes cell-in{from{opacity:0;transform:scale(.6)}}
}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{transition:none!important}
}
@media (max-width:960px){
  .sidebar{width:min(320px,86vw);transform:translateX(-100%);transition:transform .22s ease;visibility:hidden}
  .nav-open .sidebar{transform:none;visibility:visible;box-shadow:0 0 48px rgba(2,6,23,.5)}
  .main{margin-left:0}
  .topbar{display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:20;height:56px;padding:0 16px;background:var(--ground);border-bottom:1px solid var(--line-soft)}
  .topbar-title{font:600 15px var(--font-display);letter-spacing:-.01em}
  .menu{display:grid;place-items:center;width:38px;height:38px;border:1px solid var(--line);border-radius:9px;background:var(--panel);cursor:pointer}
  .menu svg{width:18px;height:18px;fill:none;stroke:var(--ink);stroke-width:2;stroke-linecap:round}
  .content{padding:36px 24px 72px}
  .feature,.fr{scroll-margin-top:72px}
}
@media (max-width:640px){
  .content{padding:28px 16px 64px}
  .map{padding:20px 16px 18px;border-radius:14px}
  .clusters{grid-template-columns:minmax(0,1fr);gap:22px}
  .chain{--hw:40px}
  .legend{grid-template-columns:minmax(0,1fr)}
  .feature{padding-top:48px}
  .feature-head{grid-template-columns:minmax(0,1fr)}
  .feature-head h2{font-size:22px}
  .fr{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"id state" "text text" "tag tag";padding:15px 16px}
}
@media print{
  .sidebar,.topbar,.scrim,.empty{display:none!important}
  .main{margin-left:0}
  .content{padding:0;max-width:none}
  .map,.fr-list{box-shadow:none}
  .fr,.feature-head{break-inside:avoid}
}
"""

JS = """
(function () {
  var doc = document, root = doc.documentElement, body = doc.body;
  var search = doc.getElementById("fr-search");
  var status = doc.getElementById("fr-status");
  var announce = doc.getElementById("fr-announce");
  var empty = doc.getElementById("fr-empty");
  var menu = doc.getElementById("menu");
  var scrim = doc.getElementById("scrim");
  var toggle = doc.getElementById("theme-toggle");
  var filters = toArray(doc.querySelectorAll("[data-filter]"));
  var rows = toArray(doc.querySelectorAll(".fr"));
  var sections = toArray(doc.querySelectorAll(".feature"));
  var navLinks = toArray(doc.querySelectorAll(".nav-item"));
  var shownStates = { tested: true, implemented: true, planned: true };
  var narrow = window.matchMedia("(max-width: 960px)");

  function toArray(list) { return Array.prototype.slice.call(list); }
  function linkTo(selector, id) { return doc.querySelector(selector + '[href="#' + id + '"]'); }

  function rowMatches(row, query) {
    var text = row.getAttribute("data-search");
    return shownStates[row.getAttribute("data-state")] && (!query || text.indexOf(query) !== -1);
  }

  function applyFilters() {
    var query = search.value.trim().toLowerCase();
    var shown = 0;
    rows.forEach(function (row) {
      var match = rowMatches(row, query);
      row.hidden = !match;
      if (match) { shown += 1; }
      var cell = linkTo(".cell", row.id);
      if (cell) { cell.classList.toggle("is-dim", !match); }
    });
    sections.forEach(function (section) {
      var visible = section.querySelector(".fr:not([hidden])") !== null;
      section.hidden = !visible;
      var link = linkTo(".nav-item", section.id);
      if (link) { link.classList.toggle("is-dim", !visible); }
    });
    status.textContent = shown === rows.length
      ? "Showing all " + rows.length + " requirements"
      : "Showing " + shown + " of " + rows.length + " requirements";
    empty.hidden = shown > 0;
  }

  function showEverything() {
    search.value = "";
    filters.forEach(function (button) {
      shownStates[button.getAttribute("data-filter")] = true;
      button.setAttribute("aria-pressed", "true");
    });
    applyFilters();
  }

  filters.forEach(function (button) {
    button.addEventListener("click", function () {
      var state = button.getAttribute("data-filter");
      shownStates[state] = !shownStates[state];
      button.setAttribute("aria-pressed", String(shownStates[state]));
      applyFilters();
    });
  });
  search.addEventListener("input", applyFilters);
  doc.getElementById("fr-reset").addEventListener("click", showEverything);

  toArray(doc.querySelectorAll(".cell")).forEach(function (cell) {
    cell.addEventListener("click", function () {
      var row = doc.getElementById(cell.getAttribute("href").slice(1));
      if (row && row.hidden) { showEverything(); }
    });
  });

  function markCurrent(id) {
    navLinks.forEach(function (link) {
      if (link.getAttribute("href") === "#" + id) { link.setAttribute("aria-current", "true"); }
      else { link.removeAttribute("aria-current"); }
    });
  }
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { markCurrent(entry.target.id); } });
    }, { rootMargin: "-25% 0px -65% 0px" });
    sections.forEach(function (section) { spy.observe(section); });
  }

  function openNav() { body.classList.add("nav-open"); scrim.hidden = false; menu.setAttribute("aria-expanded", "true"); }
  function closeNav() { body.classList.remove("nav-open"); scrim.hidden = true; menu.setAttribute("aria-expanded", "false"); }
  menu.addEventListener("click", function () {
    if (body.classList.contains("nav-open")) { closeNav(); } else { openNav(); }
  });
  scrim.addEventListener("click", closeNav);
  navLinks.forEach(function (link) { link.addEventListener("click", closeNav); });

  doc.addEventListener("keydown", function (event) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
    if (event.key === "/" && !typing) {
      event.preventDefault();
      if (narrow.matches) { openNav(); }
      search.focus();
    }
    if (event.key === "Escape") { closeNav(); }
  });

  function currentTheme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function showTheme(theme) {
    root.setAttribute("data-theme", theme);
    toggle.querySelector("span").textContent = theme === "light" ? "Dark theme" : "Light theme";
  }
  toggle.addEventListener("click", function () {
    var next = currentTheme() === "light" ? "dark" : "light";
    showTheme(next);
    try { localStorage.setItem("fr-theme", next); } catch (e) { /* storage blocked: the choice lasts this visit */ }
  });
  var themeBeforePrint = currentTheme();
  window.addEventListener("beforeprint", function () { themeBeforePrint = currentTheme(); root.setAttribute("data-theme", "light"); });
  window.addEventListener("afterprint", function () { showTheme(themeBeforePrint); });
  showTheme(currentTheme());

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) { return navigator.clipboard.writeText(text); }
    var area = doc.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    body.appendChild(area);
    area.select();
    var copied = doc.execCommand("copy");
    body.removeChild(area);
    return copied ? Promise.resolve() : Promise.reject(new Error("copy refused"));
  }
  function flag(button, message) {
    button.setAttribute("data-note", message);
    announce.textContent = message;
    window.setTimeout(function () { button.removeAttribute("data-note"); }, 1600);
  }
  toArray(doc.querySelectorAll(".fr-tag")).forEach(function (button) {
    button.addEventListener("click", function () {
      var tag = button.getAttribute("data-tag");
      copyText(tag).then(
        function () { flag(button, "Copied " + tag); },
        function () { flag(button, "Copy blocked. Select the tag to copy it."); }
      );
    });
  });

  applyFilters();
})();
"""


def report(features: list[Feature], ledger: StateLedger) -> None:
    totals = Counter(r.state for f in features for r in f.requirements)
    states = ", ".join(f"{s.value} {totals[s]}" for s in DISPLAY_ORDER)
    print(f"Wrote {repo_path(OUT_PATH)}: {plural(len(features), 'feature')}, "
          f"{plural(sum(totals.values()), 'requirement')} ({states})")
    if not ledger.is_present:
        print(f"note: {repo_path(RTM_PATH)} not found; every FR is Planned", file=sys.stderr)
    known = {r.id for f in features for r in f.requirements}
    for fr_id in ledger.ids_missing_from(known):
        print(f"warning: the RTM lists {fr_id}, which the PRD does not define", file=sys.stderr)


def main() -> int:
    try:
        ledger = StateLedger.read(RTM_PATH)
        features = load_features(ledger)
        page = ReferencePage(features, ledger, Brand.load(), date.today())
    except RequirementsDocError as error:
        print(f"generate_functional_requirements: {error}", file=sys.stderr)
        return 1
    OUT_PATH.write_text(page.html(), encoding="utf-8")
    report(features, ledger)
    return 0


if __name__ == "__main__":
    sys.exit(main())
