# Feature: Nanoemulsified Mushrooms Landing Page

## Related Prompt
Create a compelling, well-designed, beautiful, very professional, easy-to-navigate React landing page for Cannasol Technologies’ **Nanoemulsified Mushrooms** offerings: **Lion’s Mane**, **Reishi**, and **Cordyceps**.

## Goal
Add a new landing page route that presents Cannasol Technologies’ nanoemulsified mushroom ingredients in a premium, B2B-friendly layout, consistent with the existing site styling.

## Scope
- Add a new route: `/mushrooms`.
- Add a new page component: `MushroomsLandingPage`.
- Add navigation entry points so visitors can discover the mushrooms page.

## Content Requirements
### Hero
- Headline: “Nanoemulsified Functional Mushrooms” (or equivalent)
- Subheadline that highlights:
  - fast absorption / bioavailability
  - consistent dosing
  - beverage-friendly integration
- Primary CTA: “Request Samples” or “Contact Sales” (routes to `/contact`)

### Product Section
Display 3 product cards:
- Lion’s Mane
- Reishi
- Cordyceps

Each card must include:
- a short “best for” line (e.g., focus, calm, performance)
- 2–4 bullet/line benefits (marketing-safe, no medical claims)

### Technology/Benefits Section
Explain nanoemulsification benefits:
- faster onset
- consistent distribution
- easier formulation
- scalable for RTD beverages

### CTA Section
- Secondary CTA to `/contact`
- Include phone/email callouts consistent with existing site patterns

## UX / Design Requirements
- Responsive layout (mobile-first)
- Use TailwindCSS and existing visual language (gradients, cards, subtle borders)
- Accessible headings and actionable elements (buttons/links with correct roles)

## Technical Requirements
- Centralize the theme configuration to avoid duplication across pages.
- Follow TDD:
  - write tests first
  - ensure tests pass before marking tasks complete

## Acceptance Criteria
- Visiting `/mushrooms` renders the new page.
- The page displays the three offerings by name.
- The page includes a CTA that navigates to `/contact`.
- Automated tests cover:
  - route rendering
  - presence of key content (hero + product titles + CTA)
- `docs/planning/implementation-plan.md` is updated and tasks are checked off upon completion.
