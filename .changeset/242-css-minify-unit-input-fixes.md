---
"webpack": patch
---

Fix the CSS minifier losing a selector when joining repeated at-rule blocks, repairing an invalid `:::before`, fusing identifiers after a hex escape, and dropping the newline after a lone `\` when lowering nesting.
