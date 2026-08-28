---
name: design-pattern-selection
description: Selects composition, adapter, repository, strategy, facade, factory, or state-machine patterns only for demonstrated design problems. Use when proposing an abstraction or pattern, replacing repeated conditional behavior, isolating infrastructure, or reviewing over-engineered architecture.
compatibility: Applies to TypeScript application design and refactoring.
metadata:
  source: docs/skills-plan/writing-skills-plan.md
  version: "1.0"
---

# Design Pattern Selection

Start with the problem and the simplest design. A pattern is justified only when it reduces a current cost.

## Pattern guide

- **Composition:** combine focused behavior without inheritance.
- **Adapter:** map a driver, ORM, file, or external format to an application model.
- **Repository:** isolate persistence behind domain-level operations.
- **Strategy:** represent algorithms that are genuinely interchangeable.
- **Facade:** expose one coherent operation over several lower-level operations.
- **Factory:** construct a valid value or object when construction has meaningful rules.
- **State machine:** encode explicit states and legal transitions.

Postpone Singleton, Abstract Factory, Visitor, deep inheritance, and generic service/manager/wrapper classes unless a concrete requirement makes them the simplest option.

## Required decision record

Before adding a pattern, write concise answers to:

1. What repeated or costly problem exists now?
2. Why is the simpler design insufficient?
3. What concrete variation does the pattern support?
4. How will the behavior and contract be tested?
5. How could the pattern be removed later?

Do not implement the pattern if these answers are speculative.

## Implementation rules

- Keep the public contract smaller than the hidden machinery.
- Name abstractions after domain capabilities, not the chosen pattern.
- Preserve error behavior and ordering when introducing interchangeable implementations.
- Add one boundary at a time and keep the diff focused.
- Prefer deletion when an abstraction no longer supports a real variation.
