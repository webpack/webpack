"use strict";

const ns = require("../targets/cjs?getter-shapes");
Object.defineProperty(exports, "named", {
	enumerable: true,
	get: function ns() {
		return ns;
	}
});
Object.defineProperty(exports, "param", {
	enumerable: true,
	get(ns = "param-default") {
		return ns;
	}
});
Object.defineProperty(exports, "asyncArrow", {
	enumerable: true,
	get: async () => ns
});
Object.defineProperty(exports, "asyncMethod", {
	enumerable: true,
	async get() {
		return ns;
	}
});
Object.defineProperty(exports, "generator", {
	enumerable: true,
	get: function* () {
		return ns;
	}
});
Object.defineProperty(exports, "twoStatements", {
	enumerable: true,
	get() {
		const local = ns;
		return local;
	}
});
let stored;
Object.defineProperty(exports, "withSetter", {
	enumerable: true,
	get: () => (stored === undefined ? ns : stored),
	set: (value) => {
		stored = value;
	}
});
