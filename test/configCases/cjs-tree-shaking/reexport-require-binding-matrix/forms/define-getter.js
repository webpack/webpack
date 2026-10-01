"use strict";

const ns = require("../targets/cjs?define-getter");
Object.defineProperty(exports, "arrow", { enumerable: true, get: () => ns });
Object.defineProperty(exports, "arrowMember", {
	enumerable: true,
	get: () => ns.a
});
Object.defineProperty(exports, "functionGetter", {
	enumerable: true,
	get: function () {
		return ns.b;
	}
});
Object.defineProperty(exports, "methodGetter", {
	enumerable: true,
	get() {
		return ns.nested.x;
	}
});
Object.defineProperty(exports, "hidden", { get: () => ns.a });
Object.defineProperty(exports, "configurable", {
	enumerable: true,
	configurable: true,
	get: () => ns.a
});
Object.defineProperty(exports, "minified", { enumerable: !0, get: () => ns.c });
Object.defineProperty(exports, "minifiedHidden", { enumerable: !1, value: ns.c });
Object.defineProperty(exports, "info", {
	enumerable: true,
	get: () => ns.usedExports
});
