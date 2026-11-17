---
"webpack": patch
---

Load externals, context module, `import.meta.glob`, `import defer` and stats code only when a build uses it, so small builds start faster.
