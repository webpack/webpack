"use strict";

module.exports = function supportsTextDecoder() {
	try {
		return typeof TextDecoder !== "undefined";
	} catch {
		return false;
	}
};
