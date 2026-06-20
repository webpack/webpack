---
paths:
  - "lib/**"
  - "test/**"
---
Test files mirror the `lib/` directory structure. A new module at `lib/foo/Bar.js`
requires a corresponding test at `test/foo/Bar.test.js`.

[REQUIRED] If you add or remove a directory under `test/`, update the matching bullet
in the **Project Overview** section of `CLAUDE.md` in the same commit.

Running tests:
- All: `yarn test` (slow) or `yarn test --no-cov` (faster)
- Single file: `jest test/<path>.js`

New features require a changeset: run `yarn changeset` and describe the change before committing.
