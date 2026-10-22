"use strict";

const ns = require("../targets/esm?esm");
exports.ns = ns;
exports.foo = ns.foo;
exports.default = ns.default;
exports.bump = ns.bump;
Object.defineProperty(exports, "counter", {
	enumerable: true,
	get: () => ns.counter
});
