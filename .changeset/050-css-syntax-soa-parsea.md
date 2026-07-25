---
"webpack": patch
---

Build the CSS `parseA*` AST on the SoA store instead of node classes, cutting parse memory and time; derive a rule's block-end from its end to drop one node column.
