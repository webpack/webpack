"use strict";

module.exports = function supportsGlobalThis() {
	try {
		eval("globalThis");
		return true;
	} catch {
		// Ignore
	}

	return false;
};
