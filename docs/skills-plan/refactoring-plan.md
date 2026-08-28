# Component Refactoring Plan

## Goal

Restructure the component directory so that:

- shared UI components are separate from website-specific components;
- admin components have their own boundary;
- every component module has a predictable internal structure;
- component types, constants, implementation, and exports are easy to find;
- imports use public module entry points instead of reaching into implementation files;
- future refactoring can happen one component at a time without changing behavior.

This is a structure and maintainability plan. It does not change component behavior, styling, routes, database code, or product features.

---

## Important scope rule

The refactor should be structural only.

During the component move:

- do not redesign the UI;
- do not change component props unless required to fix an import;
- do not change animations;
- do not change URLs or navigation behavior;
- do not change database queries;
- do not mix feature work with file movement;
- do not perform unrelated cleanup.

First move and organize the code. Improve behavior in separate changes.

---

## Target top-level component tree

Use three top-level component areas:

```text
app/
├── _components/
│   ├── ui/
│   ├── website/
│   └── admin/
```

### 1. `ui`

Reusable, product-neutral building blocks.

A UI component should not know about the gallery, website navigation, database models, or admin workflows.

Examples:

- icons;
- buttons;
- inputs;
- dialogs;
- badges;
- loading indicators;
- visually reusable layout primitives.

### 2. `website`

Components that belong to the public Promptesh website and understand website concepts.

Examples:

- gallery cards and grids;
- category navigation;
- prompt search;
- hero sections;
- site header and footer;
- website pagination.

### 3. `admin`

Components that belong to administration workflows.

Examples:

- login form;
- admin navigation;
- prompt review forms;
- content management tables;
- admin-specific status controls.

Admin components must not be placed in `ui` merely because they contain a form. A generic form control belongs in `ui`; the login workflow belongs in `admin`.

---

## Standard component module structure

Every component that has more than a trivial implementation should use a folder named after the component in PascalCase.

```text
ComponentName/
├── ComponentName.types.ts
├── ComponentName.consts.ts
├── ComponentName.tsx
└── index.ts
```

Example:

```text
CategoryDeck/
├── CategoryDeck.types.ts
├── CategoryDeck.consts.ts
├── CategoryDeck.tsx
└── index.ts
```

### File responsibilities

#### `ComponentName.types.ts`

Contains types owned by the component module:

- props;
- component-specific state types;
- event-related types;
- local view-model types.

Import shared domain types from their owner instead of duplicating them here.

Use this file only when types are meaningful. Do not move every one-line inferred type into a separate file without a readability benefit.

#### `ComponentName.consts.ts`

Contains stable, component-owned constants:

- animation settings;
- labels;
- dimensions;
- default values;
- configuration maps;
- static limits.

Do not put runtime state or mutable values in this file. Constants should not become a second hidden configuration system.

#### `ComponentName.tsx`

Contains the component implementation and only the logic needed to coordinate its own rendering and interaction.

Keep large pure calculations, data mapping, or reusable behavior outside the JSX when doing so makes the component easier to read. Move them into a named module only when the new boundary is clear.

#### `index.ts`

The public entry point for the component module.

Export only what consumers are allowed to use:

```ts
export { CategoryDeck } from "./CategoryDeck";
export type { CategoryDeckProps } from "./CategoryDeck.types";
```

Do not export implementation-only constants or helpers unless another module has a real, documented need for them.

---

## Optional `_common` structure inside a component module

When a component has private supporting components, place them in a `_common` directory inside that component module.

```text
CategoryDeck/
├── _common/
│   ├── CategoryCard/
│   │   ├── CategoryCard.types.ts
│   │   ├── CategoryCard.consts.ts
│   │   ├── CategoryCard.tsx
│   │   └── index.ts
│   ├── DeckControls/
│   │   ├── DeckControls.types.ts
│   │   ├── DeckControls.consts.ts
│   │   ├── DeckControls.tsx
│   │   └── index.ts
│   └── index.ts
├── CategoryDeck.types.ts
├── CategoryDeck.consts.ts
├── CategoryDeck.tsx
└── index.ts
```

### `_common` rules

- `_common` contains helpers that are private to the parent component module;
- `_common` must not be imported directly by pages or unrelated component modules;
- the `_common/index.ts` file exports the supporting components that `CategoryDeck.tsx` is allowed to use;
- the parent `CategoryDeck/index.ts` exports the public `CategoryDeck` API;
- do not place unrelated global components in `_common`;
- if a component is needed by two different modules, move it to `ui` or the appropriate shared area instead of importing it from another module’s `_common` folder.

