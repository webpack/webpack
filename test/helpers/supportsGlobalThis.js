"use strict";

module.exports = function supportsGlobalThis() {
	try {
		eval("globalThis");
		return true;
	} catch (_err) {
		// Ignore
	}

	return false;
};
