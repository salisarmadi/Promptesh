---
name: code-quality-review
description: Reviews code and pull-request diffs for clarity, responsibility, type safety, testability, persistence boundaries, error behavior, and unnecessary abstraction. Use when asked for code review, PR review, maintainability feedback, design critique, or a personal quality checklist.
compatibility: Applies to TypeScript application changes and PostgreSQL persistence changes.
metadata:
  source: docs/skills-plan/writing-skills-plan.md
  version: "1.0"
---

# Code Quality Review

Review concrete behavior and change risk rather than enforcing patterns by count.

## Review order

1. Read repository instructions and the task or PR description.
2. Inspect the complete diff and the surrounding owner modules.
3. Identify behavior changes, public contract changes, and migration effects.
4. Run or inspect available checks when permitted.
5. Report actionable findings before general observations.

## Checklist

- Can the unit's responsibility be stated in one sentence?
- Do names communicate intent and domain meaning?
- Are inputs, outputs, invariants, side effects, and failures explicit?
- Can important rules be tested without infrastructure?
- Is every new abstraction solving a current problem?
- Are framework, driver, ORM, and external-data details isolated at a boundary?
- Are nullability and invalid states modeled deliberately?
- Do list and count operations share filter semantics?
- Are database constraints, ordering, parameters, and transactions correct?
- What happens for empty, invalid, slow, concurrent, or failed input?
- Does test coverage protect the changed behavior rather than implementation details?
- Is there a simpler design with fewer moving parts?
- Is the diff focused, with no unrelated behavior or cleanup?

## Finding format

For each issue, include:

- severity based on user or production impact;
- file and precise location;
- the concrete failure or maintenance cost;
- the smallest practical correction;
- the check or test that would prove it.

Do not report a preference as a defect. If no meaningful findings exist, say so and note any verification gaps.
