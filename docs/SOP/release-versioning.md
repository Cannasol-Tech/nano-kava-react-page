---
file: docs/SOP/release-versioning.md
title: "Release & Versioning Standard"
author: Stephen Boyett
company: Cannasol Technologies LLC
date: 2026-07-16
version: 1.0
brief: "Company-wide standard for per-component vMAJ.MIN.BUG versioning, automated release pipelines that bump versions on every component change, API version-exposure endpoints, and the requirement that every web and mobile app displays all component versions to the user. Mutable per product via the Project Configuration section."
---

# Release & Versioning Standard

## 1. Purpose

Every Silverline product versions each of its independently-deployable components
separately, bumps those versions automatically on every change, exposes server-side
versions over HTTP, and shows ALL component versions to the end user. The goal: anyone
— user, client, or engineer — can tell in seconds exactly what version of each piece of
software is running.

This document is the company-wide default. Each product MAY mutate it via the
**Project Configuration** section at the bottom (filled in by `/silverline-bmad-setup`);
everything not overridden there follows this standard.

## 2. Version Scheme — `vMAJ.MIN.BUG`

Format: `v<MAJOR>.<MINOR>.<BUG>` (e.g. `v2.4.7`). Semver-compatible; BUG == patch.

| Segment | Bumped when | Bumped by |
|---------|-------------|-----------|
| `MAJ` | Breaking change, redesign, or client-facing major milestone | Manual decision (or commit marked `!` / `BREAKING CHANGE`) |
| `MIN` | New feature / completed story (`feat:` commits) | Pipeline, automatic |
| `BUG` | Fix, chore, refactor, docs, perf (`fix:` and everything else) | Pipeline, automatic |

- New components start at `v0.1.0`; `v1.0.0` marks the first production release.
- Bump determination uses Conventional Commits scoped to the component's paths:
  highest-ranked change type in the merge wins (MAJ > MIN > BUG).
- Pre-release builds append `-rc.N` (e.g. `v1.3.0-rc.2`) — optional per product.

## 3. Component Model — one version per deployable

A **component** is anything built/deployed on its own lifecycle. Default set:

| Component | Typical manifest (version SSoT) | Tag prefix |
|-----------|--------------------------------|------------|
| `frontend` | `frontend/package.json` `.version` | `frontend/v` |
| `api` | `api/pyproject.toml` or `api/package.json` | `api/v` |
| `mobile` | `mobile/app.json` (`expo.version`) / `package.json` | `mobile/v` |

Products add components as needed (`firmware`, `daemon`, `worker`, `cli`, `hmi`, …) —
declared in the Project Configuration section AND in the machine-readable registry.

**Registry:** every repo carries `versions.yaml` at the root — the map CI and tooling
read (YAML gets no inline header per the file-header standard; this SOP is its doc):

```yaml
# versions.yaml — component registry for the release pipeline (see docs/SOP/release-versioning.md)
components:
  frontend:
    path: frontend/            # path filter for change detection
    manifest: frontend/package.json
    tag_prefix: frontend/v
  api:
    path: api/
    manifest: api/pyproject.toml
    tag_prefix: api/v
    exposes_version_endpoint: true
  mobile:
    path: mobile/
    manifest: mobile/app.json
    tag_prefix: mobile/v
```

The component's **native manifest is the single source of truth** for its current
version. `versions.yaml` maps components to manifests; it never duplicates the number.

## 4. Tags & Releases

- Git tag per component release: `<component>/vX.Y.Z` (e.g. `api/v1.4.2`).
- A GitHub Release is created per tag; its notes are the generated changelog section.
- Changelogs: one `CHANGELOG.md` per component directory, newest first, grouped
  by MAJ/MIN/BUG with commit references.
- Where the product publishes test/coverage artifacts, attach them per
  `release-format.md` (executive-report.json et al.) — that standard is complementary.

## 5. Automated Release Pipeline — versions bump themselves

Humans NEVER hand-edit a version number. On every merge to the default branch:

1. CI detects which components changed (path filters from `versions.yaml`).
2. For each changed component: compute bump from the merged commits (per §2),
   write the new version into the component manifest, update the component
   changelog, commit (`chore(release): <component> vX.Y.Z [skip ci]`), tag, and
   publish the GitHub Release.
3. Deploy jobs consume the tag — never a branch HEAD — so what's deployed is
   always a named version.
4. The build stamps the version + git SHA into the artifact (env/config injection,
   e.g. `NEXT_PUBLIC_APP_VERSION`, `EXPO_PUBLIC_APP_VERSION`, Python settings),
   so runtime code never guesses its own version.

Reference workflow template: `.github/workflows/release-versioning.yml` (scaffolded by
`/silverline-bmad-setup`; adapt path filters per `versions.yaml`).

## 6. API Version Exposure — REQUIRED endpoints

Every API/service component MUST expose, unauthenticated:

- `GET /version` — its own identity:

```json
{ "component": "api", "version": "v1.4.2", "build": "abc1234", "builtAt": "2026-07-16T14:00:00Z" }
```

- `GET /versions` — the aggregate every frontend consumes: all components the backend
  knows about (its own live values; sibling services queried or configured; client
  components report their embedded versions themselves):

```json
{
  "product": "<product name>",
  "components": {
    "api":      { "version": "v1.4.2", "build": "abc1234" },
    "worker":   { "version": "v0.9.1", "build": "def5678" }
  }
}
```

- `GET /health` includes `"version"` (existing health-check standards stay in force).
- Version fields ALWAYS carry the `v` prefix. Endpoints are cheap, cacheable (≤60s),
  and never expose secrets — component, version, build SHA, timestamp only.

## 7. User-Visible Versions — REQUIRED in every web & mobile app

Every web app and mobile app MUST display **all** of the product's component versions
somewhere any user can reach without developer tools:

- **Where (pick per product, record in Project Configuration):** Settings → About
  screen (mobile default), footer or Help/About dialog (web default).
- **What:** its own version (baked at build time per §5.4) plus everything from
  `GET /versions` — e.g. `Web v2.1.3 · API v1.4.2 · Mobile v1.7.0`.
- If `/versions` is unreachable, show the app's own version and `API: unavailable` —
  never hide the section, never show a stale value as if live.
- Support builds SHOULD make the version copyable (tap-to-copy / select-to-copy)
  so users can paste it into bug reports.

## 8. Definition of Done hook

A story that changes a component is not `done` until the release pipeline has run
green and produced the new component version(s). Stories introducing a NEW component
must add it to `versions.yaml`, the Project Configuration table below, `/versions`
aggregation, and the user-visible version display.

## 9. Project Configuration (MUTABLE — filled per product by /silverline-bmad-setup)

> Everything above is the company default. This section records this product's actual
> component set and any approved deviations. Keep it in sync with `versions.yaml`.

| Component | Path | Manifest (version SSoT) | Tag prefix | Version endpoint | Displayed in |
|-----------|------|-------------------------|------------|------------------|--------------|
| `frontend` | repo root (path filters: `versions.yaml`) | `package.json` `.version` | `frontend/v` | n/a — client component | Site footer / About — **not yet implemented** |
| `api` | `functions/` | `functions/package.json` `.version` | `api/v` | `GET /version` + `GET /versions` — **not yet implemented** | n/a — server component; surfaced through the frontend display |

**Deviations from the standard:** see `docs/SOP/project-deviations.md` § Release versioning.
