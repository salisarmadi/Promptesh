---
name: solid-design-review
description: Reviews a concrete design against SOLID principles and recommends only changes that solve measurable responsibility, extension, substitution, interface, or dependency problems. Use during architecture review, refactoring proposals, interface design, or when conditionals and dependencies are becoming fragile.
compatibility: Applies to functions, modules, objects, and classes; does not require class-based code.
metadata:
  source: docs/skills-plan/writing-skills-plan.md
  version: "1.0"
---

# SOLID Design Review

Use SOLID as diagnostic questions, not as a mandate to add layers.

## Review questions

### Single Responsibility

Does the unit have one coherent reason to change? Separate validation, persistence, formatting, or presentation only when those concerns change independently.

### Open/Closed

Is there a real, repeated variation that requires editing fragile conditionals in many places? Prefer a small map or strategy when the variation exists. Do not build an extension framework for one case.

### Liskov Substitution

Can every implementation of a contract preserve the same meaning, guarantees, ordering, side effects, and error behavior? A matching method signature is not sufficient.

### Interface Segregation

Does each consumer depend only on operations it uses? Prefer focused contracts such as `GalleryReader` over a broad interface collecting unrelated capabilities.

### Dependency Inversion

Do high-level rules need isolation from a driver, ORM, file system, clock, or external client? Introduce the smallest abstraction only where it enables a real test or alternative.

## Output for a review

For each finding, provide:

1. the concrete cost in the current design;
2. the principle that helps explain it;
3. the smallest corrective change;
4. the behavior that must remain stable;
5. the test or check that proves the change.

If a principle reveals no measurable problem, recommend no change. Never score a design by the number of interfaces, classes, or patterns it contains.
