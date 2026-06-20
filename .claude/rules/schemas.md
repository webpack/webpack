---
paths:
  - "lib/**"
  - "schemas/**"
---
When adding or modifying config options in a plugin or module, update the matching JSON schema
in `schemas/` in the same PR. Auto-generate updated types by running `yarn fix` after schema changes.

[REQUIRED] If you add or remove a directory under `schemas/`, update the matching bullet
in the **Project Overview** section of `CLAUDE.md` in the same commit.
