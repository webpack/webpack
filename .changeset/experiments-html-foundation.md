---
"webpack": minor
---

Added an `experiments.html` flag that reserves the `html` module type for upcoming first-class HTML entry-point support (issue #536). Enabling the flag today is a no-op beyond registering the module type on `NormalModuleFactory`; the parser, generator, and HTML asset emission land in subsequent changes.
