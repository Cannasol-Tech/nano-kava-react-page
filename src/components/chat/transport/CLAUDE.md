# src/components/chat/transport/ — wire protocol

`useChatStream.js` (SSE to the `chat` function, message state) and `chatSession.js` (the
stored-transcript id). Nothing here renders. The server halves are `functions/lib/chat.js`,
`functions/lib/chatStore.js` and `functions/lib/chatLeads.js`.

⚠️ **`chatDigest.js` is retired and unreferenced** as of 2026-08-26 — the per-conversation beacon
was replaced by a daily server-side report. It is still on disk only because it is not in git.
See `functions/lib/CLAUDE.md § The daily report replaced the digest`.

## SSE contract

*Corrected 2026-08-26: the POST body gained `sessionId` and `page`; it previously carried
`messages` alone.*

`useChatStream.js` POSTs `{ messages: [{ role: 'user'|'model', text }], sessionId, page }` and
reads `data: {…}`
frames off `res.body.getReader()`. Event types: `text` (`delta`), `lead_proposed` (`fields`),
`tool` (`name`, `status`), `done` (`usage`), `error` (`message`), plus `nano_explainer`,
`sample_quiz` and `share_authorized`. History is capped at 20 messages client-side.

*Corrected 2026-08-26: this said "`system` messages are local-only and are filtered out of the
outbound payload". Most still are — but a system message carrying a `toModel` string is sent, as
a `user` turn, because the server rejects any other role. That is the only way a refused overlay
can stop Sol describing it; see `../engagement/CLAUDE.md § One modal at a time`.*

The endpoint is a sibling Cloud Function and may not be deployed. Every failure — non-OK status,
missing body, network error, `error` frame — resolves the pending assistant turn to a message
carrying `(216) 921-2240`, so the transcript never shows a stack or an empty bubble.

## The greeting is client-owned

*Corrected 2026-08-25. This previously read: "`requestGreeting` seeds the bubble with the
hardcoded `FALLBACK_GREETING` marked `pending`, and the first server token replaces it." That
was true until the greeting rotation landed.*

`requestGreeting` now picks from `GREETINGS` in `useChatStream.js` and makes **no request at
all**. Three reasons, in order of weight:

1. **Variety has to survive production.** Stephen, 2026-08-25: *"he is saying the same greeting
   every time. Maybe mix it up some?"* A client-picked opener that the server then overwrites
   is varied only when the endpoint is down — which is why it looked fixed in production and
   random locally. Owning it client-side is the only version that actually rotates.
2. **There was nothing to generate.** The greeting was streamed with an empty history, so the
   model had no context to adapt to and returned a near-constant opener for a full round trip.
3. It removes a model call and its latency from every session.

`persona.js` still exports `GREETING`, and `chat.js` still re-exports it. Nothing reads either
one — the greeting was never short-circuited server-side. Left in place rather than deleted
because `functions/` is compliance-bearing and out of scope for a front-end change; if you are
in that file anyway, it is dead.

**Every variant must stay claim-free.** `src/test/greeting.test.js` asserts each one names Sol,
ends on a question, and matches no health or dosing vocabulary. That test is the guard rail —
kava is an ingestible and the greeting is the single most-read sentence in the widget.


## The transport does not invent notes

*Added 2026-09-08.* `useChatStream` forwards a `sample_quiz` frame to `onQuiz` and stops there. It
used to append `QUIZ_NOTES.unavailable` whenever that returned `false`, which was wrong once a
refusal could mean "they already answered" — a case whose note the visitor must not see. The note
is chosen by `utils/quiz.js`, which owns the session flags, and reaches the panel over
`subscribeQuizNotice`. See `../engagement/CLAUDE.md § One modal at a time`.

The request body also carries `quizAnswered`, read from that same module: the server withholds the
picker tool on it (`functions/lib/CLAUDE.md § The picker is offered once`).

## Tool calls are not narrated

