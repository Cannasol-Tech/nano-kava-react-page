# User Flows — Nano Kava Landing Page

As-built baseline, 2026-11-06. Every path below is exercised by `test/acceptance/features/user_flows.feature`.
Requirement IDs refer to `../PRD.md`.

## UF-01 — A prospect requests a sample through Sol

**Happy path**
1. A visitor lands on `/`. Sol's launcher is visible (FR-0101, FR-0201).
2. The visitor opens Sol and is greeted (FR-0201).
3. The visitor asks a product question and gets an answer (FR-0202).
4. The visitor asks for a sample. Sol shows the sample-request card (FR-0204).
5. The visitor adds a phone number or an email and presses Send. The card confirms it was sent (FR-0205).

**Alternative paths**
- A1: The visitor is on a phone. Sol shows a greeting bubble instead of opening, and the visitor taps
  to open (FR-0206).
- A2: The visitor gives only a phone number, no email. The card still sends (FR-0205).

**Error paths**
- E1: The visitor tries to send the card with neither a phone number nor an email. Send stays
  unavailable (FR-0205).
- E2: The visitor asks for personal dosing or health advice. Sol declines and keeps to product
  facts (FR-0203).

## UF-02 — A prospect uses the contact form

**Happy path**
1. From `/`, the visitor follows the sample-request call to action to `/contact` (FR-0103).
2. The visitor fills in name, email and message and submits.
3. The visitor sees a confirmation that names the follow-up (FR-0302).

**Error paths**
- E1: The visitor submits with a required field empty or an invalid email. The form names the field
  and does not submit (FR-0301).

## UF-03 — The team reviews a Sol conversation from the lead email

**Happy path**
1. A lead is submitted (UF-01 or UF-02) and, after the quiet period, one lead email arrives carrying
   the conversation (FR-0401).
2. The reviewer opens the email's review link and sees the questionnaire (FR-0402).
3. The reviewer scores it, submits, and sees "Saved" (FR-0404).

**Alternative paths**
- A1: The reviewer taps a star in the email. The form opens with that score preselected and says it
  is not saved yet (FR-0403).
- A2: The reviewer reopens the link later. The saved answers are shown for editing (FR-0404).
