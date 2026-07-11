"use strict";

module.exports = function supportsOptionalChaining() {
	try {
		const f = eval("(function f() { return ({a: true}) ?.a })");
		return f();
	} catch {
		return false;
	}
};
