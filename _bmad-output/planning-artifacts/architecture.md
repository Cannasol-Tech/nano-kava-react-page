# Architecture — Nano Kava Landing Page

**As-built index, 2026-11-06.** The architecture lives in the `CLAUDE.md` files beside the code. Those
files load automatically for any agent editing that directory, and a copy here would go stale. Record
a new decision in the `CLAUDE.md` it governs, and add a row here.

| Concern | Source |
|---|---|
| Stack, routing, Canvas scenes, theming, animation rules | `CLAUDE.md` § Architecture |
| Release path (`make deploy`), hosting rewrites, Firestore retention | `CLAUDE.md` § Deployment |
| Prerendering, route SSoT, JSON-LD, sitemap/feeds | `CLAUDE.md` § SEO / AEO, `docs/SEO/aeo-runbook.md` |
| Sol: content, backend, transcripts, leads, reviews, daily report | `CLAUDE.md` § AI Chat Widget (Sol) |
| Frame-rate budget and the Safari rules | `src/CLAUDE.md` § The measured budget, `SAFARI_OPTIMIZATIONS.md` |
| Site facts SSoT and knowledge-base generation | `src/content/CLAUDE.md` |
| Cloud Functions generations, the Gemini key, persona compliance | `functions/CLAUDE.md` |
| Lead identity, the one-email quiet period, transcripts, the review corpus | `functions/lib/CLAUDE.md` |
| The Sol review loop | `docs/sol-review-loop.md` |
| Directory layout rules | `docs/SOP/root-directory.md` |
| Test strategy | `docs/sw-testing-standards.md`, `_bmad-output/project-context.md` § Acceptance Suite Layout |

Shards, if any are ever written, go in `architecture-shards/`.
