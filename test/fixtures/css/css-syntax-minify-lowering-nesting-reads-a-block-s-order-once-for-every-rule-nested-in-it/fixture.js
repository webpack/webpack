"use strict";

const { repeat } = require("../_shared/record");

/**
 * @param {number=} n how many blocks each run holds, the snapshots' own where absent
 * @returns {string} the stylesheet the test reads
 */
const source = (n) => {
	const size = n === undefined ? 4 : n;
	return `.p{.a{top:0}${repeat(size, (i) => `.c${i}{z-index:${i}}`)}color:red;${repeat(
		size,
		(i) => `.c${i}{z-index:${i}}`
	)}.a{top:0}}.q{.b{top:0}color:red;${repeat(size - 1, (i) => `.d${i}{left:${i}px}`)}}`;
};

module.exports = { source };
