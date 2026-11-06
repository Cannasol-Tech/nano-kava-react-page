---
ACs:
  AC-1:
    summary: "{{ac_1_summary}}"
    frs: [FR-<EE><NN>]
    levels: [L4]
---

# Story {{epic_num}}.{{story_num}}: {{story_title}}

Status: ready-for-dev
Blocked: false
Blocked-Reason:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->
<!-- ACs: map per docs/SOP/story-frontmatter.md; levels per _bmad-output/project-context.md § Test Levels -->

## Story

As a {{role}},
I want {{action}},
so that {{benefit}}.

## Acceptance Criteria

<!-- Given/When/Then. Each criterion cites the FR-<EE><NN> it validates from _bmad-output/planning-artifacts/PRD.md -->

1. **Given** [context], **when** [action], **then** [observable outcome]. `FR-<EE><NN>`
2. **Given** [context], **when** [action], **then** [observable outcome]. `FR-<EE><NN>`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-<EE><NN> | AC #1 | @FR_<EE><NN> @story_{{epic_num}}_{{story_num}} |
| FR-<EE><NN> | AC #2 | @FR_<EE><NN> @story_{{epic_num}}_{{story_num}} |

## Definition of Done

- [ ] All acceptance criteria are met and verified at the level declared in `ACs:`
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (`npm run test`)
- [ ] Acceptance test scenarios created with dual tags (`@FR_<EE><NN>` and `@story_{{epic_num}}_{{story_num}}`), exactly one tier tag (`@e2e` or `@service`), and `@web` on every `@e2e`
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

- [ ] Task 1 (AC: #, FR: FR-<EE><NN>)
  - [ ] Subtask 1.1
- [ ] Task 2 (AC: #, FR: FR-<EE><NN>)
  - [ ] Subtask 2.1

## Dev Notes

- Relevant architecture patterns and constraints
- Source tree components to touch
- Testing standards summary

### Test Requirements

- Feature file: `test/acceptance/features/epic-{{epic_num}}-<slug>.feature`; steps: `test/acceptance/steps/test_epic_{{epic_num}}.py`
- Every scenario tagged: `@FR_<EE><NN> @story_{{epic_num}}_{{story_num}}` plus `@e2e @web` or `@service` (underscores — a hyphenated tag matches no gate)
- If this story affects user flows, update `test/acceptance/features/user_flows.feature`

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- [Source: _bmad-output/planning-artifacts/PRD.md § F-0NN — FR-<EE><NN>]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
