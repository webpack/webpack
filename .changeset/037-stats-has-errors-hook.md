---
"webpack": patch
---

Make `Stats.hasErrors()` read errors through the `processErrors` hook (via `getErrors()`), matching `hasWarnings()`, so a plugin that filters errors out of the hook is no longer contradicted by `hasErrors()`.
