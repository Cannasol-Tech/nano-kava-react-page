---
ACs:
  AC-1:
    summary: "The contact form refuses to submit without a name, a valid email and a message, and names the field."
    frs: [FR-0301]
    levels: [L4]
  AC-2:
    summary: "A complete submission is accepted and the visitor sees a confirmation that names the follow-up."
    frs: [FR-0302]
    levels: [L4]
---

# Story 3.1: Contact form

Status: review
Blocked: false
Blocked-Reason:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

**As-built baseline** — the behaviour shipped before this story was written; the story exists so the
acceptance suite has a story to trace to.

## Story

As a beverage-brand buyer who prefers a form to a chat,
I want to send Cannasol my details and a message from the contact page,
so that the sales team follows up with me.

## Acceptance Criteria

1. **Given** the contact page, **when** the visitor submits without a name, a valid email or a message,
   **then** the form does not submit and says which field needs attention. `FR-0301`
2. **Given** a complete contact form, **when** the visitor submits it, **then** the submission is
   accepted and the visitor sees a confirmation that names the follow-up. `FR-0302`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-0301 | AC #1 | @FR_0301 @story_3_1 |
| FR-0302 | AC #2 | @FR_0302 @story_3_1 |

## Definition of Done

- [ ] All acceptance criteria are met and verified at the level declared in `ACs:`
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (`npm run test`)
- [ ] Acceptance test scenarios created with dual tags (`@FR_<EE><NN>` and `@story_3_1`), exactly one tier tag (`@e2e` or `@service`), and `@web` on every `@e2e`
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

- [x] Behaviour shipped before this story was written (AC: 1–2, FR: FR-0301..FR-0302)
- [ ] Acceptance scenarios for every AC in the epic-3 feature file under `test/acceptance/features/` (AC: 1–2)

## Dev Notes

- `sendContactEmail` only queues the lead. The scheduled `sendPendingLeads` sends the email after the
  quiet period: `functions/lib/CLAUDE.md` § One email per lead, after the quiet period.
- **Trap:** submitting AC-2 against the deployed backend queues a REAL lead email to the sales team.

### Test Requirements

- Feature file: `test/acceptance/features/epic-3-<slug>.feature`; steps: `test/acceptance/steps/test_epic_3.py`
- Every scenario tagged: `@FR_03NN @story_3_1` plus `@e2e @web` or `@service` (underscores — a hyphenated tag matches no gate)
- UF-02 (happy path and E1) runs through these FRs, so `user_flows.feature` covers them too.

### Project Structure Notes

- No structural change: this story records shipped behaviour.

### References

- [Source: _bmad-output/planning-artifacts/PRD.md § F-003 — FR-0301..FR-0302]
- [Source: _bmad-output/planning-artifacts/user-flows/user-flows.md § UF-02]

## Dev Agent Record

### Agent Model Used

None. This is an as-built baseline, and no implementation ran under this story.

### Debug Log References

### Completion Notes List

- 2026-11-06: story written at BMAD setup to trace the shipped behaviour.

### File List
