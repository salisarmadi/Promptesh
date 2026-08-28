# Writing Skills Plan

## Scope and clarification

This document is a learning plan for writing clean, maintainable code. It is **not** a frontend-skills plan or a backend-skills plan. It intentionally excludes topics such as UI implementation, CSS, HTTP/API development, framework tutorials, deployment, and server operations.

The focus is on transferable writing and design skills:

- clear names and readable structure;
- functions, modules, and responsibilities;
- TypeScript as a tool for expressing rules;
- object-oriented design and composition;
- SOLID principles;
- design patterns used only when they solve a real problem;
- testing and safe refactoring;
- clean persistence boundaries and ORM usage.

This repository does not currently contain a `.claude` folder. This plan does not depend on one and does not ask for one to be created.

---

## Current database situation

The current project uses PostgreSQL through the `pg` package and contains handwritten SQL in `lib/gallery.ts` and `lib/db.ts`. It does **not** currently use an ORM.

That distinction matters:

- `pg` is a database driver, not an ORM;
- `db/schema.sql` is a handwritten SQL schema;
- `db/migrations/` contains SQL migrations;
- `lib/gallery.ts` builds and executes SQL directly.

The plan therefore does not pretend that an ORM already exists. It includes a deliberate database/ORM decision instead of introducing an abstraction without a reason.

### Recommended ORM direction

For this TypeScript/PostgreSQL project, evaluate **Drizzle ORM first** because it keeps SQL concepts visible, provides strong TypeScript types, and can fit a project that already has SQL knowledge. Evaluate Prisma as an alternative if the team values a higher-level client and generated models more than SQL transparency.

Do not add both. Do not migrate the whole database as a learning exercise. First compare the tools against the project’s actual needs, then migrate one small, low-risk read path if the decision is positive.

### ORM definition

An ORM, or Object-Relational Mapper, is a library that maps application data and operations to relational database tables and queries. A useful ORM should provide some combination of:

- typed table/model definitions;
- safe query construction;
- relation handling;
- migrations or migration integration;
- transaction support;
- predictable mapping between database rows and application data;
- useful error behavior.

An ORM is not automatically cleaner than SQL. Clean database code has explicit boundaries, correct constraints, safe parameters, predictable queries, and tests. A badly designed ORM layer can be more complicated than a small amount of well-written SQL.

---

## What “clean code” means here

Clean code is code with a low cognitive cost for the next person who must understand, test, or change it.

A clean unit has:

1. one clear purpose;
2. a name that communicates intent;
3. explicit inputs and outputs;
4. a small and stable public surface;
5. predictable error behavior;
6. minimal hidden state;
7. tests for important rules;
8. no unnecessary abstraction.

Clean code does **not** mean:

- the fewest lines;
- one class for every noun;
- the maximum number of design patterns;
- removing all comments;
- never using SQL;
- wrapping every function in an interface;
- splitting code until every file contains only a few lines.

The correct question is not “Does this use a pattern?” It is:

> Can the responsibility, rule, and change boundary be understood quickly and tested safely?

---

## 1. Writing rules to practice

### 1.1 Define responsibility before implementation

Before writing a function, class, or module, complete this sentence:

> This unit is responsible for ___ and is not responsible for ___.

If the first blank contains several unrelated jobs, split the design before writing more code.

### 1.2 Use intention-revealing names

Names should explain meaning rather than implementation.

Prefer names such as:

- `activeCategorySlug`;
- `totalPages`;
- `normalizeSearchQuery`;
- `buildGalleryFilters`;
- `findGalleryImages`;
- `parsePageNumber`.

Avoid vague names such as `data`, `item`, `result2`, `doStuff`, or `handleIt`.

Boolean names should read like a question: `isValid`, `hasPrompt`, `shouldRetry`.

### 1.3 Keep the main path easy to read

Use guard clauses for invalid and exceptional cases. Reduce deep nesting. Put the normal path where it can be scanned from top to bottom.

### 1.4 Comment decisions, not syntax

Comments should explain constraints, trade-offs, invariants, or reasons that are not obvious from the code.

