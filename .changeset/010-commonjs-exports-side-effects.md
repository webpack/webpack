---
"webpack": minor
---

Treat top-level `exports.x = …`, `module.exports = …` and `Object.defineProperty(exports, "x", { … })` with pure values as side-effect free.
