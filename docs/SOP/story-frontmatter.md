---
file: docs/SOP/story-frontmatter.md
title: "Story Frontmatter Standard — ACs: schema"
author: Stephen Boyett
company: Cannasol Technologies LLC
date: 2026-05-14
version: 1.0
brief: "Locked YAML shape for the per-AC test-layer frontmatter block (ACs:) introduced in Story 1.15. All story files authored via bmad-create-story after Story 1.15 emit this block automatically."
---

# Story Frontmatter Standard — `ACs:` Schema

## Purpose

Every story file carries a YAML frontmatter block (between the opening `---` and
closing `---` lines). Story 1.15 introduces a required `ACs:` sub-block that
declares, for each Acceptance Criterion, the FR/NFR bindings and the test layer(s)
at which the AC is verified.

The RTM validator (`test/rtm/validate-tags.ts`) parses this block at CI time and
enforces that every AC declaring `L4` (Detox E2E) has at least one scenario tagged
`@story-N-N @e2e @FR-NNN` where `FR-NNN` is one of the AC's declared FRs.

## Locked `ACs:` Shape

```yaml
ACs:
  AC-N:
    summary: "<one-line restatement of the AC text>"
    frs: [FR-NNN, ...]        # required; AC's FR bindings (subset of story-level FRs allowed; [] for meta/infra ACs)
    nfrs: [NFR-NNN, ...]      # optional; AC's NFR bindings
    levels: [L1|L2|L3|L4|L5, ...]  # required; one or more layers per test-strategy.md §1
```

### Field Rules

| Field | Required | Notes |
|-------|----------|-------|
| `summary` | Yes | Non-empty one-line restatement of the AC heading. Quoted strings are recommended when the text contains special characters. |
| `frs` | Yes | Flow-sequence of `FR-NNN` tokens. Use `[]` for meta/infra ACs with no FR binding. Scalar form (`frs: FR-005`) is **forbidden** — must be a flow-sequence even for one element. |
| `nfrs` | No | Flow-sequence of `NFR-NNN` tokens. Omit or use `[]`. |
| `levels` | Yes | Non-empty flow-sequence of layer tokens. Must be a subset of `{L1, L2, L3, L4, L5}`. Multiple levels per AC are allowed. |

### `levels` Enum — Binding Rules

The `levels` values MUST match the layer identifiers from `test-strategy.md` §1
**verbatim**:

| Token | Layer | Description |
|-------|-------|-------------|
| `L1` | Unit | Jest — pure logic, no I/O |
| `L2` | Component | Jest + `@testing-library/react-native` — render assertions |
| `L3` | Integration | cucumber-js + BLE harness — service-level full-stack |
| `L4` | Device E2E | cucumber-js → Detox — real RN bridge / device interaction |
| `L5` | Manual | Bench-only pre-release sign-off |

**No descriptive aliases** (`Detox`, `unit`, `service-level`, etc.) are valid
in the `levels` field. Only the literal `L1`..`L5` tokens are accepted; any
other token causes the RTM validator to emit a hard `5-acs-schema` failure.

Multiple levels per AC are allowed and recommended when an AC has both a
component-render check and a Detox happy-path. Example:

```yaml
AC-4:
  summary: "Mock-build banner renders per the operational-safety contract."
  frs: [FR-005]
  nfrs: [NFR-040, NFR-041, NFR-042]
  levels: [L2, L4]
```

## `Touches-UI` Derivation

The legacy story-level `Touches-UI:` field is **deprecated** as of Story 1.15.

**New rule (authoritative):** When an `ACs:` map is present, `Touches-UI` is
**derived** from the `levels` field — it is `true` if and only if at least one
AC's `levels` contains `L4`. The story-level `Touches-UI:` line in the
frontmatter is ignored.

- **If the story's `ACs:` map derives `Touches-UI: true`** AND the frontmatter
  also carries an explicit `Touches-UI:` line **that disagrees** with the derived
  value, the validator emits a hard `5-acs-schema` failure citing the contradiction.
  Remove the legacy field — the `ACs:` map is authoritative.

- **Legacy stories without an `ACs:` map** that carry `Touches-UI: true` continue
  to validate under Story 1.7's story-level rule. The validator emits a **single
  aggregated deprecation summary** (not a per-file warning) listing all such files.
  Migration to the `ACs:` map is a nice-to-have; it is not required to keep the
  legacy stories green.

## Worked Example — Story 1.2 Migrated `ACs:` Map

Story 1.2 (`1-2-eas-build-profiles-makefile-contract.md`) is the canonical
migration example because it is the only story with UI-visible ACs
(AC-4 + AC-4b, both at `[L2, L4]`):

