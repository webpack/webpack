"use strict";

module.exports = function supportsSpread() {
	try {
		const x = { a: true };
		const y = eval("({ ...x })");
		return y !== x && y.a;
	} catch (_err) {
		return false;
	}
};
