"use strict";

module.exports = function supportsWebAssembly() {
	try {
		return typeof WebAssembly !== "undefined";
	} catch {
		return false;
	}
};
