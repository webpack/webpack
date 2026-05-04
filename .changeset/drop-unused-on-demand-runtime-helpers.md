---
"webpack": patch
---

Drop the `__webpack_require__`, `__webpack_require__.d`, and `__webpack_require__.o` runtime helpers from `library: { type: "module" }` bundles when the on-demand exports source they were emitted for ends up dropped (e.g. a single concatenated entry without an IIFE).