A successful tool call gets **no** system line. Its result is already visible — the lead card, the
scale visual, the three-tap picker — and narrating it on top produced the worst bug of the
2026-08-25 batch: `describeTool` returned `'Sent to Josh ✓'` for every non-error tool event, so
tapping the quiz announced a send to a visitor who had given no name, no email and no
confirmation. It was wrong for the lead tool too, which only ever *proposes*.

Only `status: 'error' | 'failed'` produces a line now, and it says the action did not work rather
than claiming anything about email. `src/test/toolNarration.test.jsx` asserts that no successful
tool — of any name — can print "sent".

**If you add a tool, do not add a success message for it.** The rule that keeps this honest is
that the UI states what happened, and only the lead card's own Send state may ever say "sent".


## The session id

`chatSession.js` mints one id per **browser**, held in `localStorage` under `sol:session-id`, and
`useChatStream` sends it with every turn. It is the document key the server files the stored
transcript under — see `functions/lib/CLAUDE.md § Transcript persistence`.

**It is not a security token and must not become one.** It identifies a conversation for
appending, nothing more: the server refuses to read a transcript back to anyone, so guessing an
id buys nothing. `crypto.randomUUID` is used where available purely to avoid collisions, and the
`Date.now()`-plus-`Math.random()` fallback for insecure origins is fine precisely because of that.

Two things it has to survive:

- **Safari private mode throws on `localStorage` access** rather than returning null, so both
  reads and writes are guarded — the same rule as `../CLAUDE.md § sessionStorage keys`. An id that
  cannot be stored still lives in a module memo for the life of the page, so the conversation
  still appends correctly; only a full re-mount would fork it into a second document.
- **The server's guard is two patterns, not one**, and this file declares both a second time:
  `/^[A-Za-z0-9_-]{8,64}$/` for the charset, and `/^__.*__$/` for ids Firestore **reserves**.
  *Added 2026-08-26 after `functions/test/chatPipeline.test.js` caught it: `__proto__` passes the
  charset, Firestore rejects any `__.*__` document id by throwing, and both stores swallow throws
  — so that visitor's every turn would have been lost in silence.* The duplication is deliberate
  (importing a CommonJS module out of `functions/` into the browser bundle costs more than it
  saves) and `src/test/chatSession.test.js` imports the server's own `isValidSessionId` to assert
  the two agree, including over 500 freshly minted ids. If you change one, that test fails.

A stored value the pattern rejects is replaced rather than sent, so a stale or hand-edited key
cannot make the server drop every turn silently.

**One browser, one transcript.** *Corrected 2026-08-26: this read "One tab, one transcript" and
argued for `sessionStorage`. Asked directly, Stephen chose to stitch return visits together, so it
is `localStorage`:* a visitor's tabs and their visit tomorrow all append to the same stored
conversation, which is what makes a prospect's history readable as one thread.

Two consequences that follow, and neither is a bug:

- **It is a persistent identifier**, which the `sessionStorage` version was not. It survives the
  visit, so the 90-day retention in `functions/lib/CLAUDE.md § Transcript persistence` now covers
  a returning visitor's whole history rather than one sitting.
- **The panel still forgets.** The message list is React state and does not survive a reload — so
  the visitor sees a fresh conversation while the server appends to the existing document. That is
  intended: the transcript is a record for us, not a session the visitor resumes.

## Nothing is dropped mid-stream

*Added 2026-08-26 from a bug report.* `send()` used to `return` outright while a reply was
streaming, and `ChatPanel` marked the quiz answers sent *before* calling it. A fast tapper
finishes the three-tap picker in ~660ms — well inside Sol's first sentence — so the answers hit
the guard, vanished, and the `quizSentRef` guard blocked every retry. The lead was simply lost.

`send()` now **queues** a turn arriving mid-stream and flushes it from an effect when
`isStreaming` falls, and it **returns whether the turn was accepted** so a caller can refuse to
mark it sent. Both halves matter: the queue fixes the race, the boolean stops a caller recording
a send that did not happen.

One slot, not a list — a second queued turn replaces the first. Only programmatic senders reach
this path (the quiz result, a nudge question, `initialQuestion`); the composer is disabled while
`isStreaming`, so a visitor cannot stack turns.
