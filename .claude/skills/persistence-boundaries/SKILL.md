---
name: persistence-boundaries
description: Designs clean PostgreSQL persistence boundaries with parameterized queries, row mapping, focused repository operations, shared filter semantics, constraints, transactions, and deliberate error translation. Use when editing database access, SQL, repositories, schemas, migrations, filtering, counting, or pagination.
compatibility: Project-specific guidance assumes PostgreSQL through pg unless an approved migration says otherwise.
metadata:
  source: docs/skills-plan/writing-skills-plan.md
  version: "1.0"
---

# Persistence Boundaries

This project currently uses PostgreSQL through `pg`, with handwritten SQL in `lib/db.ts` and `lib/gallery.ts`. Treat `pg` as a database driver, not an ORM. Do not invent an ORM layer while performing unrelated work.

## Contract first

Expose domain-level operations such as:

- `findGalleryImages(filters)`;
- `countGalleryImages(filters)`;
- `findCategoriesWithCounts(filters)`;
- `savePendingPrompt(input)`.

Do not leak table names, SQL fragments, column aliases, driver row formats, or query-builder objects to callers.

## Persistence rules

- Always parameterize data values. Never interpolate untrusted input into SQL.
- Map raw rows and nullable driver values at the persistence edge.
- Keep filtering and counting on one source of truth so pagination totals match returned rows.
- Make ordering deterministic, including a stable tie-breaker.
- Use transactions for operations that must succeed or fail atomically.
- Encode durable invariants with primary keys, foreign keys, unique constraints, check constraints, and deliberate nullability.
- Add indexes for demonstrated query needs, not by default.
- Translate expected driver and constraint errors into useful application outcomes; preserve unexpected errors for diagnosis.
- Keep migrations reviewable and safe for the current deployment path.

## Verification

Test or inspect:

1. mapping from database rows to application data;
2. filter equivalence between list and count operations;
3. empty results and nullable columns;
4. deterministic pagination ordering;
5. transaction rollback on failure;
6. migration behavior and constraints;
7. generated or handwritten SQL for safety and clarity.

An abstraction is successful only if callers become simpler and persistence behavior remains explicit.
