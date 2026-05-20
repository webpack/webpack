// `"module.exports"` and a sibling named export bound to *different* values.
// This pins down a tree-shaking regression: in `usedExports: true` builds,
// `require("./distinct.mjs").named` must observe Node's `require(esm)`
// semantics — `.named` is accessed on the unwrapped `"module.exports"`
// value (a string here, so the access yields `undefined`), NOT on the
// namespace where it would yield "named-value".
const moduleExportsValue = "module-exports-value";
const namedValue = "named-value";
export { moduleExportsValue as "module.exports", namedValue as named };
