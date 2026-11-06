# test/acceptance — traps and decisions

How to run it and the layout: `README.md`. This file holds what the code cannot say. Every `##`
heading is cited from code as `CLAUDE.md § <heading>`, so grep before renaming one.

## Two targets

`APP_URL` (default the Vite dev server on :3000) is for everything interactive. `SITE_URL`
(production) is for what only real hosting shows: the 404 status, the prerendered HTML read with
JavaScript off, head tags, JSON-LD, sitemap, `llms.txt`. The dev server has none of that: it serves
`index.html` for every path with a 200 and no prerender. **Production is GET-only.** A POST there
emails the sales team and writes production Firestore, so `support/guard.py` aborts every non-GET to
`SITE_URL` or the Cloud Functions and fails the scenario at teardown. Canonical URLs are compared to
`https://enjoynano.com` whatever `SITE_URL` says, because `src/seo/routes.js` hard-codes that origin.

## The contact form posts to production

**Found 2026-11-06, a product bug left in place (no product code may change here).**
`src/components/ContactPage.jsx` posts to the hard-coded production `sendContactEmail` URL even
under `make dev`. `LeadCard.jsx` and `useChatStream.js` switch to `/api/...` on `import.meta.env.DEV`;
the form does not. So a local form test queues a real lead and, 20 minutes later, emails the team.
The guard forwards that one request (`POST …/sendContactEmail`) to the dev server's
`/api/sendContactEmail` DRY RUN. That runs the same `validateLead` and queue as the deployed function,
so the response the form renders is real; only the destination changed. The CORS preflight is
answered by the guard. Every other production function call is refused. Delete the forwarding once
the form gains its own `DEV` branch.

## The contact form's message is optional, the backend's is not

The second contact bug, and the reason one FR-0301 scenario is `@wip`. The form asks for a message
only when "Other" is chosen (`getErrors`), but `functions/lib/leads.js validateLead` requires one. A
visitor who picks "Request Samples" and leaves the box empty passes client validation, posts, gets
a 400 and sees "Failed to send message" with no field named. Fixing either side (the form flags
Message, or the backend accepts an empty one) turns the scenario XPASS, and strict xfail then reds
the run until `@wip` is removed.

## Sol opens himself at load on desktop

Measured 2026-11-06 on dev AND production: `sol:proactive-shown` is written ~200–380 ms after load,
with the launcher still `sol-launcher--pending`. That is the scroll-depth trigger, not the 3.8 s
greeting. `ChatWidget` plants its 40% sentinel from `scrollHeight` on mount, while the lazy route is
still suspended and the page is one viewport tall. So it intersects at once (`createRoot` replaces the
prerendered snapshot, so production is short at mount too). The panel auto-opening on desktop is by
design and no FR forbids it. But it fires early and logs `sol_chat_open` with trigger `scroll-depth`
on every desktop load. The suite's visitor therefore closes a self-opened panel (`dismiss_greeting`,
which writes `sol:dismissed`) before "opening Sol from the launcher". On a phone `popIn` returns
early, so FR-0206 is unaffected.

## Sol is a live model

Every reply is a real Gemini call through the dev server's `/api/chat`, using the `.env`
`GOOGLE_AI_API_KEY`. That key is `nano-kava-sol-dev` and is prepaid, and a $0 balance shows up as the
"can't reach my knowledge base" reply that `SolReply.is_offline` names. Assertions are structural:
- **Streamed** means a `MutationObserver` saw at least two distinct partial lengths of the new
  bubble (measured: 64 → 189 → 306 → 382 characters).
- **No claim**: forbidden efficacy phrases are matched per sentence and skipped when that sentence is
  negated. A correct decline reads "our ingredients do not treat, cure, or relieve…", and a bare regex
  flags it.
- **The card**: one plain follow-up nudge if Sol answers with a question instead of proposing.

The dev limiter allows 30 messages/hour per IP. A full run sends ~12, so repeated runs against one
*reused* server can trip it; a suite-started server resets it.

## The review link comes from the log

The dry-run lead handler prints `review link: http://localhost:3000/sol-review?token=…` for each
lead POST. This is the only way a local run can get a token. `support/dev_server.py` marks the log
offset before a submission and waits for a link after it. It keeps only the token and rebuilds the
URL from `APP_URL`, because the printed port is hard-coded. A server the suite did not start has no
log: set `DEV_SERVER_LOG` to its output, or let the suite start its own.

## One visitor per scenario

`Visitor.unique()` gives every scenario its own `+tag` email. The in-memory queue keys a lead on the
person, and locally `notifyCount` never advances, so two scenarios sharing an email share
`reviewId {contactKey}_0`. One scenario's saved review then shows up as another's "nothing saved".

## The review form hides its inputs

`reviewForm.js` renders radios and checkboxes at `opacity: 0; width: 0` behind styled `<span>`
pills, so Playwright's `check()` refuses them as invisible. `ReviewForm.choose` clicks the pill's
`<label>`, as a reviewer taps it. State is read with `to_be_checked`, which does not need visibility.

## An email the app rejects but the browser accepts

The email input is `type="email"` with no `noValidate`, so a value without `@` is blocked by native
validation. React's `onSubmit` never runs and the app's own error never renders. The invalid email
under test is `dana.reyes@example`: HTML accepts it, the app's `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` does
not, so the app's validation path is what gets exercised.

## Evidence never gates

The generator and archiver run soft-fail from `pytest_unconfigure`, so a broken toolkit cannot change
the product's verdict. Verified by pointing `ACCEPTANCE_REPORT_GENERATOR` at a script that raises.
That makes every evidence failure silent, which is why `make check-evidence` exists as the separate
gate. The rules:
- **Report only on a complete run.** `corpus.is_complete_run` counts testcases against the
  `Scenario:` lines rather than reading `FR=`/`-m`, which also catches crashes and deselects.
- **A report only describes the JUnit it was rendered from.** Its meta carries that JUnit's sha256,
  and both the archiver and the gate refuse a stale `latest/`.
- **A skip still counts.** FR-0401 skips without `DEPLOYED_E2E=1` and still writes a `<testcase>`, so
  the completeness count holds. Deselecting it instead would make every run "partial".
- **The corpus, the suite name and every path** live in `corpus.py` and nowhere else.

## The cd-pipeline pin

`silverline-cd-pipeline @ …@v1.0.0` in `requirements.txt` is the newest ref despite the number, and
the only one with packaging metadata; `v1.4.0` has no `pyproject.toml`. Installed from public GitHub
on 2026-11-06 with no credential. v1.0.0 assumes things this repo breaks, and
`scripts/generate_functionality_report.py` corrects them:
- It derives category as `id.split('-')[0]`, which is `FR` for every id, so the category is rebuilt
  from `FR-<EE>`.
- It approximates pytest-bdd test names, so the real `make_python_name` replaces it.
- It loads a `requirements_manifest` at import, so one is built from the PRD and preloaded into
  `sys.modules`. The PRD stays the only requirement list.

Its feature header still renders the code larger than the name; that fix landed after v1.0.0.

## Shared steps need a star import

pytest-bdd 7 registers a step as a fixture in the module that defines it, so `steps/common.py` is
star-imported into every `test_*.py` (`from common import *`). Steps only reach the scenarios of
modules that import them, and conftest-level steps would leak into every module. pytest-bdd 7.3 on
pytest 8.4 also warns `usefixtures() … has no effect` once per scenario. That is harmless, and it is
filtered in the root `pytest.ini`.
