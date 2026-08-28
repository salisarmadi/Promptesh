---
name: oop-composition
description: Applies encapsulation, composition, focused contracts, polymorphism, and classes only where they improve ownership of state and invariants. Use when designing collaborating modules or objects, considering inheritance, introducing interfaces, or deciding whether a class is justified.
compatibility: Applies to TypeScript application and domain design.
metadata:
  source: docs/skills-plan/writing-skills-plan.md
  version: "1.0"
---

# OOP and Composition

Treat object-oriented design as responsibility, encapsulation, and collaboration—not as a requirement to use classes.

## Decision process

1. State the invariant or responsibility that needs an owner.
2. Prefer a focused function or composed object when no durable state is required.
3. Use a class only when state, behavior, and invariants belong together over time.
4. Introduce a shared contract only when multiple implementations must genuinely be interchangeable or when a test boundary has concrete value.
5. Verify that every implementation preserves the same meaning, guarantees, ordering, and error behavior.

## Guidance

- Keep validation near the value or operation it protects.
- Expose meaningful operations, not internal construction or persistence details.
- Compose focused operations instead of building deep inheritance trees.
- Depend on the smallest contract each consumer uses.
- Keep plain data as plain data when it has no behavior or invariant to protect.
- An in-memory test adapter and a PostgreSQL adapter may share a repository contract when that materially improves testing; do not add the contract preemptively.

## Reject these designs

- A class created solely because a domain noun exists.
- Inheritance used only to share a few lines of implementation.
- A broad `Service`, `Manager`, or `Wrapper` with unrelated methods.
- Interfaces that have one implementation, one consumer, and no testing or change-boundary benefit.
- Composition that only moves code into more files without clarifying responsibility.

## Completion check

The collaboration should be explainable without naming a pattern: who owns the state, who protects the invariant, what each collaborator needs, and why the chosen boundary makes testing or change safer.
