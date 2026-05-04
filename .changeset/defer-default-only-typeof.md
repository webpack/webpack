---
"webpack": patch
---

Fix `typeof ns.default` / `ns.default instanceof X` on a static `import defer * as ns from "./mod"` for `default-only` and `default-with-named` external modules under `optimization.concatenateModules`. The concatenated-module rewrite was collapsing `ns.default` to the deferred-namespace proxy itself instead of routing through the optimized `.a` getter (which lazily evaluates the module and returns its default value), so `typeof ns.default` observed `"object"` (the proxy) rather than the type of the default. The `dynamic` exportsType already used `.a` correctly; default-only and default-with-named now match.
