// A CommonJS module is not strict ESM, so its import() keeps the `__esModule` interop.
exports.load = () => import("./module.js");
