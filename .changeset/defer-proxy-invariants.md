---
"webpack": patch
---

Fix several spec deviations in the deferred namespace object returned by `__webpack_require__.z` (`import defer * as ns` / `import.defer(...)`):

- **Proxy invariant violations.** Structural introspection (`Object.keys`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor`) on a deferred namespace previously threw `'getOwnPropertyDescriptor' on proxy: trap reported non-configurability for property '<name>' which is either non-existent or configurable in the proxy target` because the proxy target stayed empty while the trap returned non-configurable descriptors from the resolved namespace. The trap now mirrors the resolved namespace's own properties onto a dedicated target object after evaluation, and pre-populates `__esModule` / `Symbol.toStringTag` (with non-configurable, non-writable, non-enumerable descriptors per the TC39 import-defer spec for Module Namespace Exotic Objects) so pre-evaluation introspection is also invariant-compliant. The `Symbol.toStringTag` value (`"Deferred Module"`) is preserved from the proposal.

- **Symbol-keyed accesses no longer trigger evaluation.** Per `IsSymbolLikeNamespaceKey` in the TC39 import-defer spec, `[[Get]]` / `[[Has]]` / `[[GetOwnProperty]]` for a Symbol key (and for `"then"` on a deferred namespace) must go through `OrdinaryGet…` without triggering evaluation of the deferred module. The proxy traps now short-circuit for those cases. `[[DefineOwnProperty]]` and `[[Delete]]` short-circuit for symbol-like keys but continue to trigger evaluation for string keys (matching the spec, which calls `[[GetOwnProperty]]` / `GetModuleExportsList` for non-symbol-like keys). `[[Set]]` always returns false without triggering evaluation, matching the spec algorithm.

These changes unblock 19 previously-skipped test262 cases under `language/import/import-defer/` (and the two configCases-side bugs that surfaced them — `Object.getOwnPropertyNames` on the deferred namespace, and `typeof ns.default` for default-only/default-with-named external deferred imports under `concatenateModules`).
