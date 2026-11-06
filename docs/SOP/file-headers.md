---
file: docs/SOP/file-headers.md
title: "File Header Standard"
author: Stephen Boyett
company: Cannasol Technologies LLC
date: 2026-05-14
version: 1.2
brief: "Required file header format for every source file, with per-language examples (TypeScript / TSX / Bash / Python). TS/TSX uses JSDoc `@`-prefixed tags so TypeDoc can auto-generate documentation."
---

# File Header Structure Standard Operating Procedure

## Required Format (Canonical — Python Reference)

```py
"""
file: <file-path>
author: Stephen Boyett

description:
    <Description of the files contents>


See Also:
    <files and documents that are related>

---
Copyright © 2026 Real Random LLC. All Rights Reserved.
---
"""
```

## Required Fields

| Field | Required? | Notes |
|---|---|---|
| `file` | Yes | Repo-relative path including the filename and extension |
| `author` | Yes | Name (and optionally email) |
| `description` | Yes | Multi-line block describing what the file does |
| `See Also` | Optional | Related files; encouraged for non-trivial modules |
| Copyright | Yes | The `Copyright © 2026 Real Random LLC. All Rights Reserved.` line bracketed by `---` separators |

**TypeScript / TSX field form:** TS and TSX files MUST use JSDoc `@`-prefixed
tags (`@file:`, `@author:`, `@description:`, `@See Also:`, `@Copyright`) so the
header is recognized by TypeDoc and auto-doc-generation tooling. Python and
Bash continue to use plain (non-`@`) field labels — `@`-tags are a TypeScript
ecosystem convention and would not be parsed by `pdoc` / `sphinx`.

## Per-Language Examples

### TypeScript (`.ts`)

Short / canonical example:

```typescript
/**
 * @file: src/services/ble/protocol.ts
 * @author: Stephen Boyett
 *
 * @description:
 *     Envelope codec and advertisement parser for the Real Random BLE
 *     protocol. Pure functions; no I/O. Used by both nativeTransport
 *     and the test simulator.
 *
 * @See Also:
 *     src/services/ble/transport.ts
 *     src/services/ble/service.ts
 *
 * ---
 * @Copyright © 2026 Real Random LLC. All Rights Reserved.
 * ---
 */
```

Expanded real-world example (test step-defs, multi-paragraph `@description:`):

```typescript
/**
 * @file: test/acceptance/steps/epic-1-foundation.steps.ts
 * @author: Stephen Boyett
 *
 * @description:
 *     Step definitions for scenarios in `features/epic-1-foundation.feature`
 *     (Epic 1 — Foundation, Branding & Design System).
 *
 *     Story 1.1 scenarios are pure-Node filesystem and process-spawn
 *     assertions that run under the default cucumber-js profile without a
 *     Detox runtime. The scenarios run AFTER `npx expo prebuild --clean`
 *     and `npm install` have produced the post-port repo state. Step
 *     bodies use only Node built-ins (`fs`, `path`, `node:child_process`)
 *     — no third-party parsers — so the runtime contract is minimal.
 *
 *     Argv-array process spawning (no shell interpolation) is used for the
 *     npm-ls check per the global no-shell-spawn SOP — the command name and
 *     its arguments pass through a fixed array, never a concatenated string.
 *
 *     One step-defs file per epic is the project convention. Phrases consumed
 *     by scenarios in 2+ epics get promoted to `steps/common.ts`.
 *
 * @See Also:
 *     test/acceptance/README.md
 *     test/acceptance/features/epic-1-foundation.feature
 *     test/acceptance/steps/common.ts
 *     test/acceptance/support/world.ts
 *
 * ---
 * @Copyright © 2026 Real Random LLC. All Rights Reserved.
 * ---
 */
```

### TypeScript JSX (`.tsx`)

```tsx
/**
 * @file: src/components/domain/CredentialRecord.tsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Ledger row component for an OAuth credential record. UNUSED records
 *     wrap in GradientFrame per Direction-D visual rule; USED records
 *     render as plain Card. Maps to FR-110 / FR-111 / FR-112.
 *
 * @See Also:
 *     src/services/keychain/types.ts
 *     src/components/environment/GradientFrame.tsx
 *
 * ---
 * @Copyright © 2026 Real Random LLC. All Rights Reserved.
 * ---
 */
```

### Bash / shell script (`.sh`)

```bash
#!/usr/bin/env bash
# file: scripts/run-detox-ci.sh
# author: Stephen Boyett
#
# description:
#   Wraps the Detox CI test invocation with deterministic environment
#   setup. Used by `make test-acceptance` when CI=1.
#
# See Also:
#   Makefile
#   .detoxrc.js
#
# ---
# Copyright © 2026 Real Random LLC. All Rights Reserved.
# ---
```

### Makefile

Makefiles use `#`-prefixed headers in the same shape as Bash. The header
block precedes the variable declarations and `.PHONY` lines.

### YAML / JSON

YAML and JSON do not get inline file headers — neither format treats `#`
or `//` comments consistently with the file-header convention. Substitute:
a sibling `README.md` in the same directory (per `docs/SOP/directory-readme-structure.md`)
captures the equivalent metadata.

## Validation

`make check-headers` walks every source file in `src/`, `test/`, and
`scripts/` and validates:

1. The header is present in the first 20 lines of the file
2. All required fields exist (`file`, `author`, `description`, copyright). For
   TS / TSX the validator accepts either the `@`-prefixed or plain form, but
   new TS / TSX files SHOULD use the `@`-prefixed form so TypeDoc can pick
   them up.
3. The `file` field matches the actual repo-relative path of the file
4. The copyright line uses the current year

Files that fail validation cause `make check-headers` to exit non-zero,
blocking the pre-commit gate.

## Excluded Files

- Auto-generated files (e.g., `ios/` and `android/` from `npx expo prebuild`,
  `node_modules/`, build artifacts) are excluded by `make check-headers`
  via a hard-coded skip list.
- Fixture files (`*.fixtures.tsx`) inherit the header format of their
  parent component file.

## Amendment History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-02-14 | Stephen Boyett | Initial Python-only example |
| 1.1 | 2026-05-14 | Stephen Boyett | Added per-language examples (TypeScript, TSX, Bash, Makefile); clarified YAML/JSON exclusion; documented `make check-headers` validation behavior and the auto-generated-file skip list. Driven by RRUA architecture work. |
| **1.2** | **2026-05-14** | **Stephen Boyett** | **Standardized TS / TSX on JSDoc `@`-prefixed tags (`@file:`, `@author:`, `@description:`, `@See Also:`, `@Copyright`) so TypeDoc can auto-generate documentation. Added an expanded real-world TS example (`epic-1-foundation.steps.ts`) showing multi-paragraph `@description:` usage. Updated validator note to prefer `@`-prefixed form on new TS / TSX files.** |
