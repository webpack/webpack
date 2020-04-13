export const isWebpackIncludedFunction = typeof __webpack_is_included__ === "function";
export const unused = __webpack_is_included__("./moduleUnused");
export const used = __webpack_is_included__("./module" + "Used");
export const notPresented = __webpack_is_included__("./anyOtherModule");
