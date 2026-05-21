---
"webpack": patch
---

Fix runtime `ReferenceError` on the first activation of a lazy-compiled module when `output.library.type` produces a closure-wrapped bundle (`umd`, `umd2`, `amd`, `amd-require`, `system`).

External modules of these types reference closure-bound identifiers like `__WEBPACK_EXTERNAL_MODULE_react__`, supplied by the library wrapper that is generated once for each chunk. When `lazyCompilation` activates an entry or import for the first time, any external dependencies it pulls in arrive in a hot-update chunk that lives outside the original wrapper closure, so their factories throw with an undefined identifier and only a manual page refresh recovers.

The `LazyCompilationProxyModule` now reloads the page when it transitions from inactive to active under one of these library types, so the freshly initialized bundle is built with the externals already baked into its wrapper. Other library types are unaffected.
