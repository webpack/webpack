"use strict";

// direct `require()` re-exports share the template with binding-backed ones
exports.whole = require("../targets/cjs?direct");
exports.member = require("../targets/cjs?direct").a;
Object.defineProperty(exports, "value", { value: require("../targets/cjs?direct") });
Object.defineProperty(exports, "getter", {
	get: () => require("../targets/cjs?direct").b
});
Object.defineProperty(exports, "enumerableGetter", {
	enumerable: true,
	get: () => require("../targets/cjs?direct").c
});
const base = { enumerable: true };
Object.defineProperty(exports, "spread", {
	...base,
	value: require("../targets/cjs?direct").a
});