Useful comment:

> A stable ID tie-breaker keeps ordering deterministic when two records have the same timestamp.

Unhelpful comment:

> Sort by created date.

### 1.5 Make invalid states difficult to represent

Use discriminated unions, narrow types, validation functions, and domain-specific names where they prevent invalid combinations.

```ts
type LoadResult<T> =
  | { status: "success"; value: T }
  | { status: "empty" }
  | { status: "failure"; reason: string };
```

Use types to communicate a real rule, not to create ceremony.

---

## 2. Responsibilities and boundaries

Practice keeping these responsibilities separate:

- **Domain rules:** application meaning, validation, and business decisions;
- **Data mapping:** converting external or database-shaped data into application data;
- **Persistence:** queries, transactions, migrations, and database errors;
- **Orchestration:** calling several operations in the correct order;
- **Presentation or delivery:** communicating results to an external consumer.

This is a design boundary exercise, not a requirement to build a specific frontend or backend architecture.

A repository or ORM adapter should own persistence details. A domain rule should not know table aliases, driver result formats, or ORM-specific query objects. An orchestration unit should coordinate operations rather than duplicate their implementation.

### Boundary checklist

- Can this rule be tested without the database?
- Can persistence be changed without changing the rule?
- Does the module expose only what its callers need?
- Are raw rows converted at the edge?
- Are infrastructure errors translated into useful application outcomes?
- Is the boundary justified by a real change or testing need?

---

## 3. Functions, modules, and TypeScript

### Functions

A function should usually have one coherent job. Ask:

- Can its name describe the whole function without using “and”?
- Are all important inputs parameters?
- Is the return value predictable?
- Are side effects obvious?
- Can the important behavior be tested in isolation?

### Modules

A module should have one main reason to change. Keep implementation details private and expose a small public API.

Avoid both extremes:

- a giant module that owns unrelated rules;
- dozens of meaningless wrapper modules that make navigation harder.

### TypeScript

Study and practice:

- strict null handling;
- discriminated unions;
- type narrowing;
- function types;
- generics where they remove real duplication;
- module boundaries;
- typed external-data validation;
- avoiding `any` and unsafe assertions.

Type external data at the boundary. Do not let unvalidated database or script output silently become trusted domain data.

---

## 4. OOP and composition

Object-oriented design is primarily about encapsulation, responsibility, and collaboration. It does not require classes everywhere.

### Encapsulation

Keep validation and invariants near the data or operation they protect. A page-number parser should own the rules for valid page numbers instead of making every caller repeat them.

### Abstraction

Expose a meaningful operation such as `findGalleryImages(filters)` rather than exposing SQL construction to every caller.

### Composition

Prefer combining small functions or objects over deep inheritance trees. Composition should make responsibilities clearer, not merely move code between files.

### Polymorphism

Use a shared contract only when multiple implementations must genuinely be interchangeable. For example, a PostgreSQL repository and an in-memory test repository may share a contract if that improves testing.

### Classes

A class is justified when it owns state, behavior, and invariants that belong together. Do not create classes for plain data that has no behavior.

---

## 5. SOLID principles as design questions

### S — Single Responsibility

Does this unit have one reason to change? Separate rules that change for unrelated reasons, such as validation, persistence, and formatting.

### O — Open/Closed

Can a real new variation be added without editing fragile conditional logic everywhere? Use a map or strategy when repeated variation exists. Do not build an extension framework for one case.

### L — Liskov Substitution

If two implementations share a contract, do they preserve the same meaning, guarantees, error behavior, and ordering rules?

### I — Interface Segregation

Does each consumer depend only on operations it uses? Prefer focused contracts such as `GalleryReader` or `PromptImporter` over one large interface.

### D — Dependency Inversion

Do high-level rules depend on small abstractions rather than directly on database drivers, ORM clients, or file systems? Introduce this boundary where it improves testing or allows a real alternative.

SOLID is not a reason to add interfaces, classes, or layers automatically. Every abstraction should reduce a real cost.

---

