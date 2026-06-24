import * as ns from "./cjs";
// Whole CommonJS namespace escapes; interop must keep working (no mangling).
export const getCjs = () => ns;
