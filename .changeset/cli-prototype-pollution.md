---
"webpack": patch
---

Reject `__proto__`, `constructor` and `prototype` path segments in `cli.processArguments` to prevent prototype pollution.
