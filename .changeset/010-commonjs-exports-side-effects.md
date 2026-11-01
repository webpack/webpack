---
"webpack": minor
---

Treat top-level `exports.x = …`, `module.exports = …`, `Object.defineProperty(exports, "x", { … })` with pure values and `require()` of side-effect-free modules as side-effect free, and evaluate them in import order when concatenated.
