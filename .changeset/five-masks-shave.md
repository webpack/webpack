---
"webpack": patch
---

Add the missing __webpack_exports__ declaration in certain cases when bundling a JS entry together with non-JS entries (e.g., CSS entry or asset module entry).
