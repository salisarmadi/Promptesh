---
name: component-architecture
description: Designs Promptesh component ownership, PascalCase module folders, public index exports, private _common helpers, and dependency-safe imports across ui, website, and admin areas. Use when adding, moving, splitting, naming, or reviewing React components and component imports.
compatibility: Project-specific for the Next.js App Router component tree under app/_components.
metadata:
  source: docs/skills-plan/refactoring-plan.md
  version: "1.0"
---

# Component Architecture

Organize components so ownership, public API, types, constants, and private helpers are immediately visible.

## Ownership areas

Use these areas under `app/_components`:

```text
app/_components/
├── ui/
├── website/
└── admin/
```

- **ui:** product-neutral icons, buttons, inputs, dialogs, badges, loaders, and reusable visual primitives. It must not know gallery, navigation, database models, or admin workflows.
- **website:** public Promptesh concepts such as gallery cards, category navigation, search, hero, site chrome, and website pagination.
- **admin:** administration workflows such as login, review forms, management tables, and status controls. Generic controls used by them still belong in `ui`.

Classify by responsibility and dependencies, not size or the fact that a component contains a form.

## Module shape

Use a PascalCase folder for each non-trivial component:

```text
ComponentName/
├── ComponentName.types.ts
├── ComponentName.consts.ts
├── ComponentName.tsx
└── index.ts
```

- Put component-owned props and meaningful local types in `.types.ts`; do not extract trivial inferred types without a readability benefit.
- Put stable labels, dimensions, animation settings, defaults, and configuration maps in `.consts.ts`; never put mutable runtime state there.
- Keep rendering and interaction coordination in `.tsx`.
- Export only supported consumers through `index.ts`.

Example:

```ts
export { CategoryDeck } from "./CategoryDeck";
export type { CategoryDeckProps } from "./CategoryDeck.types";
```

## Private helpers

When a parent has clear supporting components, use `_common/ComponentName/` with the same internal shape. Export those helpers through `_common/index.ts` only for the parent implementation. Pages and unrelated modules must never import another module's `_common` path.

Do not create `_common`, types, constants, or placeholder components just to fill a template. Extract only a clear responsibility. If two independent modules need a private helper, move it to the appropriate shared ownership area.

## Dependency direction

```text
ui
↑
website   admin
```

- `ui` imports neither `website` nor `admin`.
- `website` and `admin` may import `ui`.
- `website` and `admin` do not import each other.
- Routes import public module entry points.
- A parent imports its private helpers through `_common/index.ts`.
- Never deep-import `ComponentName/ComponentName` or another module's `_common` implementation.

Use area-level barrels only when they improve imports without hiding ownership or creating cycles. Export only public components and prop types.
