"use strict";

// The fixture uses private methods and optional chaining, which Node 14.6
// is the first to parse when the harness executes the bundle.
module.exports = function filter() {
	try {
		eval("class A { #m() {} static #s() {} get #g() { return a?.b; } }");
		return true;
	} catch (_err) {
		return false;
	}
};
