---
"webpack": patch
---

Make `import defer * as ns` more spec-compliant: `ns.x = value` no longer triggers module evaluation (per the TC39 import-defer `[[Set]]` algorithm), and the deferred namespace is now a distinct object from the eager namespace, with the same Deferred Module Namespace Exotic Object shared across defer-import call sites for the same module.
