---
file: docs/SOP/directory-readme-structure.md
title: "Directory README Standard"
author: Stephen Boyett
company: Cannasol Technologies LLC
date: 2026-02-14
brief: "Required structure and content for `README.md` files placed in this project's directories."
version: 1.0
---

# Directory README Standard

## Purpose

This standard defines the required structure and content for `README.md` files placed in directories of this project. Consistent directory READMEs improve navigability, enable automated indexing by AI agents, and drive quality gates for documentation completeness.

## Scope

- Applies to any directory intended to be consumed by developers or agents.
- Particularly recommended for: `tests/`, `docs/`, `src/` subtrees, and `config/`.

## Required Structure

Each directory `README.md` MUST include the following sections in order:

1. Frontmatter Header (YAML-like) with metadata
2. Critical rules or usage guidance (optional but encouraged)
3. Overview/Context for the directory
4. Directory structure block (fenced code block)
5. Commands/Targets relevant to the directory
6. Links and traceability to standards/specs

## 1) Frontmatter Header

- MUST follow the structure below.
- Keys may be extended, but required keys must exist.

```yaml
---

file: <relative_path_to_this_readme>
title: <directory_title>
author: <maintainer_or_author>
company: Real Random
date: <YYYY-MM-DD>
brief: <1-2 sentence overview of the directory purpose>
version: 1.0
dependencies:
  - file: <relative_path>
    type: <type_label>
    required: <true|false>
    description: <what_is_this_dependency>
commands:
  - <command_or_task_name>:
      type: <task|script|make>
      flowFile: <path_to_flow_yaml_if_applicable>
      description: <what_this_does>
      options:
        - --flag <value>
  - `make <target>`
    description: <target_description>
    options:
      - --flag <value>
tags:
  - <tag1>
  - <tag2>
---
```


## 2) Critical Rules or Usage Guidance

- Use an emphasized block that highlights critical rules for this directory.
- Example for acceptance tests:

```text
> <------------------------------------------------------->
> ***!!! CRITICAL AGENT RULES FOR ACCEPTANCE TESTING !!!***
> <------------------------------------------------------->
```

## 3) Overview/Context

- Provide concise bullets describing what lives in the directory and how it is used.
- Prefer consistent phrasing like “The `X` are located in …”.

## 4) Directory Structure

- Use fenced code block (no inline HTML) with language hint `text`.
- Show representative tree, not exhaustive listing.

## 5) Commands/Targets

- Provide a fenced block (yml) that lists Makefile or CLI targets and their options.
- Keep this in sync with actual Makefile or flows.

## 6) Links and Traceability

- Link to relevant standards, specs, and flows. Examples:
  - `docs/SOP/sw-testing.md`
  - `docs/SOP/makefile-standard.md`

## Quality Requirements

- MUST avoid inline HTML (markdownlint MD033).
- MUST include date and version.
- SHOULD include at least one `commands` entry for discoverability.
- SHOULD include tags for AI indexing (e.g., `qa`, `bdd`, `orchestration`).

## Example

A full example is provided in `test/acceptance/README.md`. This standard closely mirrors that format while keeping it generic for all directories in this project.

## Maintenance

- Update the `version` field when making substantial format changes.
- The standard is enforced during reviews and can be validated by agents.
