"use strict";

module.exports = function supportsNodePrefix() {
	try {
		eval("require('node:path')");
		return true;
	} catch {
		// Ignore
	}

	return false;
};
