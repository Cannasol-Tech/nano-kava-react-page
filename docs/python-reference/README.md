# python-reference/ — the chat backend, written twice

Every module here is an **exact-behaviour replica** of a JavaScript module that actually runs on
this site. Nothing in this directory is imported by the app, the Cloud Functions, the Vite dev
server or the build. It exists so the same logic can be read in a language you already think in,
next to the one you are learning.

**The JavaScript is the source of truth.** If the two ever disagree, the JavaScript is right and
the replica is the bug.

## Layout

| Python | replicates | What it does |
|---|---|---|
| `nano_kava/jsisms.py` | — | The JS coercion rules the others depend on. **Read this first.** |
| `nano_kava/chat_store.py` | `functions/lib/chatStore.js` | 30-turn cap, 90-day stamp, transactional upsert |
| `nano_kava/chat_request.py` | `functions/lib/chat.js` | Request validation, per-IP rate limiting |
| `nano_kava/chat_session.py` | `src/components/chat/transport/chatSession.js` | The stored-transcript id |
| `nano_kava/business_hours.py` | `functions/lib/businessHours.js` | Whether Josh's phone is answerable |
| `nano_kava/digest.py` | `functions/lib/digest.js` | Digest validation, escaping, recipients |
| `nano_kava/chat_digest.py` | `src/components/chat/transport/chatDigest.js` | Browser-side digest packing |

Each `tests/test_*.py` mirrors the matching `*.test.js`, with test names close to the JavaScript
`it(...)` strings so the two files line up when read side by side.

## Running both sides

```bash
cd docs/python-reference && python3 -m pytest      # 92 tests
cd ../.. && npx vitest run functions/test src/test # the JavaScript originals
```

## What was deliberately NOT replicated, and why

- **The Gemini streaming loop** (`streamChat`) — network I/O against a vendor SDK. A replica
  would teach you the SDK, not the language.
- **The SendGrid sends and the HTML email templates** — string concatenation at length; the
  interesting part (escaping, who receives it) *is* replicated.
- **`persona.js`** — a prompt, not code. It is also compliance-bearing; see
  `functions/CLAUDE.md § persona.js is compliance-bearing`.
- **The React hooks** — `useChatStream` is a state machine wired to React's scheduler. The pure
  helpers it calls are replicated; the hook itself has no Python analogue worth writing.

## The idiom map — where a naive translation silently disagrees

These are the actual traps, each one hit somewhere in this directory.

### 1. `??` is not `or`

```javascript
existing.page ?? clip(page)      // falls back ONLY for null / undefined
existing.turnCount || 0          // falls back for 0, '', false, NaN too
```
```python
nullish(existing.page, clip(page))   # `??`  → `x if x is not None else y`
falsy_or(existing.turn_count, 0)     # `||`  → truthiness
```
Python's `or` is the `||` twin, **not** the `??` twin. `page or default` throws away a
legitimately empty string; `page ?? default` keeps it. This is the single most common way to
mistranslate JavaScript, and in `chat_store.py` it is load-bearing: Firestore rejects an
`undefined` field value, so picking the wrong one loses data silently.

### 2. Empty collections have opposite truthiness

| Value | JavaScript | Python |
|---|---|---|
| `[]` / `{}` | **truthy** | **falsy** |
| `""` / `0` | falsy | falsy |
| `"0"` | truthy | truthy |
| `NaN` | falsy | — (`float('nan')` is truthy!) |

`if (someArray)` in JS asks "is this not null?"; `if some_list:` in Python asks "does it have
items?". They are different questions. `jsisms.is_truthy` spells out the JS answer.

### 3. `$` in a Python regex also matches before a trailing newline

```javascript
/^[A-Za-z0-9_-]{8,64}$/.test("abcdefgh\n")   // false
```
```python
re.match(r"^[A-Za-z0-9_-]{8,64}$", "abcdefgh\n")   # MATCHES — wrong
re.fullmatch(r"[A-Za-z0-9_-]{8,64}", "abcdefgh\n") # None — correct
```
This one is a security bug, not a curiosity: the session id becomes a Firestore document path.
`re.fullmatch` (or `\Z`, never `$`) is the faithful translation. There is a test for it.

### 4. Default arguments are evaluated at different times

```javascript
function persist({ now = new Date() }) { … }   // fresh Date on EVERY call
```
```python
def persist(now=datetime.now()):    # frozen at import — a classic Python bug
def persist(now=None):              # the correct spelling
    now = datetime.now(timezone.utc) if now is None else now
```

### 5. Indexing past the end

`array[array.length - 1]` on an empty JS array is `undefined` and flows on harmlessly.
`items[-1]` on an empty Python list raises `IndexError`. `additions_for` guards this explicitly —
in the JavaScript the same line needs no guard at all, which is exactly why it is easy to miss.

### 6. `slice(-0)` is not `[-0:]`

`arr.slice(-0)` is `arr.slice(0)` — the **whole** array, because `-0 === 0`. Python's `x[-0:]`
is also the whole list (same reason), but `x[-n:]` with a computed `n == 0` is a trap in code
that assumes it means "nothing". `js_slice_tail` makes the intent explicit.

### 7. `String()` is not `str()`

| Value | `String(v)` | `str(v)` |
|---|---|---|
| `true` | `"true"` | `"True"` |
| `null` | `"null"` | `"None"` |
| `3.0` | `"3"` | `"3.0"` |

JavaScript has one number type, so `3.0` and `3` are the same value and stringify identically.

### 8. Deleting from a mapping while iterating it

Legal in JavaScript (`Map` iteration tolerates deletes), a `RuntimeError` in Python. The
rate-limiter prune collects keys first — see `chat_request.py`.

### 9. `[...arr].reverse()` vs `reversed(...)`

`Array.prototype.reverse()` mutates, which is why the JavaScript spreads into a copy first.
Python's `list.reverse()` also mutates; `reversed()` and `sorted()` are the non-destructive
spellings. `extract_contact` has a test asserting the caller's list is untouched.

### 10. Optional chaining

`chunk?.candidates?.[0]?.content?.parts` short-circuits to `undefined` on any null link. Python
has no operator for this — the replicas use `getattr(x, "y", default)` or `.get()` chains, which
is why the JavaScript reads shorter here and is not being clever.

## Reading order, if you want a path through it

1. `jsisms.py` — the coercion rules everything else leans on.
2. `chat_session.py` + `src/components/chat/transport/chatSession.js` — smallest real pair.
3. `business_hours.py` + `functions/lib/businessHours.js` — dates and timezones in both.
4. `chat_store.py` + `functions/lib/chatStore.js` — the largest pair, and where traps 1, 4 and 5
   all bite at once.
