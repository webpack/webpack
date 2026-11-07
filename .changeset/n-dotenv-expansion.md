---
"webpack": patch
---

Expand dotenv names inherited from `Object.prototype` (such as `${toString}`) as unset variables, expand each dotenv value in one pass instead of searching it again after every reference, and report a `DotenvExpansionError` when expansion adds more than 1 MiB to the dotenv values or does not finish.
