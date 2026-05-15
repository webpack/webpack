---
"webpack": minor
---

Add experimental TypeScript support via `experiments.typescript: true` (auto-enabled by `experiments.futureDefaults`). Uses Node.js's built-in `module.stripTypeScriptTypes` (Node.js >= 22.7) to transform `.ts`, `.cts`, `.mts`, `data:text/typescript`, and `data:application/typescript` modules — no type checking, runtime transforms only. Adds matching default rules, extension resolution (`.ts` is resolved before `.js`), `extensionAlias` for `.js`/`.cjs`/`.mjs` to also try `.ts`/`.cts`/`.mts`, and `tsconfig` resolution. `.tsx`/JSX is not supported; use a TSX-capable loader instead.
