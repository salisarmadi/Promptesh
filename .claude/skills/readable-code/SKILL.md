---
name: readable-code
description: Writes and improves clear, maintainable code with intention-revealing names, shallow control flow, explicit contracts, and useful comments. Use when implementing or refactoring TypeScript or JavaScript, simplifying hard-to-read functions, naming units, or removing accidental complexity.
compatibility: Designed for TypeScript and JavaScript repositories.
metadata:
  source: docs/skills-plan/writing-skills-plan.md
  version: "1.0"
---

# Readable Code

Optimize for low cognitive cost for the next person who must understand, test, or change the code.

## Before writing

1. Complete: **This unit is responsible for ___ and is not responsible for ___.**
2. List inputs, outputs, invariants, side effects, and failure cases.
3. Find the existing owner of related rules before adding another implementation.
4. Choose the smallest design that expresses the required behavior.

## Writing rules

- Use names that communicate intent and domain meaning: `activeCategorySlug`, `totalPages`, `normalizeSearchQuery`, or `findGalleryImages`.
- Avoid vague names such as `data`, `item`, `result2`, `doStuff`, and `handleIt` when a more precise name exists.
- Name booleans as questions: `isValid`, `hasPrompt`, `shouldRetry`.
- Keep the normal path readable from top to bottom. Handle invalid and exceptional cases with guard clauses.
- Make important inputs parameters and make side effects visible.
- Keep return values and error behavior predictable.
- Comment constraints, trade-offs, and reasons that code cannot express. Do not narrate syntax.
- Remove real duplication, but do not create an abstraction for a single speculative variation.
- Use types to prevent meaningful invalid states, not to add ceremony.

## Simplicity test

Reject a change that merely:

- minimizes line count while hiding intent;
- creates a class for every noun;
- wraps every function in an interface;
- applies a pattern without a current problem;
- splits code into fragments that make navigation harder.

## Completion check

Verify that the unit has one explainable purpose, a small public surface, explicit behavior, deliberate failures, and no unrelated cleanup. Read the final diff as a new contributor.
