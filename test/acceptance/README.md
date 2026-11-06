# test/acceptance — FR-level acceptance suite

pytest-bdd + Playwright (Python), driving the installed Google Chrome. One scenario per
requirement at minimum, every scenario end to end, and every complete run leaves a
functionality report. Traps and decisions live in `CLAUDE.md` beside this file.

## Run it

```bash
make acceptance-setup          # .venv (python3.12) + test/acceptance/requirements.txt
make test-acceptance           # whole suite → JUnit + functionality report + archive
make test-acceptance FR=0101   # one requirement → JUnit only, no report
make test-acceptance STORY=2.1 # one story → JUnit only, no report
make check-evidence            # did the run leave real evidence?
make check-scenario-levels     # tag lint
```

`HEADED=1` shows the browser. `ACCEPTANCE_BROWSER_CHANNEL=` (empty) uses Playwright's bundled
Chromium instead of installed Chrome (needs `playwright install chromium`).

## Two targets

| Variable | Default | Used for |
|---|---|---|
| `APP_URL` | `http://localhost:3000` | Everything interactive: pages, Sol (live model via the dev server's `/api/chat`), the contact form (DRY RUN), `/sol-review` (in-memory) |
| `SITE_URL` | `https://enjoynano.com` | What only real hosting shows: the 404, prerendered HTML with JavaScript off, head tags, JSON-LD, sitemap, `llms.txt`. **GET only.** |

If nothing answers on `APP_URL`, the suite starts `npx vite` itself, logs to
`test-results/dev-server.log` and stops it afterwards. Sol needs `GOOGLE_AI_API_KEY` in the root `.env`.

`DEPLOYED_E2E=1` runs FR-0401 against the **deployed** functions (~25 min, emails the sales
team); without it that scenario is skipped and still appears in the JUnit.

## Layout and tags

| Path | Holds |
|---|---|
| `features/epic-<N>-*.feature`, `features/user_flows.feature` | The corpus — one file per epic, plus UF-01..03 |
| `steps/test_epic_<N>.py`, `steps/test_user_flows.py` | Steps only that file uses |
| `steps/common.py` | Steps two or more files use |
| `support/` | Page objects, the dev server, the production guard |
| `corpus.py`, `functionality_report.py` | The evidence chain's paths and its emit layer |

Every scenario carries `@FR_<EENN>`, `@story_<E>_1`, exactly one tier (`@e2e` or `@service`)
and, for `@e2e`, the one surface `@web`. Epic files carry `@feature_F_00N`; user flows add
`@UF_0N`. `@wip` is a **strict** xfail. Underscores, never hyphens.

## Evidence

| Artifact | Where |
|---|---|
| JUnit | `test-results/e2e-results.xml` |
| Report (latest) | `test-results/functionality-report-e2e/latest/` |
| Archive (tracked) | `_bmad-output/test-artifacts/functionality-reports/runs/<UTC>-e2e-<sha>/` |
| Traceability matrix | `docs/REQUIREMENTS_TRACEABILITY_MATRIX.md` |
