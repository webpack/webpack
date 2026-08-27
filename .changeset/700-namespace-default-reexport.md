---
"webpack": minor
---

Improve tree-shaking for a namespace reexported as default, and fix `import d from "./mod"; d.member` reading `undefined` in that case.
