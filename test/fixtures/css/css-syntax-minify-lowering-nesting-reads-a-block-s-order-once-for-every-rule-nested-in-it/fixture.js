"use strict";

const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`.p{.a{top:0}${repeat(4, (i) => `.c${i}{z-index:${i}}`)}color:red;${repeat(
		4,
		(i) => `.c${i}{z-index:${i}}`
	)}.a{top:0}}.q{.b{top:0}color:red;${repeat(3, (i) => `.d${i}{left:${i}px}`)}}`;

module.exports = { source };
