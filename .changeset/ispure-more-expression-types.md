---
"webpack": patch
---

Improve tree-shaking in `isPure`: handle more expression types (`ArrayExpression`, `ObjectExpression`, `NewExpression`, `ChainExpression`, `UnaryExpression` (safe operators), `MetaProperty`, `TaggedTemplateExpression`, `BinaryExpression` (strict equality)), prevent `/*#__PURE__*/` comments from leaking across `ObjectExpression` properties, and detect PURE comments inside `TemplateLiteral` interpolations.
