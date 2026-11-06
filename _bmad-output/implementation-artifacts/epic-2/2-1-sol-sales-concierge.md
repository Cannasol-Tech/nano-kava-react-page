---
ACs:
  AC-1:
    summary: "Sol opens from the launcher, greets as Sol, asks a question, and makes no health or dosing claim."
    frs: [FR-0201]
    levels: [L4]
  AC-2:
    summary: "Sol answers a product question, with the reply streaming into the transcript."
    frs: [FR-0202]
    levels: [L4]
  AC-3:
    summary: "Sol declines personal dosing or health advice and never says what an ingredient does to a body."
    frs: [FR-0203]
    levels: [L4]
  AC-4:
    summary: "Asked for a sample, Sol shows an editable sample-request card filled in from the conversation."
    frs: [FR-0204]
    levels: [L4]
  AC-5:
    summary: "The sample-request card cannot be sent until it has a phone number or an email."
    frs: [FR-0205]
    levels: [L4]
  AC-6:
    summary: "On a phone-sized screen Sol never opens itself; only a tap opens the chat."
    frs: [FR-0206]
    levels: [L4]
---

# Story 2.1: Sol, the sales concierge

Status: review
Blocked: false
Blocked-Reason:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

**As-built baseline** — the behaviour shipped before this story was written; the story exists so the
acceptance suite has a story to trace to.

## Story

As a beverage-brand buyer browsing EnjoyNano,
I want to ask Sol about the product and request a sample in the chat,
so that I get answers and a sample without having to fill in a form.

## Acceptance Criteria

1. **Given** a visitor on a public page, **when** they open Sol from the launcher, **then** Sol greets
   them by name ("Sol") and asks a question, and the greeting makes no health or dosing claim. `FR-0201`
2. **Given** Sol is open, **when** the visitor asks a product question, **then** Sol answers in the
   conversation, with the reply streaming into the transcript. `FR-0202`
3. **Given** Sol is open, **when** the visitor asks for personal dosing or health advice, **then** Sol
   declines and does not state what an ingredient does to a person's body. `FR-0203`
4. **Given** a conversation, **when** the visitor asks for a sample, **then** Sol shows an editable
   sample-request card, filled in from the conversation, for the visitor to confirm. `FR-0204`
5. **Given** a sample-request card with neither a phone number nor an email, **when** the visitor tries
   to send it, **then** it cannot be sent, and once either is present it can. `FR-0205`
6. **Given** a phone-sized screen, **when** the visitor browses without tapping Sol, **then** Sol never
   opens itself, and only a tap opens the chat. `FR-0206`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-0201 | AC #1 | @FR_0201 @story_2_1 |
| FR-0202 | AC #2 | @FR_0202 @story_2_1 |
| FR-0203 | AC #3 | @FR_0203 @story_2_1 |
| FR-0204 | AC #4 | @FR_0204 @story_2_1 |
| FR-0205 | AC #5 | @FR_0205 @story_2_1 |
| FR-0206 | AC #6 | @FR_0206 @story_2_1 |

## Definition of Done

- [ ] All acceptance criteria are met and verified at the level declared in `ACs:`
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (`npm run test`)
- [ ] Acceptance test scenarios created with dual tags (`@FR_<EE><NN>` and `@story_2_1`), exactly one tier tag (`@e2e` or `@service`), and `@web` on every `@e2e`
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

- [x] Behaviour shipped before this story was written (AC: 1–6, FR: FR-0201..FR-0206)
- [ ] Acceptance scenarios for every AC in the epic-2 feature file under `test/acceptance/features/` (AC: 1–6)

## Dev Notes

- `functions/lib/persona.js` is compliance-bearing, and AC-1 and AC-3 test it. Read `functions/CLAUDE.md`
  § persona.js is compliance-bearing before changing either.
- The card is proposed by Sol and sent by the visitor: `functions/lib/CLAUDE.md` § The tool proposes,
  the visitor sends. Phone-only leads: § Phone-only leads.
- Frontend: `src/components/chat/`. Local dev serves `/api/chat` from `vite.config.js`, so the dev server
  needs only `GOOGLE_AI_API_KEY`.

### Test Requirements

- Feature file: `test/acceptance/features/epic-2-<slug>.feature`; steps: `test/acceptance/steps/test_epic_2.py`
- Every scenario tagged: `@FR_02NN @story_2_1` plus `@e2e @web` or `@service` (underscores — a hyphenated tag matches no gate)
- UF-01 (happy path, A1, A2, E1, E2) runs through these FRs, so `user_flows.feature` covers them too.

### Project Structure Notes

- No structural change: this story records shipped behaviour.

### References

- [Source: _bmad-output/planning-artifacts/PRD.md § F-002 — FR-0201..FR-0206]
- [Source: _bmad-output/planning-artifacts/user-flows/user-flows.md § UF-01]

## Dev Agent Record

### Agent Model Used

None. This is an as-built baseline, and no implementation ran under this story.

### Debug Log References

### Completion Notes List

- 2026-11-06: story written at BMAD setup to trace the shipped behaviour.

### File List
