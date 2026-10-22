"use strict";

const ns = require("../targets/cjs?define-shaking");
Object.defineProperty(exports, "a", { enumerable: true, value: ns.a });
Object.defineProperty(exports, "b", { enumerable: true, get: () => ns.b });
Object.defineProperty(exports, "c", {
	enumerable: true,
	get() {
		return ns.c;
	}
});
Object.defineProperty(exports, "info", {
	enumerable: true,
	value: ns.usedExports
});
