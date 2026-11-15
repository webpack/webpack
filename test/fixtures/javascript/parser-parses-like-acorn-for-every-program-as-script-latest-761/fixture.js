"use strict";

/**
 * @returns {string} a lone trail surrogate where an expression goes, which no file can hold
 */
const source = () =>
	"x = \uDC00;";

module.exports = { source };
