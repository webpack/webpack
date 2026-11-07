---
"webpack": patch
---

Expand dotenv names inherited from `Object.prototype` (such as `${toString}`) as unset variables, and report a `DotenvExpansionError` when expansion adds more than 1 MiB to the dotenv values.
