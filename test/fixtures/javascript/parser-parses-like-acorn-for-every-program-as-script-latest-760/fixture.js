"use strict";

/**
 * @returns {string} a lone lead surrogate where an expression goes, which no file can hold
 */
const source = () =>
	"x = \uD800;";

module.exports = { source };
