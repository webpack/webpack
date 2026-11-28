"use strict";

// Each `@custom-selector` and `@custom-media` names the one before it twice,
// so writing a name out doubles per link.
const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@custom-selector :--s0 .a;${repeat(
		30,
		(i) => `@custom-selector :--s${i + 1} :--s${i} :--s${i};`
	)}@custom-media --m0 (min-width:1px);${repeat(
		30,
		(i) => `@custom-media --m${i + 1} (--m${i}) and (--m${i});`
	)}:--s30{top:0}@media (--m30){a{top:0}}`;

module.exports = { source };
