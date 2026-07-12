"use strict";

/**
 * @param {string} string string to escape
 * @returns {string} escaped string
 */
module.exports = function regexEscape(string) {
	return string.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
};
