"use strict";

// The fixture uses class fields, which Node 12 is the first to parse when the
// harness executes the bundle.
module.exports = function filter() {
	try {
		eval("class A { [null] = 1; }");
		return true;
	} catch (_err) {
		return false;
	}
};
