"use strict";

/**
 * @param {string} string string to escape
 * @returns {string} escaped string
 */
module.exports = function regexEscape(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
};
