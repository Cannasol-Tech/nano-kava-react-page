# src/components/chat/engagement/ — getting and keeping attention

Everything Sol does to start a conversation rather than wait for one: `sectionPrompts.js` and
`SolNudge.jsx` (contextual nudges), `launcherEscalation.js` (scroll-depth escalation) and
`sampleQuiz.js` (the three-tap intent picker).

**One theme runs through all of it: restraint is the feature.** Every policy here is a pure
function with tests, because the difference between a helpful nudge and a popup is entirely in
when it declines to fire.

## Section-aware nudges

Idea #23. Once a visitor **settles** on a section of the landing page, Sol raises one contextual
bubble above his launcher; tapping it opens the panel with that question already asked, so the
nudge starts a conversation instead of an empty box. `sectionPrompts.js` holds the ladder and the
policy, `hooks/useSectionDwell.js` decides when a section counts, `SolNudge.jsx` draws it, and
`ChatWidget` owns the state.

**The ask escalates with depth**, because a visitor at the benefits block is still deciding
whether to care and one at the proof block is comparing suppliers:

| Section | Intent | Asks for |
|---|---|---|
| `benefits` | educate | why it stays clear |
| `process` | sample | a sample in their own base |
| `proof` | proof | what others ship, then a sample |
| `dosing` | cost | cost per serving at the recommended dose |
| `contact` | close | samples sent out |

*Added the `dosing` row 2026-09-09.* The `#calculator` section (the savings calculator) never had
a prompt here — a nudge toward a calculator that argued against the product was never wanted. The
ingredient brief replaces it with an honest dosing & cost-per-serving section, so it earns one now.
**The landing page still had `id="calculator"` on the section when this was written** — the prompt
below is keyed to `section: 'dosing'` per the copy-update plan's instruction to match whichever id
the section lands on; until the landing page lane renames the element to `id="dosing"`, dwelling on
that section will not raise this nudge. Reconcile the two ids together.

Three of the five questions name a sample. That is the point of the feature.

**The restraint rules are the feature, not decoration.** All of them live in `nextPrompt` as one
pure decision, and `src/test/sectionPrompts.test.js` asserts each:

- **Dwell, not scroll depth.** A section must hold 35% of the viewport for `DWELL_MS` (2.5s).
  Scrolling past fast is not interest, and nudging on it is what makes these things hated.
- **Two per session, then silence.** Three is nagging.
- **A 25s cooldown** between them, so a fast reader is not chased down the page.
- **One wave-off ends all of them** for the session (`sol:nudge-dismissed`). A visitor who
  dismissed one has answered the question for the rest.
- **Silent while the panel is open** — they are already talking to him.
- **Silent after conversion** (`sol:converted`, written by `LeadCard` on a successful send).
  Continuing to sell to someone who already said yes is the fastest way to sour a new customer.

Dwell uses `IntersectionObserver`, never a scroll listener, for the reason in § Proactive pop-in
trigger. The hook retries attaching for up to 6s because routes are lazy and the sections do not
exist when `ChatWidget` first mounts.

**Interaction with the load sequence:** Sol opens himself at 3.8s, so nudges only come into play
once the visitor closes him. That is intended — the bubble is a re-engagement device, not a
second thing shouting alongside an open panel.

## The three-tap intent quiz

Idea #21. Format, volume, timeline — then Sol has a brief without anyone filling in a form.
Reached three ways: a chip in Sol's quick replies, and the `open_sample_quiz` tool he calls when
someone is clearly building a beverage but has not said what. `SampleQuiz.jsx` shares the modal
shell with `NanoExplainer` (`components/CLAUDE.md § The nano explainer`).

**The result is sent as the visitor's own turn, not as a pre-filled lead card.** *Changed
2026-08-25; it used to seed a card directly.* Stephen: "when it is [filled out] you can't see the
rest of the chat." Two things were wrong with the card version — it filled the panel and hid the
conversation, and it skipped the beat where the visitor actually agrees to anything.
`composeQuizMessage` produces "I'm building a seltzer or RTD, 10k+ units, this quarter.", Sol
recaps it, offers the sample in his own words, and the lead card arrives only when they say yes.