```yaml
ACs:
  AC-1:
    summary: "eas.json defines three profiles (development / preview / production) with the locked EXPO_PUBLIC_* env var matrix."
    frs: [FR-003, FR-004, FR-005, FR-006]
    nfrs: []
    levels: [L1]
  AC-2:
    summary: "Makefile exposes the DoD-blessed target contract (test-unit, test-component, test-integration, test-e2e, test-acceptance, test-acceptance STORY=N.N, test-acceptance SMOKE=1, test-acceptance LAYER=3, test-rtm-validate, test-all, check-headers)."
    frs: []
    nfrs: [NFR-055]
    levels: [L1, L3]
  AC-3:
    summary: "make test-acceptance SMOKE=1 logs wall-clock time on stdout AND verifiably filters by @smoke."
    frs: []
    nfrs: [NFR-055]
    levels: [L1]
  AC-4:
    summary: "Mock-build banner renders per the operational-safety contract (channel-aware, mock-aware, full-width above navigation chrome)."
    frs: [FR-005]
    nfrs: [NFR-040, NFR-041, NFR-042]
    levels: [L2, L4]
  AC-4b:
    summary: "Dev-channel distribution banner renders for development/preview channels."
    frs: [FR-005]
    nfrs: [NFR-040, NFR-041, NFR-042]
    levels: [L2, L4]
  AC-5:
    summary: "PRD-AMEND-002 binding rules — RN 0.83 / Expo SDK 55 pin documented in eas.json comments and Makefile preamble."
    frs: []
    nfrs: []
    levels: [L1]
  AC-6:
    summary: "All NEW or MODIFIED files carry the Silverline file header."
    frs: []
    nfrs: [NFR-051]
    levels: [L1]
```

AC-4 and AC-4b both declare `[L2, L4]` because they require a component-render
assertion (L2) AND a Detox scenario (L4). The `Touches-UI` field was removed
from Story 1.2's frontmatter when this map was added.

## `bmad-create-story` Integration

Stories authored via the `bmad-create-story` skill (after Story 1.15 ships)
automatically emit an `ACs:` block in the frontmatter. The workflow's
AC-drafting step (Step 5) parses each numbered AC for:

- the bolded heading sentence → `summary`
- the parenthetical FR/NFR citation → `frs` / `nfrs`
- the explicit test-layer call-out → `levels` (defaults to `[L1]` with a
  warning if no level is explicit — the dev confirms)

Developers should never hand-author the `ACs:` block; the workflow populates it.
Any `{{TODO}}` placeholder surviving in a committed story file causes the RTM
validator to emit a hard `5-acs-schema` failure.

## Known Limitations of the AC-Level Gate

The gate is mechanical and tag-based. It cannot reason about test content.
Four bypasses remain code-review judgment calls — NOT mechanical checks:

1. **No-`ACs:`-map bypass.** A story with no `ACs:` map AND `Touches-UI: false`
   falls through both rules. The validator cannot detect "you should have authored
   an `ACs:` map for a UI story." Mitigation: code review.

2. **Wrong-level bypass.** A story declaring a clearly-UI-visible AC at
   `levels: [L1]` skips the L4 gate. The validator cannot read AC text and infer
   "this AC describes UI behavior." Mitigation: code review (the
   `~/.claude/CLAUDE.md` §"Acceptance Test Quality" rule is the human-applied
   counterpart).

3. **Tag-vs-content bypass.** An `@e2e`-tagged scenario in a `.feature` file may
   actually run at L1 (mocked, no render). The validator only checks tag presence,
   not whether the test exercises a real RN bridge / Detox runtime. Mitigation:
   code review + the L3/L4 routing established by Story 1.7's hooks.

4. **FR-mismatch bypass.** A story declaring `frs: [FR-005]` in an AC could ship
   a scenario that actually tests FR-006 behaviour (correct tag, wrong logic). The
   validator verifies tag presence and FR-binding intersection but cannot verify
   the test asserts FR-005-specific behaviour. Mitigation: code review.

These are pre-existing tag-system limitations, not new with Story 1.15.
Documenting them here makes the gate's contract explicit so reviewers know what
to look for and authors don't expect the gate to do more than it does.

## Cross-References

- `_bmad-output/planning-artifacts/test-strategy.md` §1 — Test-Level Matching
  (the `L1`..`L5` enum source of truth)
- `test/rtm/validate-tags.ts` — the RTM validator implementation that parses
  and enforces this schema
- `_bmad-output/implementation-artifacts/epic-1/1-7-detox-cucumber-acceptance-test-runtime.md`
  §AC-5 — the story-level `@e2e` backstop this AC-level rule extends
- `~/.claude/CLAUDE.md` §"Acceptance Test Quality" — the "fake e2e" anti-pattern
  this gate prevents

---
Copyright © 2026 Real Random LLC. All Rights Reserved.
---
