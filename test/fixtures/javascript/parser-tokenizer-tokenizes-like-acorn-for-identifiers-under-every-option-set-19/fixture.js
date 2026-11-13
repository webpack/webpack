"use strict";

/**
 * @returns {string} a lone lead surrogate, which no file can hold
 */
const source = () =>
	"\uD835";

module.exports = { source };
