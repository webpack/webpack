// Re-exporting a binding under the `"module.exports"` name from another
// module must still trigger the unwrap in the requiring CJS code.
export { inner as "module.exports" } from "./reexport-source.mjs";
