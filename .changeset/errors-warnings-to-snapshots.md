---
"webpack": patch
---

Migrate hand-written errors.js/warnings.js test expectation files to Jest snapshots. The `checkArrayExpectation` helper now falls back to `toMatchSnapshot()` when no expectation file exists, with path normalization for portable snapshots across environments.
