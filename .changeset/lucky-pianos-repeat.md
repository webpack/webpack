---
"webpack": patch
---

Fix `import d from "./mod"; d.member` reading `undefined` when `mod` re-exports a namespace as `default`.
