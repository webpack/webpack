export const local = "local";
export * from "./sub";
export { c } from "./sub2";

// pkg's own exports info, re-read on each codegen (exports-info hash change)
export const bProvided = __webpack_exports_info__.b.provideInfo;
export const cProvided = __webpack_exports_info__.c.provideInfo;
