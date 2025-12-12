# Software Testing Standards

## Goals
- Keep tests deterministic, fast, and readable.
- Prefer testing user-visible behavior over implementation details.
- Use a single test runner and a single set of helpers for the repo.

## Tooling (Frontend)
- **Runner**: Vitest
- **DOM environment**: jsdom
- **Rendering/queries**: React Testing Library
- **Assertions**: @testing-library/jest-dom

## Test Types
### Unit tests
- Test pure logic in isolation.
- No network calls.

### Component tests
- Render components and assert:
  - key headings/labels appear
  - primary CTAs exist and are clickable
  - navigation links point to the correct routes

### Routing tests
- Use `MemoryRouter` with `initialEntries`.
- Assert the correct page renders for a given route.

## Conventions
- Place tests next to the code or in `__tests__` folders.
- File naming:
  - `*.test.jsx` for React tests
- Follow the pattern:
  - Arrange (render)
  - Act (user-event)
  - Assert (screen queries)

## React Testing Library Guidelines
- Prefer `getByRole` / `findByRole`.
- Use accessible names that match visible text.
- Avoid `querySelector`.

## What to Assert (Landing Pages)
- Title/hero headline renders.
- Product cards render for each offering.
- Primary CTA(s) exist.
- Cross-page navigation exists (e.g., to Contact page).

## What NOT to Assert
- Animation timings.
- Exact Tailwind class strings.
- Pixel-perfect layout.
