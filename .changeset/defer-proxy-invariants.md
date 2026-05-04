---
"webpack": patch
---

Fix proxy invariant violations on the `import defer` deferred namespace object. Structural introspection (`Object.keys`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor`) on a deferred namespace previously threw `'getOwnPropertyDescriptor' on proxy: trap reported non-configurability for property '<name>' which is either non-existent or configurable in the proxy target` because the proxy target stayed empty while the trap returned non-configurable descriptors from the resolved namespace. The trap now mirrors the resolved namespace's own properties onto the target after evaluation, and pre-populates `__esModule` / `Symbol.toStringTag` so pre-evaluation introspection stays invariant-compliant. The synthetic `Symbol.toStringTag` value (`"Deferred Module"`, per the TC39 import-defer proposal) is preserved.
