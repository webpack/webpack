"use strict";

module.exports = function supportsNodePrefix() {
	try {
		eval("require('node:path')");
		return true;
	} catch (_err) {
		// Ignore
	}

	return false;
};
