---
"webpack": patch
---

Improve tree-shaking by handling more expression types in `isPure`: `ArrayExpression`, `ObjectExpression`, `NewExpression`, `ChainExpression`, `UnaryExpression` (safe operators), `MetaProperty`, `TaggedTemplateExpression` and `BinaryExpression` (strict equality).