Three steps, and every step has an honest escape hatch ("Still deciding", "Not sure yet", "Just
researching") so nobody has to overstate their intent to get through it.

**Every completion carries an id, and the handoff keys on that — never on the composed text.**
*Added 2026-09-08 from a reported session.* A visitor answered the picker, Sol raised it again,
they answered it identically, and the second run reached him as nothing at all: identical answers
compose an identical string, so `ChatWidget`'s state bailed out and `ChatPanel`'s `quizSentRef`
saw a message it had already sent. No turn, no reply, no note — from their seat the chat had
simply stopped working. `completeQuiz` now stamps an incrementing id and `ChatPanel` deduplicates
on it. Two identical runs are two turns, because the visitor did the work twice.

**A picker they have answered is not raised again.** `completeQuiz` writes `sol:quiz-answered`,
`canOpenQuiz` reads it, and `functions/lib/chat.js` withholds `open_sample_quiz` from the model
entirely once the client reports it — see `functions/lib/CLAUDE.md § The picker is offered once`.
The client guard alone was not enough: with the tool still on offer the model called it, was
refused, and had already said "three quick questions just came up over the chat" in the same turn.
A tool that cannot work is not offered.


## The picker confirms before it advances

*Fixed 2026-08-25 from a bug report: tapping an option showed nothing until the next question
appeared, which then looked as though the next answer was already selected.*

Two faults, one symptom. `choose()` advanced the step in the same tick, so the tapped option was
gone before it could show anything; and `.sample-quiz__option:hover` was unguarded, so on touch the
stuck `:hover` landed on whatever option occupied that position in the *next* question.

- The tapped option is marked `aria-pressed` and `--chosen` for `SELECT_FEEDBACK_MS` (220ms)
  before the step advances. A tap must be acknowledged where the finger actually was.
- Hover styling is inside `@media (hover: hover) and (pointer: fine)`.
- `settlingRef` swallows a second tap during that window, so a double-tap cannot skip a question.

If you shorten `SELECT_FEEDBACK_MS`, keep it above ~150ms; below that the confirmation is not
perceptible and the bug is effectively back.

## One modal at a time

*Added 2026-08-26, from Stephen: "Sol just told me he opened the sample picker (which I don't
even know what that is and I cannot see it)."* Four separate faults produced that one sentence,
and each is a variation on the same mistake: **the code knew the picker was not on screen and
never said so.**

`SampleQuiz` and `NanoExplainer` both render `.nano-modal-root` at `position: fixed; inset: 0;
z-index: 80`, so two raised in one turn stack by DOM order and one sits under the other's scrim,
unclickable, while its tool has already reported `shown`. `utils/signal.js` therefore holds a
**single-occupant modal slot**: `openQuiz()` and `openExplainer()` claim it, `closeQuiz()` /
`closeExplainer()` release it, and a claim that loses returns `false`.

**Every open returns a boolean and every caller must act on it.** The refusal reaches the visitor
*and* the model as one `QUIZ_NOTES` entry — `{ text, toModel }` — appended through
`useChatStream`'s `appendNote`. A note carrying `toModel` is dialogue: it rides the wire as a
`user` turn, because `functions/lib/chat.js` rejects any role but `user`/`model`. A transcript
line the model never sees does not stop Sol saying "tap through it", which was the whole bug.

**`utils/quiz.js` owns the refusal note, not `useChatStream`.** *Corrected 2026-09-08; this
section previously said the transport appended it on `onQuiz()` returning `false`, and it did.*
Only the module holding the session flags can tell "the picker is unavailable" from "they already
answered", and those want opposite things said. Every refusal now goes out on the notice channel
`closeQuiz` already used, and the transport invents nothing.

Four refusals now speak:

| Refused because | Visitor sees | Model is told |
|---|---|---|
| Policy — already interrupted, or converted | "The sample picker didn't open." | ask the three in conversation |
| Another modal holds the slot | the same | the same |
| They already answered it | **nothing** | they answered; recap, do not re-ask |
| They closed it unfinished | "Sample picker closed." | do not raise it again |

A note with no `text` renders nothing — `Transcript` skips it. Telling a visitor that questions
they just answered were not asked again reads as an error they caused.

**A pending close cannot shut a picker that has since reopened.** `dismiss` holds its timeout in a
ref and the open handler clears it. A reply arriving inside the 240ms close animation used to be
raised and then killed by the previous run's timer — the picker flashed and vanished.

**The open signals replay.** `createSignal({ replay: true })` hands the last value to a late
subscriber, because `openQuiz()` can be called before `SampleQuiz` has subscribed — and a lost
`emit(true)` is exactly a tool reporting success with nothing on screen. Both signals emit `false`
on close, so a replay can never re-raise a closed modal.

**Escape closes one thing.** `ChatWidget` and both modals listened on `document` with no guard, so
one press dismissed the modal *and* unmounted `ChatPanel`, losing the conversation. The modals now
listen in the capture phase and `stopPropagation()`, and `ChatWidget` ignores Escape while
`isModalOpen()` — belt and braces, because at `AT_TARGET` capture buys no ordering.

## A chip tap is not an interruption

*Corrected 2026-08-26. `canOpenQuiz` previously took `alreadyShown`, backed by
`sol:quiz-shown`, and `openQuiz` wrote that flag on the forced path too.* A visitor who tapped
"Answer 3 quick questions" therefore burned the session's one uninvited open, permanently
disabling every later model-initiated open — which still returned `true` and still told the model
the picker was up.

The flag is now `sol:quiz-uninvited` and is written **only** when `force` is false. The parameter
is `uninvitedShown`, named for what it actually means. Asking for something is not the same as
being interrupted by it, and the ceiling exists only for the interruption.
