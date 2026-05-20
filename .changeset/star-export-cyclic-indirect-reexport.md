---
"webpack": patch
---

Fix `export *` resolution when a star-reexported module re-exports a name back to the importer cyclically. Previously, in a graph where `a` does `export * from "./b"; export * from "./c";` and `b` does `export { foo } from "./a";` while `c` provides the actual `foo` binding, webpack hoisted `foo` from `b` into `a`'s namespace without per-name cycle detection — emitting a getter chain (`a.foo` → `b.foo` → `a.foo`) that threw "Maximum call stack size exceeded" at runtime. The TC39 `ResolveExport` algorithm requires the cyclic branch to return null and the star loop to fall through to the non-cyclic source.
