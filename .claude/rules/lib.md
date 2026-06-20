---
paths:
  - "lib/**"
---
[REQUIRED] If you add, rename, or remove any directory directly under `lib/`,
update the matching bullet in the **Project Overview** section of `CLAUDE.md` in the same commit.
CI does not check this — drift is caught only by human reviewers.

Source files are **CommonJS only**. Types are declared via JSDoc `@typedef` — do not introduce `.ts` source files.
Use `/** @type {import("./Foo").Foo} */` annotations rather than `import type`.
