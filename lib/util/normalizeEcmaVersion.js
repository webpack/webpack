/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * Normalize ECMAScript version
 * @param {number} ecmaVersion ECMAScript version
 * @returns {number} normalized ECMAScript version
 */
module.exports = ecmaVersion => {
	let version = ecmaVersion;

	if (version === 2009) {
		return 5;
	}

	if (version >= 2015) {
		version -= 2009;
	}

	return version;
};
