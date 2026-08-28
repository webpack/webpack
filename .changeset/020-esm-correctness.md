---
"webpack": patch
---

Fix ESM correctness: warn on a circular reexport instead of overflowing the stack, keep a write to an imported binding throwing, keep a const export's TDZ inside an import cycle, answer `in` on a namespace re-export, and evaluate a defer-and-eager module at its eager position.
