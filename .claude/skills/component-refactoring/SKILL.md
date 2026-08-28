---
name: component-refactoring
description: Performs behavior-preserving Promptesh component moves using inventory, ownership classification, public entry points, incremental migration, stale-import searches, and full verification. Use when implementing the component refactoring plan or structurally reorganizing existing React components.
compatibility: Project-specific for Next.js App Router; read AGENTS.md and the installed Next.js documentation before changing framework code.
metadata:
  source: docs/skills-plan/refactoring-plan.md
  version: "1.0"
---

# Component Refactoring

This workflow is structural only. Preserve behavior, props, styling, accessibility, animations, routes, URLs, navigation, and database queries. Keep feature work and unrelated cleanup out of the refactor.

Use the `component-architecture` skill for ownership, module shape, `_common`, and dependency rules.

## Phase 1: inventory

Before moving files, record for every current component:

- consumers and imports;
- `ui`, `website`, or `admin` ownership;
- client or server requirements;
- current public props and exports;
- dependencies on sibling components and domain types;
- whether splitting would clarify a real responsibility.

Re-check classification from actual dependencies. In particular, place `CopyButton` in `ui` only if it is genuinely product-neutral rather than gallery-specific.

## Phase 2: define the target

For each component, decide:

1. target PascalCase module path;
2. public component and prop types;
3. meaningful type and constant ownership;
4. private helpers, if any;
5. allowed dependency direction;
6. all consumers that must switch to its public `index.ts`.

Do not create an `admin` workflow, empty placeholders, or artificial helper modules for code that does not exist.

## Phase 3: migrate incrementally

Move one low-risk component first, update all imports, and run checks. Continue one component at a time. A recommended order is:

1. `Icons` or `SiteFooter`;
2. `SiteHeader`;
3. `CategoryTabs`;
4. `Pagination`;
5. `GalleryGrid`;
6. `PromptSearch`;
7. `Hero`;
8. `CategoryDeck` last because it has the most internal behavior.

Preserve `"use client"` boundaries. Remember that a client module's imports enter its client graph; do not accidentally pull server-only dependencies into it.

Introduce `_common` only after identifying a supporting component with a clear private responsibility. The parent must consume it through `_common/index.ts`, and no external consumer may import it.

## Phase 4: area exports

Add `ui/index.ts`, `website/index.ts`, or `admin/index.ts` only after local entry points work and only when the barrel improves clarity. Check for cycles and accidental client/server graph expansion.

## Phase 5: verify

1. Search for every old path and filename.
2. Search for deep implementation imports and external `_common` imports.
3. Run formatting, lint, TypeScript, tests, and production build when configured.
4. Inspect the complete diff for accidental behavior or style changes.
5. Confirm props, accessibility, navigation, rendering mode, and animations are unchanged.
6. Remove obsolete empty directories only after all consumers are migrated.

## Definition of done

Each component has one owner, consistent PascalCase structure, a small public entry point, meaningful type and constant placement, private helpers that remain private, valid dependency direction, no stale imports, and passing checks. The diff contains only the intended restructuring.
