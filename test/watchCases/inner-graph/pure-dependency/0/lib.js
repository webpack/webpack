import { a, b } from "./dep";

// pure deps added in finishModules; must persist when lib.js is cache-restored
export const ua = /*#__PURE__*/ a();
export const ub = /*#__PURE__*/ b();
