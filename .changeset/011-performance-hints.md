---
"webpack": minor
---

Add performance hints reporting what a build costs: duplicate packages and modules, circular dependencies, broad contexts, large modules and chunks, hotspots, `eval`, missing PURE annotations, polyfills, redundant dynamic imports, OS-dependent rules, cache effectiveness, how chunks load, what splitting refused, why an optimization was skipped, and rules, defines, externals, aliases and barrel reexports nothing uses. An oversized asset names its largest modules, and an entrypoint carrying the runtime recommends `optimization.runtimeChunk`. Enable every check not set individually with `performance.all`, report hints in stats only with `performance.hints: "stats"`, and get them in a stable order that leaves the build hashes unchanged.
