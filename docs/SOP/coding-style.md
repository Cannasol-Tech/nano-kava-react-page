---
file: docs/SOP/coding-style.md
title: "Coding Style Standards"
author: Stephen Boyett
company: Cannasol Technologies LLC
date: 2026-05-14
brief: "Coding style standards for this project. Defines consistency, readability, and maintainability rules for the codebase. v1.1 adds JS/TS-specific adaptations for the RN/Expo stack."
version: 1.1
---

# Coding Style Standards

## Purpose

This document defines the coding style standards for development work in this project. These standards ensure consistency, readability, and maintainability across the codebase.

## General Coding Standard Principles

### General Coding Principles

Always adhere to this standard when writing code in this project.

- **ALWAYS** write clean, easy to understand, modular, reusable, well documented code.
- **ALWAYS** execute tests using make targets only unless specifial permission is granted
- **ALWAYS** write code in a modular OOP format if possible
- **ALWAYS** write short, reusable functions with a clear, single purpose
- **ALWAYS** use descriptive comments to enable documentation generation
- **NEVER** write duplicate code
- **ALWAYS** check for similar or existing code before writing new code
- **ALWAYS** use the `scripts/` directory to store any scripts
- **ALWAYS** use the `docs/` directory to store any documentation
- **ALWAYS** use the `config/` directory to store any configuration files
- **ALWAYS** use the `test/` directory to store any tests
- **ALWAYS** use the `src/` directory to store any source code
- **ALWAYS** use the `lib/` directory to store any libraries
- **ALWAYS** use the `bin/` directory to store any binaries
- **ALWAYS** use the `build/` directory to store any build artifacts
- **ALWAYS** use the `dist/` directory to store any distribution artifacts
- **NEVER** implement any un-standardized functionality withouth verifying in detail with the Project Manager (Human User)
- **ALWAYS** verify that you are aligned with the Human/Project Manager's vision before implementing anything.
- **ALWAYS** adhere to `.bmad-core/core-config.yaml` as the highest source of truth for project configuration and rules **IF** available.
- **ALWAYS** us the `README.md` file at the root of a given directory for documenting and indexing the given directory.
- ***NEVER*** keep unnecessary files in the root directory

## Guidelines

- If you are ever unsure of any implementation details, ask for clarification before proceeding.
- If you need any information from the Human for implementation, create an issue in the Github Repository and assign it to `sboyett31`


### Code Quality

- **Clean Code**: Write code that is self-documenting and easy to understand
- **SOLID Principles**: Follow Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion
- **DRY Principle**: Don't Repeat Yourself - create reusable components
- **KISS Principle**: Keep It Simple, Stupid - avoid unnecessary complexity

### Documentation

- **Docstrings — scoped per audience (v1.1):**
  - **Public API surfaces** (services, hooks, exported functions, exported classes, exported types) MUST have comprehensive TSDoc/JSDoc docstrings describing parameters, return values, error variants, and any non-obvious invariants.
  - **Internal helpers, private methods, and component implementations** follow the "default to no comments — explain WHY, not WHAT" rule. A docstring on every line-of-code helper is friction, not documentation.
  - **File headers** (per `docs/SOP/file-headers.md`) are mandatory on every source file regardless of audience.
- **Comments**: Use comments to explain WHY, not WHAT
- **README Files**: Every module/package should have a README per `docs/SOP/directory-readme-structure.md`

## Project Structure Standards

### Root Directory Organization

This project must adhere to the Root Directory Standard.

**Key Requirements:**
- Only essential files permitted in root directory
- All project files organized in appropriate subdirectories
- Clean repository structure maintained at all times

**Platform-required root-file exceptions (v1.1):**

Some build systems and frameworks require specific files to live at the
repository root and refuse to discover them elsewhere. These are
documented exceptions to the "config files in `config/`" rule:

| File | Required at root by | Reason |
|---|---|---|
| `app.json` | Expo SDK / EAS | Expo config discovery loads only the root `app.json` |
| `eas.json` | EAS CLI | EAS reads `eas.json` from the project root only |
| `package.json`, `package-lock.json` | npm / yarn | Node toolchain requires root location |
| `tsconfig.json` | TypeScript compiler | `tsc` discovers from root or via `--project` flag |
| `babel.config.js`, `metro.config.js` | Metro bundler / Babel | Bundler discovers from root |
| `.eslintrc.js`, `.prettierrc` | ESLint / Prettier | Tool discovery from root or per-directory |
| `jest.config.js`, `.detoxrc.js` | Jest / Detox | Test runner discovery from root |
| `Makefile` | GNU Make | Standard convention |

When a platform requires a root-level config file, it is exempted from the
SOP `config/` rule. Document each exception in the project's root
`README.md`.

## Language-Specific Standards

### Python

```python
# Function naming: snake_case
def process_user_data(user_id: str) -> Dict[str, Any]:
    """
    Process user data and return formatted result.
    
    Args:
        user_id: Unique identifier for the user
        
    Returns:
        Dictionary containing processed user data
        
    Raises:
        ValueError: If user_id is invalid
    """
    pass

# Class naming: PascalCase
class UserDataProcessor:
    """Handles user data processing operations."""
    
    def __init__(self, config: Config):
        self.config = config
```

### JavaScript/TypeScript

