"use strict";

const { repeat } = require("../_shared/record");

/**
 * @param {number=} n how many blocks each run holds, the snapshots' own where absent
 * @returns {string} the stylesheet the test reads
 */
const source = (n) => {
	const size = n === undefined ? 4 : n;
	return `${repeat(
		size,
		(i) =>
			`@layer a{.a${size + 6 - i}{color:red}}@layer b{.b${size + 6 - i}{color:red}}`
	)}@layer a{.a8,.a10{color:red}.x{top:0}}@layer b{.b9{top:0}}${repeat(
		size - 1,
		(i) => `@layer a{.c${size - 1 - i}{color:red}}@layer b{.d${size - 1 - i}{top:0}}`
	)}@layer a{.c1,.c2{color:blue}}@layer c{}@layer c{.y{top:0}}`;
};

module.exports = { source };
