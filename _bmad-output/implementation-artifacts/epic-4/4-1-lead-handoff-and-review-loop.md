---
ACs:
  AC-1:
    summary: "One person's submissions reach the sales team as one lead email after a 20-minute quiet period, carrying every conversation."
    frs: [FR-0401]
    levels: [L3]
  AC-2:
    summary: "The lead email's review link opens a questionnaire with four 1–5 scales, two checkboxes and one comment box."
    frs: [FR-0402]
    levels: [L4]
  AC-3:
    summary: "A star tapped in the email only preselects the overall score; nothing is saved until the form is submitted."
    frs: [FR-0403]
    levels: [L4]
  AC-4:
    summary: "A submitted review shows a Saved page, and reopening the link edits that review rather than filing another."
    frs: [FR-0404]
    levels: [L4]
---

# Story 4.1: Lead hand-off and Sol review loop

Status: review
Blocked: false
Blocked-Reason:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

**As-built baseline** — the behaviour shipped before this story was written; the story exists so the
acceptance suite has a story to trace to.

## Story

As a member of the Cannasol sales team,
I want each prospect to reach me as one email with everything they said, and to rate how Sol handled them,
so that I follow up once with full context and Sol improves from real conversations.

## Acceptance Criteria

1. **Given** one person submits a chat sample card, the contact form, or both, **when** 20 minutes pass
   with no further submission from that person, **then** the sales team receives **one** lead email that
   carries every conversation that person had. `FR-0401`
2. **Given** a lead email, **when** the reviewer opens its review link, **then** a questionnaire shows four
   1–5 scales (overall, knowledge, tone, hand-off), two checkboxes and one comment box. `FR-0402`
3. **Given** a lead email, **when** the reviewer taps a star in it, **then** the questionnaire opens with
   that overall score preselected, and nothing is saved until the reviewer submits the form. `FR-0403`
4. **Given** a completed questionnaire, **when** the reviewer submits it, **then** a "Saved" page confirms
   it, **and when** the same link is reopened, **then** the saved answers are shown, so a second visit
   edits that review rather than filing another. `FR-0404`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-0401 | AC #1 | @FR_0401 @story_4_1 |
| FR-0402 | AC #2 | @FR_0402 @story_4_1 |
| FR-0403 | AC #3 | @FR_0403 @story_4_1 |
| FR-0404 | AC #4 | @FR_0404 @story_4_1 |

## Definition of Done

- [ ] All acceptance criteria are met and verified at the level declared in `ACs:`
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (`npm run test`)
- [ ] Acceptance test scenarios created with dual tags (`@FR_<EE><NN>` and `@story_4_1`), exactly one tier tag (`@e2e` or `@service`), and `@web` on every `@e2e`
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

- [x] Behaviour shipped before this story was written (AC: 1–4, FR: FR-0401..FR-0404)
- [ ] Acceptance scenarios for every AC in the epic-4 feature file under `test/acceptance/features/` (AC: 1–4)

## Dev Notes

- AC-1 is `L3` (`@service`) because the email's arrival is proved through Firestore and SendGrid. No
  screen on this site shows it. AC-2 to AC-4 are driven in a browser.
- A lead is a person, not a submission, and there is one email after the quiet period:
  `functions/lib/CLAUDE.md` § A lead is a person, not a submission, and § One email per lead, after the
  quiet period. The review corpus: § The review corpus is permanent, and `docs/sol-review-loop.md`.
- `/sol-review` is a hosting rewrite onto the 1st-gen `solReview` function, not a React route.
- `test/e2e/review-loop.mjs` and `test/e2e/lead-delivery.mjs` send real mail and take about 25 minutes
  unless `LEAD_QUIET_MINUTES` is lowered. Run them deliberately, never in CI.

### Test Requirements

- Feature file: `test/acceptance/features/epic-4-<slug>.feature`; steps: `test/acceptance/steps/test_epic_4.py`
- Every scenario tagged: `@FR_04NN @story_4_1` plus `@e2e @web` or `@service` (underscores — a hyphenated tag matches no gate)
- UF-03 (happy path, A1, A2) runs through these FRs, so `user_flows.feature` covers them too.

### Project Structure Notes

- No structural change: this story records shipped behaviour.

### References

- [Source: _bmad-output/planning-artifacts/PRD.md § F-004 — FR-0401..FR-0404]
- [Source: _bmad-output/planning-artifacts/user-flows/user-flows.md § UF-03]

## Dev Agent Record

### Agent Model Used

None. This is an as-built baseline, and no implementation ran under this story.

### Debug Log References

### Completion Notes List

- 2026-11-06: story written at BMAD setup to trace the shipped behaviour.

### File List
