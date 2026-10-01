"use strict";

const ns = require("../targets/cjs?hoisted-shadow");
exports.outer = ns.a;
function withVar() {
	exports.beforeVar = ns;
	// eslint-disable-next-line no-var
	var ns = { local: "var" };
	exports.afterVar = ns.local;
}
withVar();
function withFunction() {
	exports.functionShadow = typeof ns;
	function ns() {}
}
withFunction();
try {
	throw { local: "catch" };
} catch (ns) {
	exports.catchParam = ns.local;
}
class Holder {
	static read() {
		return ns.b;
	}
}
exports.fromClass = Holder.read();
