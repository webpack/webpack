"use strict";

/**
 * @returns {string} a letter before a lone trail surrogate, which no file can hold
 */
const source = () =>
	"a\uDC00";

module.exports = { source };
