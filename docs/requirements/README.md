# docs/requirements

The branded Functional Requirements reference (Internal Engineering Reference) for the Nano Kava landing page at enjoynano.com.

- `functional-requirements.html`: generated and self-contained, with the logos embedded and web fonts as the only external request. Never hand-edit it.
- `generate_functional_requirements.py`: the generator, Python 3 stdlib only. It parses FEATURES from `_bmad-output/planning-artifacts/PRD.md` on every run, so there is no second copy of the FR text. Each FR's state comes from `docs/REQUIREMENTS_TRACEABILITY_MATRIX.md`: an FR with several rows takes its furthest state, and a missing matrix or row means Planned. It exits non-zero if the PRD has no parseable FRs or the matrix uses an unknown Status.
- `assets/`: copies of `public/cannasol-logo-white.png` (dark ground) and `public/cannasol-logo.png` (light ground), the marks the site's nav uses.

Regenerate after any PRD or RTM change: `python3 docs/requirements/generate_functional_requirements.py`
