"use strict";

module.exports = function supportsBlob() {
	try {
		return typeof Blob !== "undefined";
	} catch {
		return false;
	}
};