The `_common` folder is a visibility boundary, not just a naming convention.

---

## `_common/index.ts` rule

The `_common/index.ts` file should export only the private building blocks used by the parent module.

Example:

```ts
export { CategoryCard } from "./CategoryCard";
export type { CategoryCardProps } from "./CategoryCard";
export { DeckControls } from "./DeckControls";
export type { DeckControlsProps } from "./DeckControls";
```

If a type is exported from a component’s own `index.ts`, import it from that component entry point when practical. Do not create a barrel file that exports every internal constant and helper.

---

## Concrete `CategoryDeck` target

`CategoryDeck` belongs to the website component area because it represents public gallery/category behavior.

```text
app/_components/website/CategoryDeck/
├── _common/
│   ├── CategoryDeckCard/
│   │   ├── CategoryDeckCard.types.ts
│   │   ├── CategoryDeckCard.consts.ts
│   │   ├── CategoryDeckCard.tsx
│   │   └── index.ts
│   ├── CategoryDeckRail/
│   │   ├── CategoryDeckRail.types.ts
│   │   ├── CategoryDeckRail.consts.ts
│   │   ├── CategoryDeckRail.tsx
│   │   └── index.ts
│   └── index.ts
├── CategoryDeck.types.ts
├── CategoryDeck.consts.ts
├── CategoryDeck.tsx
└── index.ts
```

Use only the supporting modules that are actually needed. If the current implementation is still readable as one component, do not split it only to fill the tree. The folder structure should improve navigation, not create artificial fragmentation.

Suggested public entry point:

```ts
export { CategoryDeck } from "./CategoryDeck";
export type { CategoryDeckProps } from "./CategoryDeck.types";
```

Animation constants and internal helpers remain private unless they are intentionally part of the public API.

---

## Concrete `admin/login-form` target

The login workflow belongs under `admin`. The generic input, button, and form-field primitives it uses belong under `ui`.

```text
app/_components/admin/LoginForm/
├── _common/
│   ├── LoginField/
│   │   ├── LoginField.types.ts
│   │   ├── LoginField.consts.ts
│   │   ├── LoginField.tsx
│   │   └── index.ts
│   └── index.ts
├── LoginForm.types.ts
├── LoginForm.consts.ts
├── LoginForm.tsx
└── index.ts
```

If the existing filename is `login-form`, use `LoginForm` for the module and component name. Component directories and component files should use PascalCase to make them visually distinct from route directories and ordinary utility files.

Example public entry point:

```ts
export { LoginForm } from "./LoginForm";
export type { LoginFormProps } from "./LoginForm.types";
```

A login form should own login-workflow concerns only. It should not own a reusable text input, generic button, authentication client implementation, or database query.

---

## Proposed mapping of current components

This is the initial classification based on the current repository. Re-check the dependency of each file during implementation.

```text
app/_components/icons.tsx
└── app/_components/ui/Icons/

app/_components/category-deck.tsx
└── app/_components/website/CategoryDeck/

app/_components/category-tabs.tsx
└── app/_components/website/CategoryTabs/

app/_components/copy-button.tsx
└── app/_components/ui/CopyButton/
   or app/_components/website/CopyButton/ if it is gallery-specific

app/_components/gallery-grid.tsx
└── app/_components/website/GalleryGrid/

app/_components/hero.tsx
└── app/_components/website/Hero/

app/_components/pagination.tsx
└── app/_components/website/Pagination/

app/_components/prompt-search.tsx
└── app/_components/website/PromptSearch/

app/_components/site-footer.tsx
└── app/_components/website/SiteFooter/

app/_components/site-header.tsx
└── app/_components/website/SiteHeader/
```

The classification should follow dependencies and responsibility, not file size. `CopyButton` should be placed in `ui` only if it is genuinely reusable outside the gallery.

---

## Top-level barrel exports

Use an `index.ts` at each component area only when it improves imports and does not hide ownership.

```text
app/_components/ui/index.ts
app/_components/website/index.ts
app/_components/admin/index.ts
```

Example:

```ts
// app/_components/website/index.ts
export { CategoryDeck } from "./CategoryDeck";
export { CategoryTabs } from "./CategoryTabs";
export { GalleryGrid } from "./GalleryGrid";
export { Hero } from "./Hero";
export { Pagination } from "./Pagination";
export { PromptSearch } from "./PromptSearch";
export { SiteFooter } from "./SiteFooter";
export { SiteHeader } from "./SiteHeader";
```

