---
"webpack": minor
---

Add `CssModulesPlugin.getCompilationHooks(compilation).orderModules` hook. The hook is called once per CSS source type (CSS imports, CSS modules) with the chunk's modules pre-sorted by full module name; taps may return an ordered `Module[]` to override webpack's default import-order topological sort, or return `undefined` to keep the default. This lets a plugin enforce a deterministic CSS module order (e.g. by file path) and side-step the "Conflicting order between css ..." warning when migrating from `mini-css-extract-plugin` to the builtin CSS support.
