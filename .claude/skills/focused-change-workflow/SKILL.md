---
name: focused-change-workflow
description: Runs a disciplined before-during-after workflow for small, reviewable code changes with explicit behavior, ownership, tests, and complete diff review. Use when planning or implementing any feature, bug fix, cleanup, or refactor that needs tight scope and a clear definition of done.
compatibility: Applies to repository-based software changes.
metadata:
  source: docs/skills-plan/writing-skills-plan.md
  version: "1.0"
---

# Focused Change Workflow

## Before writing

1. Describe the requested behavior in one sentence.
2. List inputs, outputs, invariants, and failure cases.
3. Identify the owner of the behavior.
4. Search for an existing rule or module to reuse.
5. Read repository instructions and relevant framework documentation.
6. Choose the smallest test or check that proves the behavior.
7. Separate required work from tempting unrelated cleanup.

## While writing

1. Keep the normal path easy to scan.
2. Validate at trust boundaries.
3. Keep side effects explicit.
4. Prefer composition over inheritance.
5. Preserve existing contracts unless the task explicitly changes them.
6. Avoid speculative abstractions and placeholder structures.
7. Make one coherent change at a time and run the narrowest useful check.

## After writing

1. Read the result as a new contributor.
2. Check names, responsibility, duplication, nulls, and error behavior.
3. Run configured type, lint, test, and build checks as applicable.
4. Review the complete diff, including generated and configuration files.
5. Search for stale imports, paths, names, and dead files.
6. Confirm only intended files changed.
7. Update documentation only when public behavior or a design decision changed.
8. Summarize what changed, what was verified, and any remaining risk.

A change is complete when it is easier to understand and safer to modify, not when it contains the maximum possible cleanup.
