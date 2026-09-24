const ns = require("./module?cjs");
exports.ns = ns;
exports.a = ns.a;
Object.defineProperty(exports, "lazy", { get: () => ns });
