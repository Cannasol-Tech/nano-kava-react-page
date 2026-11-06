# PRD — Nano Kava Landing Page (EnjoyNano)

Product of **Cannasol Technologies LLC**. Live at `https://enjoynano.com`.

**Status: as-built baseline (2026-11-06).** This PRD was written *after* the product shipped. Its
requirements describe behaviour that already exists, so the acceptance suite can prove it and later
work can be planned against it. It does not restate architecture: the root `CLAUDE.md` and the
directory `CLAUDE.md` files own that, and `_bmad-output/planning-artifacts/architecture.md` points to them.

## Product summary

The site is a B2B landing page for Cannasol's ~20 nm nano kava emulsion and its nano mushroom line.
It turns visiting beverage brands into sample requests. It does that through four pages, an AI sales
concierge called **Sol**, and a lead hand-off that emails the sales team one email per prospect.

## Numbering

Requirements are numbered `FR-<EE><NN>`: a two-digit Feature number followed by a two-digit
sequence within that Feature. Feature number equals epic number. In `.feature` files the tag is
`@FR_<EE><NN>`, with **underscores**. `@FR-0101` would match no gate.

| Feature | Name (client-facing) | Epic |
|---|---|---|
| F-001 | Site pages & discoverability | 1 |
| F-002 | Sol, the sales concierge | 2 |
| F-003 | Contact form | 3 |
| F-004 | Lead hand-off & Sol review loop | 4 |

## Functional Requirements

### F-001 — Site pages & discoverability

- **FR-0101** — Each public page (`/`, `/faq`, `/contact`, `/mushrooms`) loads and shows its own
  heading and the main navigation.
- **FR-0102** — The main navigation reaches every public page.
- **FR-0103** — The landing page's sample-request call to action leads the visitor to the contact page.
- **FR-0104** — An address that is not a page returns HTTP 404 with a not-found page, never a soft
  404 that serves the home page.
- **FR-0105** — Each public page's content is readable in the served HTML with JavaScript disabled,
  so crawlers that do not run JavaScript, including AI retrieval bots, can read it.
- **FR-0106** — Each public page ships exactly one `<title>`, one meta description and one
  canonical URL.
- **FR-0107** — Each public page carries JSON-LD structured data that identifies Cannasol
  Technologies as the organization.
- **FR-0108** — `sitemap.xml` lists every public page, and `llms.txt` is served as Markdown.

### F-002 — Sol, the sales concierge

- **FR-0201** — A visitor can open Sol from the launcher. Sol greets them by name ("Sol") and asks a
  question, and the greeting makes no health or dosing claim.
- **FR-0202** — Sol answers a product question in the conversation, with the reply streaming into
  the transcript.
- **FR-0203** — Sol declines personal dosing or health advice and does not state what an ingredient
  does to a person's body.
- **FR-0204** — When a visitor asks for a sample, Sol shows an editable sample-request card, filled
  in from the conversation, for the visitor to confirm.
- **FR-0205** — The sample-request card cannot be sent until it has a phone number or an email.
- **FR-0206** — On a phone-sized screen, Sol never opens itself. Only a tap opens the chat.

### F-003 — Contact form

- **FR-0301** — The contact form refuses to submit without a name, a valid email and a message, and
  says which field needs attention.
- **FR-0302** — A complete submission is accepted and the visitor sees a confirmation that names the
  follow-up.

### F-004 — Lead hand-off & Sol review loop

- **FR-0401** — One person's submissions, whether a chat card, the contact form or both, reach the
  sales team as **one** lead email after a 20-minute quiet period. The email carries every
  conversation that person had.
- **FR-0402** — The lead email's review link opens a questionnaire with four 1–5 scales (overall,
  knowledge, tone, hand-off), two checkboxes and one comment box.
- **FR-0403** — A star tapped in the email only preselects the overall score. Nothing is saved
  until the reviewer submits the form.
- **FR-0404** — A submitted review is confirmed with a "Saved" page. Reopening the same link shows the
  saved answers, so a second visit edits that review rather than filing another.

## Non-functional requirements

None are numbered yet. The measured performance budget in `src/CLAUDE.md § The measured budget` and
the compliance rules in `functions/CLAUDE.md § persona.js is compliance-bearing` are the
standing constraints. Number them `NFR-<EE><NN>` when a story first depends on one.
