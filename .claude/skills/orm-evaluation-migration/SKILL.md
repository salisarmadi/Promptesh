---
name: orm-evaluation-migration
description: Evaluates Drizzle versus Prisma for this TypeScript/PostgreSQL project and plans a gradual, evidence-based ORM migration. Use when asked to choose, add, compare, prototype, or migrate an ORM, schema, query, repository, or database access path.
compatibility: Project-specific; assumes the existing pg and handwritten-SQL implementation remains the baseline until a decision is approved.
metadata:
  source: docs/skills-plan/writing-skills-plan.md
  version: "1.0"
---

# ORM Evaluation and Migration

An ORM is not automatically cleaner than SQL. The goal is a clear contract, safe queries, explicit constraints, reliable migrations, and protected behavior—not merely adopting a tool.

## Evaluation order

1. Characterize the existing `pg` behavior with tests or reproducible checks.
2. Evaluate **Drizzle first** for SQL transparency and TypeScript inference.
3. Evaluate Prisma as the alternative when a higher-level generated client and model workflow provide greater value.
4. Compare type safety, migration review, relations, transaction support, raw SQL escape hatches, query clarity, generated SQL, error handling, test setup, performance, and team familiarity.
5. Choose at most one ORM. Do not install both in the application.
6. Record whether an ORM solves a current problem. Choosing no ORM is valid.

## Required decision record

Document:

- current pain and desired outcome;
- options and evaluation criteria;
- decision and rejected alternatives;
- migration boundary and rollback plan;
- effect on schema and migration ownership;
- proof required before broader adoption.

## Migration workflow

If the decision is positive:

1. introduce the selected ORM beside the current driver only when gradual migration is safe;
2. keep callers behind the same repository-shaped contract;
3. migrate one small, low-risk read operation;
4. compare returned data, ordering, null handling, generated SQL, errors, and performance;
5. keep raw SQL for exceptional queries when it is clearer, isolated behind the same boundary;
6. migrate further only when the new path is demonstrably clearer and safer;
7. remove the old path only after coverage and production confidence exist.

Do not turn ORM adoption into a whole-database rewrite or a learning-only production change.
