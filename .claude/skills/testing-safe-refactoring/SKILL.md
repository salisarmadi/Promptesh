---
name: testing-safe-refactoring
description: Chooses focused unit, integration, contract, or end-to-end tests and uses characterization tests to refactor behavior safely. Use when adding tests, fixing untested rules, restructuring code, extracting modules, replacing infrastructure, or preserving behavior during cleanup.
compatibility: Follow the repository's existing test tools; add a new framework only with a documented need.
metadata:
  source: docs/skills-plan/writing-skills-plan.md
  version: "1.0"
---

# Testing and Safe Refactoring

Test important rules and boundaries at the lowest level that gives reliable evidence.

## Select the test level

- **Unit:** deterministic parsing, normalization, validation, calculations, and state transitions.
- **Integration:** SQL, ORM, filesystem, or framework boundaries working with controlled infrastructure.
- **Contract:** multiple adapters preserving the same semantics, ordering, and failures.
- **End-to-end:** a critical user flow across assembled boundaries.

Do not replace a focused rule test with a slow end-to-end test. Do not mock away the behavior a boundary test is meant to prove.

## Priority behaviors

Cover these first when present:

- URL and input parsing;
- normalization and validation;
- pagination calculations;
- mapping raw rows to application data;
- filtering and counting consistency;
- empty and failure states;
- repository or ORM behavior against controlled data.

## Safe refactoring loop

1. Choose one smell or unclear responsibility.
2. Write a characterization test for behavior that must remain true.
3. Run it before editing and confirm it can fail for the right reason.
4. Make one structural change without changing the contract.
5. Run the narrow test, then broader lint, type, test, and build checks.
6. Inspect the diff for accidental behavior or complexity.
7. Stop when the design is clearer; continue only for a new, explicit reason.

## Test quality check

A useful test states behavior, controls relevant inputs, avoids incidental implementation details, covers deliberate failures, and produces a diagnostic failure message. If the repository has no test runner, do not silently introduce one during an unrelated refactor; propose the smallest justified setup.
