# Phone transfer: Sol outage investigation (2026-11-06)

Handoff from a Mac session to Claude Code on the phone. **Investigation is done. No code has changed.** The
only commit is this file. Delete it once the work below is finished.

## Status in one line

Sol is down because **the Gemini API's prepaid credits ran out**. This is billing, not a code bug. Fix: top
up the AI Studio project that owns `GOOGLE_AI_API_KEY`. No code change or redeploy is needed.

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

1. **Top up credits.** Only Stephen can do this, at ai.studio/projects. Consider enabling auto-reload.
   Afterwards, re-run the curl above to confirm Sol answers.
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
4. **Shared key?** Sol's most expensive conversation ever cost $0.16. If the prepaid balance wasn't tiny,
   something else may share that AI Studio project or key. Unverified.
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
