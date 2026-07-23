---
"webpack": patch
---

Fix exponential-time side-effects analysis on cyclic module graphs by memoizing cycle-free results via Tarjan lowlink.