Only export public components and public prop types. Do not export every nested `_common` component from the area barrel.

A root `app/_components/index.ts` is optional. Add it only if it makes imports clearer. Avoid a giant barrel that makes dependency ownership difficult to see.

---

## Import rules

### Allowed

```ts
import { CategoryDeck } from "@/app/_components/website/CategoryDeck";
import { Search } from "@/app/_components/ui/Icons";
```

### Avoid

```ts
import { CategoryDeck } from "@/app/_components/website/CategoryDeck/CategoryDeck";
import { CategoryDeckCard } from "@/app/_components/website/CategoryDeck/_common/CategoryDeckCard/CategoryDeckCard";
```

The first example bypasses the public module API. The second breaks the `_common` privacy boundary.

### Dependency direction

```text
ui
↑
website
↑
admin
```

More precisely:

- `ui` must not import from `website` or `admin`;
- `website` may import from `ui`;
- `admin` may import from `ui`;
- `admin` and `website` should not import each other;
- pages/routes may import public APIs from any appropriate area;
- a module may use its own `_common` components through `_common/index.ts`.

If `ui` needs a gallery-specific type or behavior, the component probably belongs in `website` instead.

---

## Refactoring phases

### Phase 1 — Inventory

1. List every component and its current consumers.
2. Record whether each component is reusable, website-specific, or admin-specific.
3. Record client/server requirements.
4. Record current public props and exports.
5. Identify components that should not be split.

Deliverable: a small component inventory before moving files.

### Phase 2 — Define boundaries

1. Create the `ui`, `website`, and `admin` ownership rules.
2. Decide which components are public.
3. Identify private supporting components for `_common`.
4. Decide which constants and types belong to each component.
5. Decide whether a shared component really belongs in `ui`.

Deliverable: approved target tree and import rules.

### Phase 3 — Move one simple component

Start with a low-risk component such as `SiteFooter`, `SiteHeader`, or `Icons`.

1. Create its folder.
2. Move the implementation.
3. Add types and constants files only when needed.
4. Add the local `index.ts`.
5. Update imports.
6. Run checks.

Deliverable: one migrated component with unchanged behavior.

### Phase 4 — Move website components

Migrate one component at a time:

1. `Icons` or `SiteFooter`;
2. `SiteHeader`;
3. `CategoryTabs`;
4. `Pagination`;
5. `GalleryGrid`;
6. `PromptSearch`;
7. `Hero`;
8. `CategoryDeck` last, because it has the most internal behavior.

The order can change if dependency analysis shows a better sequence.

### Phase 5 — Introduce `_common` only where needed

For `CategoryDeck` and `LoginForm`:

1. identify a supporting component with a clear responsibility;
2. move it into `_common/ComponentName`;
3. add its own types, constants, implementation, and `index.ts`;
4. export it through `_common/index.ts`;
5. keep it unavailable to unrelated modules.

Do not split a component merely because the requested tree has a place for a file.

### Phase 6 — Add admin structure

Create the admin component boundary when the admin workflow is implemented. Place `LoginForm` under `admin/LoginForm` and keep generic controls under `ui`.

Do not move a nonexistent component or create placeholder files only to satisfy the tree.

### Phase 7 — Add area exports

After individual module exports work, add `ui/index.ts`, `website/index.ts`, and `admin/index.ts` where they improve imports.

Check for circular dependencies after adding barrel files.

### Phase 8 — Verify and clean up

1. search for imports using old paths;
2. search for deep imports into `_common`;
3. run lint and TypeScript checks;
4. run tests and build when available;
5. inspect the complete diff;
6. confirm no behavior files changed accidentally;
7. remove obsolete empty directories only after all imports are updated.

---

## Definition of done

The refactor is complete when:

- each component is in exactly one ownership area;
- component folders use consistent PascalCase naming;
- public modules expose their API through `index.ts`;
- types and constants are separated when they improve clarity;
- `_common` contains only parent-module internals;
- unrelated modules cannot import `_common` directly;
- UI components do not depend on website or admin components;
- website and admin components do not depend on each other;
- no old component import paths remain;
- behavior, props, accessibility, navigation, and styling are unchanged;
- lint, type checks, tests, and build pass where configured;
- the diff contains only the intended restructuring.

The structure should make the answer to these questions immediate:

1. Who owns this component?
2. What is its public API?
3. Where are its types and constants?
4. Which code is private to the module?
5. Can another module safely reuse it?
