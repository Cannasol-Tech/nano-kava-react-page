# Phone transfer: Sol outage investigation (2026-11-06)

Handoff from a Mac session to Claude Code on the phone. **Investigation is done. No code has changed.** The
only commit is this file. Delete it once the work below is finished.

## Status in one line

Sol is down because **Google moved the Gemini billing account to prepay-only, and nobody switched it over**.
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

1. **Set up prepay.** Only Stephen can do this, on the billing page above. At about $10/month, $25–50 with
   auto-reload covers it. Afterwards, re-run the curl above to confirm Sol answers. Optional, later: give Sol its
   own key or project so the CRM can't take it down, or move it to Vertex AI on `nano-kava-landing-page`'s own
   billing. That second option is a code change and hasn't been verified.
2. **Alerting gap: why 9 days went unnoticed.** The widget header still says "online", and
   `functions/lib/dailyReport.js` lists conversations but has no count of failed or unanswered turns.
   Candidate fix: count turns with no model reply, or log model errors, and put that at the top of the
   08:00 report. The other option is an alert on the first 4xx from Gemini. Read
   `functions/lib/CLAUDE.md § The daily report replaced the digest` first.
3. **Caching looks broken: about 3x the cost per turn.** Every recent session has `usage.cachedTokens: 0`
   (about 13k prompt tokens per turn at full rate, about $0.010/turn). `functions/lib/CLAUDE.md § Prompt
   caching is implicit` documents a 58% hit rate and $0.0033/turn. The cause is not investigated. Check:
   (a) whether `systemInstruction` became non-byte-identical across requests; (b) whether `usageFrom` /
   `usageCost.js` still reads `cachedContentTokenCount` correctly.
4. **Shared key: confirmed.** See the table above. Sol shares its key and project with the CRM backend.
5. **Separate small bug seen in passing.** On 2026-10-21 (`93fe0229`), the sample-request chip got the
   empty-response fallback ("I can't answer that one here…") with `outputTokens: 0`. That matches the
   failure mode in `functions/lib/CLAUDE.md § Thinking budget`. Not investigated.
6. **Cleanup.** Delete the diagnostic doc `chatSessions/diag-probe-20261106`, or leave it to its 90-day
   TTL. It will appear in the next daily report.

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
