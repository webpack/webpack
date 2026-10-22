"use strict";

const ns = require("../targets/cjs?define-module-exports");
Object.defineProperty(module.exports, "viaModule", {
	enumerable: true,
	get: () => ns.a
});
Object.defineProperty(module.exports, "valueViaModule", {
	enumerable: true,
	value: ns.b
});
