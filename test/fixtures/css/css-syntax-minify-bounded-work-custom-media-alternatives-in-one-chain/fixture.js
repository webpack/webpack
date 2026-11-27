"use strict";

// Twelve names of two alternatives each in one `and` chain, beside a long
// feature: writing them out copies the feature into 4,096 queries.
const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`${repeat(
		12,
		(i) => `@custom-media --m${i} (color),(monochrome);`
	)}@media ${repeat(12, (i) => `(--m${i}) and `)}(${"a".repeat(
		10000
	)}){a{top:0}}`;

module.exports = { source };
