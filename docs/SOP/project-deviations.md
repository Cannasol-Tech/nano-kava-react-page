---
file: docs/SOP/project-deviations.md
title: "Project Deviations from the Company SOPs"
author: Stephen Boyett
company: Cannasol Technologies LLC
date: 2026-11-06
version: 1.0
brief: "Where this repo deviates from, or specialises, the Silverline SOPs installed alongside this file. Everything not listed here follows the standard as written."
---

# Project Deviations from the Company SOPs

The SOP bodies in this directory are the company standard and are never edited for this project.
This file is the only place a project-specific exception lives. Rows without a decider are
observed, not approved, and need Stephen's ruling before they count as deviations.

## Testing and traceability

| # | Standard | This project | Decided |
|---|---|---|---|
| D1 | `makefile-standard.md` § Per-Stack Adaptations names `cucumber-js` for JS/TS stacks | Acceptance tests are **Python pytest-bdd + Playwright** although the app is JavaScript. This matches the org-wide Python canonical, so `make test-acceptance` takes the `.venv` path of Global Requirement 1. | Stephen, 2026-11-06 |
| D2 | `makefile-standard.md` `STORY` example emits `@story-1-3` | Feature-file tags use **underscores**: `@FR_0101 @story_1_1`. pytest-bdd turns tags into markers, so `STORY=1.1` filters with `-m story_1_1`. | Stephen, 2026-11-06 |
| D3 | Global DoD: RTM at `_bmad-output/test-artifacts/requirement-traceability-matrix.md` | RTM lives at `docs/REQUIREMENTS_TRACEABILITY_MATRIX.md`. | Stephen, 2026-11-06 |
| D4 | Global BMAD conventions: one Trello board per project | **No Trello board.** Trello steps in the BMAD workflows are skipped. | Stephen, 2026-11-06 |
| D5 | Stories are written before the code they describe | **As-built baseline**: one story per epic (1.1, 2.1, 3.1, 4.1), written after the code shipped. | Stephen, 2026-11-06 |
| O1 | `coding-style.md` § Test Organization: Pattern A (mirror tree) or B (co-located), with Jest | Unit tests are Vitest, in flat `src/test/` and `functions/test/` folders: neither pattern. | — |
| O2 | `story-frontmatter.md` `levels` table names Jest / Detox / cucumber-js | That table is RRUA's. The proposed mapping here is L1/L2 Vitest, L3 pytest-bdd service-level, L4 pytest-bdd + Playwright, L5 manual. | — |

## Release versioning

`release-versioning.md` §9 points here.

| # | Standard | This project | Decided |
|---|---|---|---|
| R1 | §3 registry: one `path:` per component | The frontend is the repo root, so a single prefix cannot isolate it. `versions.yaml` uses a `paths:` list for every component, and the frontend changelog is the root `CHANGELOG.md`. | Stephen (setup answers), 2026-11-06 |
| R2 | §2: new components start at `v0.1.0` | `frontend` keeps its existing `1.3.0`; `api` is new at `0.1.0`. | Stephen (setup answers), 2026-11-06 |
| R3 | §5 assumes a prior release to diff against | On its first run the pipeline tags each component at its current manifest version without bumping it. History from before adoption is not changelogged. | — (implementation choice; confirm) |
| R4 | §5.3 deploys consume the tag; §5.4 the build stamps version + SHA | `make deploy` / `make deploy-all` run from a workstation against the working tree, and nothing is stamped into the build yet. | — |
| R5 | §2 bump type is read from Conventional Commit types | History mostly uses `<area>:` prefixes (`sol:`, `landing:`, `seo:`, `chat:`). Only 11 `feat:` and 4 `fix:` appear in 98 commits, and under §2 every `<area>:` commit bumps BUG. Proposed: `feat(<area>):` / `fix(<area>):`. | — |

## Tooling and layout

| # | Standard | This project | Decided |
|---|---|---|---|
| T1 | `makefile-standard.md` Global Requirement 2: `UI_PORT` defaults to `8080` for web | The dev server is on `3000`, hard-coded in `vite.config.js`, the Makefile, `test/e2e/sol-conversation.mjs` and the dev review link. | — |
| T2 | `makefile-standard.md` § Purpose: targets that are not listed need an amendment | Project targets outside the list: `deploy`, `deploy-all`, `deploy-functions`, `deploy-firestore`, `firestore-status`, `seo-assets`, `seo-indexnow`, `kb`, `verify-release`, `install-functions`, `preview*`, `test-lead-delivery`, `test-sol`, `test-review-loop`. Record the approved list here once it has been ruled on. | — |
| T3 | `root-directory.md`: 8 allowed root files, no permanent exceptions | Root files the platform requires: `index.html`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `jsconfig.json`, `firebase.json`, `.firebaserc`, `.env.example`, `CLAUDE.md`. `release-versioning.md` itself requires `versions.yaml` and `CHANGELOG.md` at the root, so the two SOPs conflict and the fix should go back to `~/.claude/silverline/SOP/`. `coding-style.md` wants exceptions listed in the root `README.md`, which does not exist. | — |
| T4 | `file-headers.md`: `@`-tags for TS/TSX | The repo has no TS. Its `.js`/`.jsx`/`.mjs` files use the `@`-tag form as the project convention. | — |
