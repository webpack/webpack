---
"webpack": patch
---

Call `evaluateDefinedIdentifier` taps for a defined identifier, which were never called because the parser looked them up without its name.
