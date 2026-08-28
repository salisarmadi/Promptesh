---
name: typescript-modeling
description: Uses TypeScript to express domain rules, valid states, nullability, external-data boundaries, and focused contracts. Use when designing types, replacing ambiguous object shapes, handling nullable or untrusted data, introducing generics, or removing any and unsafe assertions.
compatibility: Requires a TypeScript codebase; follow the repository's strictness and module settings.
metadata:
  source: docs/skills-plan/writing-skills-plan.md
  version: "1.0"
---

# TypeScript Modeling

Use the type system to communicate real rules and make invalid states difficult to represent.

## Workflow

1. Identify the states the code must represent and the combinations it must reject.
2. Identify every untrusted boundary: URL input, database rows, files, scripts, environment variables, and external services.
3. Define the smallest domain-facing type that callers need.
4. Validate or narrow untrusted data before assigning that type.
5. Keep component-owned props and state types with their owning module; import shared domain types from their actual owner.

## Preferred tools

- Strict null handling instead of broad assertions.
- Discriminated unions for mutually exclusive states.
- Type guards and control-flow narrowing for unknown values.
- Function types and focused interfaces for genuine contracts.
- Generics only when they remove real duplication while preserving meaning.
- Exhaustive handling where missing a state would be a bug.
- Domain-specific names instead of repeated anonymous object shapes.

Example:

```ts
type LoadResult<T> =
  | { status: "success"; value: T }
  | { status: "empty" }
  | { status: "failure"; reason: string };
```

## Avoid

- `any` where `unknown` plus validation is appropriate.
- Assertions used to silence uncertainty rather than prove a fact.
- Optional properties that permit contradictory combinations when a union is clearer.
- Duplicating shared domain types in component-specific type files.
- Exporting implementation-only types from a public module entry point.
- Generic abstractions with only one concrete use and no demonstrated duplication.

## Completion check

Confirm that nulls, failures, and state transitions are deliberate; external data becomes trusted only after validation or mapping; and the public type surface is smaller and clearer than the implementation details behind it.
