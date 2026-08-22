"use strict";

/**
 * Holds the main thread for a known stretch on every module it handles.
 * @param {string} source the module source
 * @returns {string} it, unchanged
 */
module.exports = function slowLoader(source) {
	const until = Date.now() + 30;

	while (Date.now() < until) {
		// Spinning on purpose.
	}

	return source;
};
