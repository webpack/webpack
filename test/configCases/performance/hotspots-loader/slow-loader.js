"use strict";

const holdMainThread = require("../../../helpers/holdMainThread");

/**
 * Holds the main thread for a known stretch on every module it handles.
 * @param {string} source the module source
 * @returns {string} it, unchanged
 */
module.exports = function slowLoader(source) {
	holdMainThread(30);

	return source;
};
