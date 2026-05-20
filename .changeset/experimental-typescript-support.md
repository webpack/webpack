---
"webpack": minor
---

Add experimental TypeScript support via `experiments.typescript: true` (auto-enabled by `experiments.futureDefaults`). Uses Node.js's built-in `module.stripTypeScriptTypes` (Node.js >= 22.6 with the stable `mode: "strip"` API, including Node.js 26) to transform `.ts`, `.cts`, `.mts`, `data:text/typescript`, and `data:application/typescript` modules — no type checking, only erasable TypeScript (types, generics, `import type`, casts). `.tsx`/JSX and non-erasable syntax (`enum`, `namespace`, parameter-property constructors, decorator metadata) are NOT supported; use a TSX-capable loader (e.g. `ts-loader`, `swc-loader`) for those.
