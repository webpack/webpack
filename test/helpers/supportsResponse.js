"use strict";

module.exports = function supportsResponse() {
	try {
		return typeof Response !== "undefined";
	} catch {
		return false;
	}
};
