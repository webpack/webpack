---
"webpack": patch
---

Fix a runtime regression for anonymous default export expressions when the default export is emitted directly to the exports object instead of a local `__WEBPACK_DEFAULT_EXPORT__` binding.
