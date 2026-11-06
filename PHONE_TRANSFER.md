# Phone transfer: Sol outage investigation (2026-11-06)

Handoff from a Mac session to Claude Code on the phone. **Investigation is done. No code has changed.** The
only commit is this file. Delete it once the work below is finished.

## Status in one line

✅ **RESOLVED 2026-11-06 ~21:00Z.** Stephen set up prepay, and a production probe streamed a full answer with
a tool call. The rest of this doc is the record plus the follow-ups.

Sol was down because **Google moved the Gemini billing account to prepay-only, and nobody switched it over**.
The balance is $0, so every call gets "prepayment credits are depleted". We did *not* overspend. Fix: Stephen
clicks **Set up prepay** and funds it. No code change or redeploy is needed.

**Corrected after the first handoff:** this doc first said the credits "ran out". AI Studio shows otherwise.

| | |
|---|---|
| Key Sol uses | `cannasol-crm-backend` in GCP project **`cannasol-client-db`** (#630919737597). It is **shared with the Cannasol CRM backend**, which is down too. |
| Billing account | "Cannasol Executive Dashboard" `0170DA-0365B6-0E7E8A`, Paid tier 2, $2,000 cap. Owner login `stephen.boyett@cannasolusa.com`. |
| Banner on the page | "billing accounts that are required to switch to prepay. Switch now to avoid service interruption." |
| Spend, Aug 9 – Nov 6 | **$30.89 total**, billed postpaid as normal. That's about $10/month for Sol and the CRM combined. |
| Who made the calls (75 days) | About 7,040 successful. Only 1,216 (17%) are Sol's `StreamGenerateContent`. The rest are non-streaming `GenerateContent` and `BatchEmbedContents`, calls this repo never makes, so they're the CRM. |
| Local `.env` key | **Identical to the prod secret**, so dev, e2e runs and bake-offs all bill to this project. |
| Heads-up | The **LIVEY** AI Studio project (`gen-lang-client-0454246966`) shows the same "Prepay required" status. |

Billing page: `https://aistudio.google.com/u/2/billing?billing=0170DA-0365B6-0E7E8A` (`/u/2` = the cannasolusa account in Chrome).

## Root cause (verified)

Every chat turn fails at `ai.models.generateContentStream` (`functions/lib/chat.js:421`):

```
402 RESOURCE_EXHAUSTED — "Your prepayment credits are depleted. Please go to AI Studio at
https://ai.studio/projects to manage your project and billing."
```

`functions/index.js:168` catches it and sends a generic SSE `error` frame. `useChatStream.js` turns that
into `OFFLINE_REPLY` ("I can't reach my knowledge base right now…"), the message Stephen saw.

Reproduce it from anywhere. Note that this writes a real `chatSessions` doc in prod:

```bash
curl -sS -X POST https://us-central1-nano-kava-landing-page.cloudfunctions.net/chat \
  -H 'Origin: https://nanokava.com' -H 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","text":"hi"}],"sessionId":"diag-probe-XXXXXXXX","page":"/"}'
# Broken: HTTP 200, first frame is {"type":"error",...}   Fixed: {"type":"text","delta":...} frames
```

## Timeline (from Firestore `chatSessions`)

| | UTC |
|---|---|
| Last successful Sol answer | 2026-10-26 21:09 (`af636e1e…`, a kava/kratom shot prospect "piloting now") |
| First failed turn | 2026-10-28 06:21 |
| Outage length at handoff | ~9 days, 100% of turns failing |

**8 sessions from other browsers never got one reply, and all 8 asked for samples.** (The chat report said 7 and
6; that was a miscount.) None reached the lead
card, so there is no contact info to recover. IDs: `10205259`, `0d1efd53`, `3e902a0e`, `506c1873`,
`8537d740`, `11ce6672`, `25a64306`, `d1b7e8b5`. Some may be team testing.

## Open items: Stephen to pick (nothing started)

1. ✅ **Done: prepay is set up.** For the record: only Stephen can do this, on the billing page above. At about $10/month, $25–50 with
   auto-reload covers it. Afterwards, re-run the curl above to confirm Sol answers. Optional, later: give Sol its
   own key or project so the CRM can't take it down, or move it to Vertex AI on `nano-kava-landing-page`'s own
   billing. That second option is a code change and hasn't been verified.
2. **Alerting gap: why 9 days went unnoticed.** The widget header still says "online", and
   `functions/lib/dailyReport.js` lists conversations but has no count of failed or unanswered turns.
   Candidate fix: count turns with no model reply, or log model errors, and put that at the top of the
   08:00 report. The other option is an alert on the first 4xx from Gemini. Read
   `functions/lib/CLAUDE.md § The daily report replaced the digest` first.
3. **Downgraded: the recording is fine.** The first probe after the fix returned `cachedContentTokenCount: 11566`,
   and Firestore stored `cachedTokens: 11566` and $0.0029. So `usageFrom` is correct, and the earlier zeros
   were real cache misses whose cause is unknown. Watch the daily report's cache-hit share; it's not urgent.
   Original note: **Caching looked broken: about 3x the cost per turn.** Every recent session has `usage.cachedTokens: 0`
   (about 13k prompt tokens per turn at full rate, about $0.010/turn). `functions/lib/CLAUDE.md § Prompt
   caching is implicit` documents a 58% hit rate and $0.0033/turn. The cause is not investigated. Check:
   (a) whether `systemInstruction` became non-byte-identical across requests; (b) whether `usageFrom` /
   `usageCost.js` still reads `cachedContentTokenCount` correctly.
4. **Shared key: confirmed.** See the table above. Sol shares its key and project with the CRM backend.
5. **Separate small bug seen in passing.** On 2026-10-21 (`93fe0229`), the sample-request chip got the
   empty-response fallback ("I can't answer that one here…") with `outputTokens: 0`. That matches the
   failure mode in `functions/lib/CLAUDE.md § Thinking budget`. Not investigated.
6. **Cleanup.** Delete the diagnostic docs `chatSessions/diag-probe-20261106` and `diag-probe-20261106b`,
   or leave them to the 90-day TTL. Both will appear in the next daily report.
7. ✅ **DONE 2026-11-06 21:12Z.** I merged `fix/sol-review-hardening` into `main` and deleted it, bumped
   the functions to Node 22, and ran `make deploy-functions`. All 754 tests passed, and
   `make verify-release` passes 14/14 (run with
   `CLOUDSDK_CORE_ACCOUNT=stephen.boyett@cannasolusa.com`). `chat` runs on secret v2, the
   `nano-kava-sol-prod` key; Cloud Monitoring shows no old-key traffic after the deploy. Recorded in
   `functions/CLAUDE.md § The Gemini key and its billing`. History follows.
   **Was: half done.** In `nano-kava-landing-page`, which bills to "Firebase Payment"
   (prepay, $10 balance, auto-reload on), I created `nano-kava-sol-prod` (uid `69c3e386…`) and `nano-kava-sol-dev`
   (uid `18b72ade…`). Both are restricted to the Gemini API, and both were tested. Prod is **stored as secret
   `GOOGLE_AI_API_KEY` version 2**, but production still runs version 1 (the old CRM key, which works). The local
   `.env` uses the dev key now.
   **Blocked:** `firebase deploy` refuses: **"Runtime Node.js 20 was decommissioned on 2026-10-30."** No function
   can be deployed until `functions/package.json` `engines.node` moves to 22. A direct
   `gcloud run services update --update-secrets` crashed on Firebase's secret annotation; it was abandoned and
   nothing changed. **Production code is `fix/sol-review-hardening` (47973a9), not `main`**: 7 of 19 function
   files differ, so a deploy from `main` would roll back the lead ledger. Proposed path: merge that branch into
   `main`, bump Node to 22, run the tests, then `make deploy-functions`. That deploy also picks up secret v2.
8. **Rotate the SendGrid key.** The Sep 28 deploy uploaded `functions/.env.disabled-plaintext-sendgrid`, which
   holds a plaintext `SENDGRID_API_KEY`, into the function source zips in `gcf-v2-sources-103851289661-us-central1`.
   The file is gone from the Mac and the next deploy won't include it, but the old zips still have it.

Original plan for item 7: Import `nano-kava-landing-page` into AI Studio and make a Sol key there; that
   project bills to a different account, "Firebase Payment" `013159-10F781-89BE45`, and it isn't known yet
   whether that account requires prepay. Make a dev key for `.env` too. To roll it out:
   `pbpaste | npx firebase functions:secrets:set GOOGLE_AI_API_KEY --project nano-kava-landing-page --data-file=-`,
   then `make deploy-functions` (the function only reads the secret version it was deployed with). Keep
   the old "cannasol-crm-backend" key, because the CRM uses it.

## Branches (end-of-session sweep)

- Deleted the merged local branches `copy-update/ingredient-brief` and `main-css-anim`.
- **Unmerged, needs a decision:** `origin/fix/sol-review-hardening` is 3 commits ahead of main (2026-09-28):
  "every lead is ledgered until emailed, stars preselect, and it is Sol not LIVEY", plus a release-check
  fix and an SEO regen. It is unrelated to the outage, but it is Sol work that never landed.
- Merged on the remote and safe to delete, not done because pushes that delete need Stephen's say-so:
  `claude/landing-page-tests-calculator-hHcf7`, `claude/sol-lead-email-reviews-pdfeq0`,
  `copilot/extract-nano-mushrooms-page`, `main-css-anim`, `main-latest`.
- Stale and unmerged: `main-latest-v3` (2026-03, 1 ahead) and `main-latest-v3-optimized` (2026-02, 2 ahead).

## What the phone session can and cannot do

- **Can:** read and edit code, run the `vitest` suites (`npm run test`, `cd functions && npm test`), and run
  the curl probe above.
- **Cannot:** read prod logs or Firestore, or deploy. Those need Firebase CLI auth on the Mac. Deploy is
  `make deploy-all` for functions, never a bare `firebase deploy` (see root `CLAUDE.md § Deployment`).
- **How the logs were read, for later on the Mac:**
  `npx firebase functions:log --only chat --project nano-kava-landing-page --lines 40`. 200+ lines fails.
  `gcloud` is logged in as an unrelated service account and gets PERMISSION_DENIED.
