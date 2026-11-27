"use strict";

// Each level is an at-rule a target needs a prefixed copy of, each copy
// holding the copies of the levels in it.
/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`${"@document url-prefix(){".repeat(24)}a{top:0}${"}".repeat(24)}`;

module.exports = { source };
