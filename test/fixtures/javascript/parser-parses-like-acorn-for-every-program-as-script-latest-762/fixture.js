"use strict";

/**
 * @returns {string} a string holding a lone lead surrogate, which no file can hold
 */
const source = () =>
	"x = '\uD800';";

module.exports = { source };
