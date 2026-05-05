---
"webpack": patch
---

Preserve `@charset` at-rule when CSS modules use `exportType: "text"`. The charset is prepended at build time, walking through text imports to handle the transitive case where a module has no local `@charset` but inherits one from an imported text module. When a text module imports another text module, the import's `@charset` prefix is sliced off using a build-time-computed length so the final output contains a single `@charset` directive at byte 0.
