"use strict";

const ns = require("../targets/cjs?define-value");
Object.defineProperty(exports, "plain", { value: ns });
Object.defineProperty(exports, "member", { value: ns.a });
Object.defineProperty(exports, "open", {
	value: ns,
	enumerable: true,
	writable: true,
	configurable: true
});
Object.defineProperty(exports, "info", {
	enumerable: true,
	value: ns.usedExports
});
