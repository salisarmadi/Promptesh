---
name: responsibility-boundaries
description: Separates domain rules, data mapping, persistence, orchestration, presentation, and side effects into justified boundaries. Use when a module mixes unrelated jobs, business logic depends on infrastructure, behavior is hard to test, or a feature needs a clearer ownership map.
compatibility: Designed for application code with domain, infrastructure, and delivery concerns.
metadata:
  source: docs/skills-plan/writing-skills-plan.md
  version: "1.0"
---

# Responsibility Boundaries

Create boundaries only where they clarify ownership, testing, or future change.

## Classify the work

Map each behavior to one primary responsibility:

- **Domain rules:** application meaning, validation, and business decisions.
- **Data mapping:** conversion from external or database shapes to application data.
- **Persistence:** queries, transactions, migrations, and database errors.
- **Orchestration:** calling operations in the correct order.
- **Presentation or delivery:** communicating results to an external consumer.

If one unit owns several unrelated categories, identify the smallest coherent extraction before editing.

## Dependency rules

- Keep deterministic rules independent of databases, files, clocks, frameworks, and network clients.
- Convert raw rows and external payloads at the boundary rather than trusting them as domain values.
- Let persistence adapters own SQL, table aliases, driver rows, and ORM query objects.
- Let orchestration coordinate existing operations instead of duplicating them.
- Translate infrastructure failures into useful application outcomes at a deliberate boundary.
- Expose only the operations callers need.

## Boundary test

Before introducing a module, interface, adapter, or repository, answer:

1. Can the rule be tested without infrastructure?
2. Can persistence change without changing the rule?
3. Does the proposed public API expose only caller needs?
4. Are external shapes converted at the edge?
5. Is error behavior explicit?
6. What real change or test becomes easier because this boundary exists?

If question 6 has no concrete answer, prefer the simpler design.

## Refactoring approach

First record the current ownership and dependencies. Move one responsibility at a time, preserve behavior, update consumers through the new public boundary, and run checks after each coherent change. Do not mix the boundary refactor with product behavior changes.
