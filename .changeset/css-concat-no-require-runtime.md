---
"webpack": patch
---

Avoid emitting the `__webpack_require__` runtime in CSS bundles when all imported CSS modules were concatenated into the same scope.
