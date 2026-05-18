---
"webpack": patch
---

Align `require()` of an ES module with Node.js's [`require(esm)`](https://nodejs.org/docs/latest/api/modules.html#loading-ecmascript-modules-using-require) `"module.exports"` named-export convention. When CommonJS `require()` resolves to an ES module that exports a binding with the literal string name `"module.exports"` (e.g. `export { value as "module.exports" }`), `require()` now returns the value of that export instead of the module's namespace object — matching Node.js v22.12+/v23+ behavior and easing migration of dual ESM/CJS libraries that rely on `module.exports = …`. The unwrap applies to plain `require()`, `require().foo`, calls (`require()(…)`), destructuring, and to CJS wrappers like `module.exports = require(esm)` / `exports.x = require(esm)`.