```javascript
// Function naming: camelCase
function processUserData(userId: string): UserData {
  /**
   * Process user data and return formatted result.
   * @param userId - Unique identifier for the user
   * @returns Processed user data object
   */
}

// Class naming: PascalCase
class UserDataProcessor {
  constructor(private config: Config) {}
}
```

## File Organization

### Directory Structure

- Use kebab-case for directory names: `user-management/`
- Group related files in logical directories
- Separate concerns: `models/`, `services/`, `controllers/`, `utils/`

### File Naming

- **Python**: snake_case.py (`user_service.py`)
- **JavaScript/TypeScript**: camelCase.js/ts (`userService.ts`)
- **Configuration**: kebab-case.yaml (`database-config.yaml`)
- **Documentation**: kebab-case.md (`coding-style.md`)

## Code Formatting

### Indentation

- **Python**: 4 spaces
- **JavaScript/TypeScript**: 2 spaces
- **YAML**: 2 spaces
- **Never use tabs**

### Line Length

- Maximum 100 characters per line
- Break long lines at logical points
- Use parentheses for line continuation in Python

### Imports

```python
# Python: Group imports
import os
import sys
from typing import Dict, List, Optional

from third_party_lib import something

from .local_module import LocalClass
```

```javascript
// JavaScript/TypeScript: Group imports
import fs from 'fs';
import path from 'path';

import { SomeClass } from 'third-party-lib';

import { LocalClass } from './localModule';
```

## Error Handling

### Exception Handling

- Use specific exception types, not generic `Exception`
- Always log errors with context
- Fail fast - validate inputs early
- Provide meaningful error messages

```python
# Good
try:
    result = process_data(user_input)
except ValidationError as e:
    logger.error(f"Invalid user input: {user_input}", exc_info=True)
    raise ValueError(f"User input validation failed: {e}")
```

## Testing Standards

### Test Organization

Two acceptable patterns; pick one per project and apply consistently:

**Pattern A — Mirror in `test/` (Python-canonical):**

- Source at `src/foo/bar.py` has test at `tests/foo/test_bar.py`
- Standard pytest convention; easy to exclude tests from source distribution

**Pattern B — Co-located `*.test.ts(x)` (JS/TS-canonical, v1.1):**

- Source at `src/services/ble/protocol.ts` has test at `src/services/ble/protocol.test.ts` in the same directory
- Standard Jest convention; auto-discovered by Jest's default `testMatch` pattern (`**/?(*.)+(spec|test).[jt]s?(x)`)
- Refactoring-friendly: deleting a service folder takes its tests with it
- Used by RRUA per architecture decision ARCH-DEC-08

**For both patterns:**

- Use descriptive test names: `test_should_process_valid_user_data` (Python) or `it('returns Result.err when scan times out', ...)` (JS/TS)
- Group related tests in test classes (Python) or `describe` blocks (Jest)
- One assertion per test when possible
- Cucumber feature files live at `test/acceptance/features/` regardless of unit-test pattern

**Acceptance tests are always under `test/acceptance/`**, never co-located with source — they describe full user-flow behaviour across multiple modules, not a single unit.

### Test Naming

```python
def test_user_processor_should_return_formatted_data_when_given_valid_input():
    """Test that UserProcessor formats data correctly with valid input."""
    pass
```

## Version Control

### Commit Messages

```yaml
feat: add user data processing service

- Implement UserDataProcessor class
- Add validation for user input
- Include comprehensive error handling

Closes #123
```

### Branch Naming

- Feature branches: `feature/user-data-processing`
- Bug fixes: `fix/user-validation-error`
- Hotfixes: `hotfix/critical-security-patch`

## Performance Guidelines

### General Rules

- Profile before optimizing
- Use appropriate data structures
- Avoid premature optimization
- Cache expensive operations when appropriate

### Database Queries

- Use indexes appropriately
- Avoid N+1 query problems
- Use connection pooling
- Implement query timeouts

## Security Standards

### Input Validation

- Validate all user inputs
- Sanitize data before database operations
- Use parameterized queries
- Implement rate limiting

### Secrets Management

- Never commit secrets to version control
- Use environment variables for configuration
- Rotate secrets regularly
- Use secure secret management systems

## Code Review Guidelines

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] No debugging code left in
- [ ] Security considerations addressed

### Review Checklist

- [ ] Code is readable and maintainable
- [ ] Logic is correct and efficient
- [ ] Error handling is appropriate
- [ ] Tests cover edge cases
- [ ] Documentation is accurate

## Tools and Automation

### Linting

- **Python**: flake8, black, mypy
- **JavaScript/TypeScript**: ESLint, Prettier
- **YAML**: yamllint

### Pre-commit Hooks

- Run linters and formatters
- Execute tests
- Check for secrets
- Validate commit messages

## Build System Standards

**CRITICAL**: Use Makefile targets for common operations. Never create standalone scripts in the root directory - use make targets that may reference scripts in `scripts/` directory.

## Amendment History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-02-14 | Stephen Boyett | Initial coding style standard |
| **1.1** | **2026-05-14** | **Stephen Boyett** | **(a) Scoped "comprehensive docstrings" rule to public API surfaces only; internal helpers follow "default to no comments" rule. (b) Documented platform-required root-file exceptions (`app.json`, `eas.json`, etc.) to the `config/` rule. (c) Documented Pattern B (co-located `*.test.ts(x)`) as the JS/TS-canonical test organization convention alongside the Python-canonical Pattern A. Driven by RRUA architecture work.** |
