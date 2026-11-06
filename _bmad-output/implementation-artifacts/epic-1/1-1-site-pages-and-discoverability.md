---
ACs:
  AC-1:
    summary: "Each public page loads and shows its own heading and the main navigation."
    frs: [FR-0101]
    levels: [L4]
  AC-2:
    summary: "The main navigation reaches every public page."
    frs: [FR-0102]
    levels: [L4]
  AC-3:
    summary: "The landing page's sample-request call to action leads to the contact page."
    frs: [FR-0103]
    levels: [L4]
  AC-4:
    summary: "An address that is not a page returns HTTP 404 with a not-found page, never a soft 404."
    frs: [FR-0104]
    levels: [L4]
  AC-5:
    summary: "Each public page's content is readable in the served HTML with JavaScript disabled."
    frs: [FR-0105]
    levels: [L4]
  AC-6:
    summary: "Each public page ships exactly one title, one meta description and one canonical URL."
    frs: [FR-0106]
    levels: [L4]
  AC-7:
    summary: "Each public page carries JSON-LD identifying Cannasol Technologies as the organization."
    frs: [FR-0107]
    levels: [L4]
  AC-8:
    summary: "sitemap.xml lists every public page, and llms.txt is served as Markdown."
    frs: [FR-0108]
    levels: [L4]
---

# Story 1.1: Site pages and discoverability

Status: review
Blocked: false
Blocked-Reason:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

**As-built baseline** — the behaviour shipped before this story was written; the story exists so the
acceptance suite has a story to trace to.

## Story

As a beverage-brand buyer looking for a kava ingredient,
I want every EnjoyNano page to load, link together and be readable by search engines and AI crawlers,
so that I can find the nano kava emulsion and reach a sample request.

## Acceptance Criteria

1. **Given** a visitor, **when** they open each public page (`/`, `/faq`, `/contact`, `/mushrooms`),
   **then** that page shows its own heading and the main navigation. `FR-0101`
2. **Given** a visitor on any public page, **when** they use the main navigation, **then** it reaches
   every public page. `FR-0102`
3. **Given** a visitor on the landing page, **when** they follow the sample-request call to action,
   **then** they arrive on the contact page. `FR-0103`
4. **Given** an address that is not a page, **when** it is requested, **then** the response is HTTP 404
   with a not-found page, never the home page served as a soft 404. `FR-0104`
5. **Given** JavaScript is disabled, **when** a public page loads, **then** its content is readable in the
   served HTML. `FR-0105`
6. **Given** any public page, **when** its served HTML is read, **then** it has exactly one `<title>`,
   one meta description and one canonical URL. `FR-0106`
7. **Given** any public page, **when** its served HTML is read, **then** it carries JSON-LD structured
   data identifying Cannasol Technologies as the organization. `FR-0107`
8. **Given** the site, **when** `sitemap.xml` and `llms.txt` are requested, **then** the sitemap lists
   every public page and `llms.txt` is served as Markdown. `FR-0108`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-0101 | AC #1 | @FR_0101 @story_1_1 |
| FR-0102 | AC #2 | @FR_0102 @story_1_1 |
| FR-0103 | AC #3 | @FR_0103 @story_1_1 |
| FR-0104 | AC #4 | @FR_0104 @story_1_1 |
| FR-0105 | AC #5 | @FR_0105 @story_1_1 |
| FR-0106 | AC #6 | @FR_0106 @story_1_1 |
| FR-0107 | AC #7 | @FR_0107 @story_1_1 |
| FR-0108 | AC #8 | @FR_0108 @story_1_1 |

## Definition of Done

- [ ] All acceptance criteria are met and verified at the level declared in `ACs:`
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (`npm run test`)
- [ ] Acceptance test scenarios created with dual tags (`@FR_<EE><NN>` and `@story_1_1`), exactly one tier tag (`@e2e` or `@service`), and `@web` on every `@e2e`
- [ ] `make test-acceptance FR=<EE><NN>` passes for every FR this story owns
- [ ] The acceptance run produced a functionality report, and `check_acceptance_evidence.py` passes
- [ ] user_flows.feature updated (if story affects user flows)
- [ ] No regressions -- `make test-acceptance` (full suite) and the unit tests pass
- [ ] `docs/REQUIREMENTS_TRACEABILITY_MATRIX.md` updated for this story's FRs, ACs and scenarios
- [ ] `_bmad-output/implementation-artifacts/sprint-status.yaml` updated
- [ ] No `Blocked: true` remaining
- [ ] Dev notes and references are complete
- [ ] Story-specific documentation updated (if applicable), including any directory `CLAUDE.md` the change outdates
- [ ] New env vars or secrets documented in `.env.example` and `CLAUDE.md` (if applicable)
- [ ] Release pipeline green — changed components auto-bumped per `docs/SOP/release-versioning.md` (new components added to `versions.yaml`, §9 table, `/versions`, and the user-visible version display)
- [ ] Hours-log entry reviewed & accepted via `/silverline-hours-log-review` (when the hours-log gate is enabled in `_bmad-output/hours-log/config.json`; story cannot reach `done` until the entry is Accepted or marked "No entry needed")

## Tasks / Subtasks

- [x] Behaviour shipped before this story was written (AC: 1–8, FR: FR-0101..FR-0108)
- [ ] Acceptance scenarios for every AC in the epic-1 feature file under `test/acceptance/features/` (AC: 1–8)

## Dev Notes

- Routes: `src/seo/routes.js` is the route SSoT, and each route also needs its `firebase.json` rewrite.
  See `CLAUDE.md` § Deployment.
- Prerendering, the single-title rule and JSON-LD: `CLAUDE.md` § SEO / AEO, `scripts/prerender.mjs`,
  `src/seo/structuredData.js`.
- `sitemap.xml` is generated (`npm run seo:assets`). Never hand-edit it.

### Test Requirements

- Feature file: `test/acceptance/features/epic-1-<slug>.feature`; steps: `test/acceptance/steps/test_epic_1.py`
- Every scenario tagged: `@FR_01NN @story_1_1` plus `@e2e @web` or `@service` (underscores — a hyphenated tag matches no gate)
- FR-0103 is also step 1 of UF-02, so `user_flows.feature` covers it too.

### Project Structure Notes

- No structural change: this story records shipped behaviour.

### References

- [Source: _bmad-output/planning-artifacts/PRD.md § F-001 — FR-0101..FR-0108]
- [Source: _bmad-output/planning-artifacts/user-flows/user-flows.md § UF-02]

## Dev Agent Record

### Agent Model Used

None. This is an as-built baseline, and no implementation ran under this story.

### Debug Log References

### Completion Notes List

- 2026-11-06: story written at BMAD setup to trace the shipped behaviour.

### File List
