---
"webpack": patch
---

Fix JavaScript one-pass minifier output where a comment ended a line after `return`, `throw` or a joined declaration, where `delete` took `undefined` or `Infinity`, where a parameter `arguments` writes or a `let` in its dead zone was read in place of another, and where a tree printed after it read what the one pass found of the one before.
