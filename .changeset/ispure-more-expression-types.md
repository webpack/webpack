---
"webpack": patch
---

Improve tree-shaking by handling more expression types in `isPure`: `ArrayExpression`, `ObjectExpression`, `UnaryExpression`, `BinaryExpression`, `NewExpression`, `TaggedTemplateExpression`, and `ChainExpression`. This enables inner-graph analysis to track dependencies through these expression types, allowing better dead code elimination for patterns like `/*#__PURE__*/ fn({key: value})`.