## 6. Design patterns to learn

Learn patterns through problems, not memorization.

### Learn first

1. **Composition:** combine focused operations without inheritance.
2. **Adapter:** map a driver, ORM, file, or external format to an application model.
3. **Repository:** isolate persistence operations behind meaningful methods.
4. **Strategy:** represent genuinely interchangeable algorithms, such as supported sort rules.
5. **Facade:** offer one simple operation over several lower-level operations.
6. **Factory:** construct a valid object when construction has meaningful rules.
7. **State machine:** represent explicit states and legal transitions.

### Postpone unless a real problem appears

- Singleton;
- Abstract Factory;
- Visitor;
- deep inheritance hierarchies;
- generic service/manager/wrapper classes.

### Pattern decision record

Before adding a pattern, write five lines:

1. What repeated problem exists?
2. Why is the simpler design insufficient?
3. What variation does the pattern support?
4. How will the design be tested?
5. How could the pattern be removed later?

---

## 7. Database and ORM writing skills

This is the only persistence-specific part of the plan. It is included to make the database layer cleaner, not to teach general backend development.

### 7.1 Learn the relational model

Practice:

- primary and foreign keys;
- one-to-one, one-to-many, and many-to-many relationships;
- unique and check constraints;
- nullability;
- indexes based on actual query needs;
- transactions and atomic changes;
- migrations and backward-compatible schema changes.

### 7.2 Learn ORM boundaries

When evaluating Drizzle or Prisma, understand:

- how the schema is defined;
- how types are generated or inferred;
- how relations are queried;
- how migrations are created, reviewed, and applied;
- how transactions are expressed;
- how raw SQL is used for queries the ORM cannot express clearly;
- how ORM errors are translated;
- how test data is created and isolated.

### 7.3 Use a repository-shaped API

Callers should ask for domain-level operations, not build queries.

Good examples:

- `findGalleryImages(filters)`;
- `countGalleryImages(filters)`;
- `findCategoriesWithCounts(filters)`;
- `savePendingPrompt(input)`.

Avoid leaking these details into callers:

- table names;
- ORM query builders;
- SQL fragments;
- column aliases;
- driver row formats.

### 7.4 Keep one source of truth for filters

Filtering, counting, and pagination must use the same filter rules. Otherwise the displayed result count will disagree with the returned rows.

Whether the implementation uses SQL, Drizzle, or Prisma, define the filter meaning once and test it at the persistence boundary.

### 7.5 ORM adoption plan

1. Record the current `pg` and handwritten-SQL behavior with tests.
2. Compare Drizzle and Prisma against type safety, migrations, relations, query clarity, and team familiarity.
3. Decide whether the ORM solves a current problem.
4. Document the decision and migration boundary.
5. Introduce the selected ORM beside the existing driver only if a gradual migration is possible.
6. Migrate one read operation first.
7. Compare generated SQL, returned data, error behavior, and performance.
8. Migrate additional operations only when the result is clearer and safer.
9. Keep raw SQL for exceptional queries when it is more readable, but isolate it behind the same repository boundary.
10. Remove the old path only after behavior is covered and the new path is proven.

The success criterion is not “the project uses an ORM.” It is:

> Persistence code has a clear contract, safe queries, explicit constraints, reliable migrations, and tests that protect behavior.

---

## 8. Testing and safe refactoring

Study unit, integration, contract, and end-to-end tests as different tools. This plan prioritizes tests for rules and boundaries rather than framework-specific testing skills.

Test first or characterize behavior for:

- URL and input parsing;
- normalization and validation;
- pagination calculations;
- mapping database rows to application data;
- filtering and counting consistency;
- empty and failure states;
- ORM/repository behavior against a test database or controlled fixture.

Safe refactoring workflow:

1. Choose one smell or unclear responsibility.
2. Write a test for the behavior that must remain true.
3. Make one structural change.
4. Run the relevant checks.
5. Inspect the diff and remove accidental complexity.
6. Stop when the design is clearer; do not continue refactoring without a new reason.

---

## 9. Twelve-week learning plan

