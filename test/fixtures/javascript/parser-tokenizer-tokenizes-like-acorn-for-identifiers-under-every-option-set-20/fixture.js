"use strict";

/**
 * @returns {string} a lone lead surrogate before a letter, which no file can hold
 */
const source = () =>
	"\uD835a";

module.exports = { source };
