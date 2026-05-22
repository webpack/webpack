---
"webpack": patch
---

Fix runtime `ReferenceError` on the first activation of a lazy-compiled module when `output.library.type` produces a closure-wrapped bundle (`umd`, `umd2`, `amd`, `amd-require`, `system`).

External modules of these types reference closure-bound identifiers like `__WEBPACK_EXTERNAL_MODULE_react__`, supplied by the library wrapper that is generated once per chunk. When `lazyCompilation` activates an entry or import for the first time, any external dependency the lazily-built module pulls in arrives in a hot-update chunk that lives outside the original wrapper closure, so its factory body cannot resolve the closure identifier and only a manual page refresh recovers.

The inactive `LazyCompilationProxyModule` now declares statically-enumerable externals (string and object forms of `externals`) as its own dependencies, so the initial entry chunk's library wrapper already exposes their closure identifiers. When activation later pulls in those externals through the lazily-compiled module, they resolve to the already-installed factories instead of throwing. Function and RegExp externals are not pre-populated because their effective request set isn't knowable up front.