### Week 1 — Names and readability

Study naming, guard clauses, comments, duplication, and shallow control flow. Improve one small module and explain why each change improves reading.

### Week 2 — Responsibilities

Draw the responsibility boundaries of one feature. Identify code that mixes rules, mapping, persistence, orchestration, or delivery.

### Week 3 — TypeScript design

Practice unions, narrowing, strict null handling, typed boundaries, and replacing ambiguous object shapes.

### Week 4 — Pure rules and side effects

Separate deterministic calculations and validation from database, file, time, and other side effects. Test pure rules independently.

### Week 5 — Testing fundamentals

Add tests for input validation, normalization, pagination, and important failure cases. Learn which behavior belongs in a unit test versus a boundary test.

### Week 6 — Refactoring safely

Use characterization tests, small changes, and diff review. Refactor one long function, duplicate rule, or mixed-responsibility module.

### Week 7 — OOP fundamentals

Practice encapsulation, composition, interfaces, value objects, and deciding when a class is actually useful.

### Week 8 — SOLID

Review one real unit against each SOLID principle. Change only the principle that identifies a measurable problem.

### Week 9 — Persistence design

Study relational constraints, transactions, mapping, repository boundaries, and database error translation.

### Week 10 — ORM evaluation

Compare Drizzle and Prisma. Write a short decision record. Do not install or migrate anything without a clear decision.

### Week 11 — ORM/repository experiment

If the decision is positive, port one small read operation behind the existing boundary. Compare behavior and query clarity with the current `pg` implementation.

### Week 12 — Personal standards

Create a personal review checklist from recurring mistakes. Review an earlier change as if it were a pull request and document one meaningful design decision.

---

## 10. Workflow for every change

### Before writing

1. Describe the behavior in one sentence.
2. List inputs, outputs, invariants, and failure cases.
3. Identify the owner of the behavior.
4. Check for an existing module or rule that should be reused.
5. Choose the smallest test that proves the behavior.

### While writing

1. Write the normal path clearly.
2. Validate at the boundary.
3. Keep side effects explicit.
4. Prefer composition over inheritance.
5. Avoid speculative abstractions.
6. Keep the change focused.

### After writing

1. Read the code as a new contributor.
2. Check names, responsibility, duplication, and error behavior.
3. Run the applicable type, lint, test, and build checks.
4. Review the complete diff.
5. Verify that only intended files changed.
6. Update documentation when a public behavior or design decision changed.

---

## 11. Review checklist

- Can I state the responsibility of this unit in one sentence?
- Does the name communicate intent?
- Are inputs and outputs explicit?
- Can the important rule be tested without infrastructure?
- Is the abstraction solving a current problem?
- Are framework, driver, or ORM details isolated at the boundary?
- Are database constraints and transactions explicit?
- Do list and count operations use the same filter meaning?
- What happens for empty, invalid, slow, or failed input?
- Is there a simpler design with fewer moving parts?
- Does the change improve the code’s next change boundary?

---

## 12. Definition of done

A piece of code is ready when:

- its purpose is clear from its names and structure;
- its responsibility is narrow enough to explain;
- important rules have appropriate tests;
- invalid inputs and failure behavior are deliberate;
- types communicate meaningful states;
- persistence details are isolated behind a clear contract;
- ORM or SQL usage is safe, understandable, and migration-friendly;
- no design pattern was added without a demonstrated need;
- the change is small enough to review;
- the final diff contains no unrelated work.

The final standard is simple:

> The code should be easier to understand and safer to change after the work than it was before the work.

---

## Suggested references

- Martin Fowler, *Refactoring*;
- Robert C. Martin, *Clean Code* and *Agile Software Development*;
- Gamma et al., *Design Patterns*;
- the official TypeScript Handbook;
- the official documentation for the ORM selected after evaluation;
- PostgreSQL documentation for constraints, indexes, and transactions.

Use one concept at a time and apply it in a small exercise. Finishing a book is not evidence of skill; explaining a design decision, testing it, and removing unnecessary complexity is.
