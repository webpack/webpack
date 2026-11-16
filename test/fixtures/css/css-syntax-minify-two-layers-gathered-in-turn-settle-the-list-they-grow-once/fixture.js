"use strict";

const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`${repeat(
		4,
		(i) =>
			`@layer a{.a${10 - i}{color:red}}@layer b{.b${10 - i}{color:red}}`
	)}@layer a{.a8,.a10{color:red}.x{top:0}}@layer b{.b9{top:0}}${repeat(
		3,
		(i) => `@layer a{.c${3 - i}{color:red}}@layer b{.d${3 - i}{top:0}}`
	)}@layer a{.c1,.c2{color:blue}}@layer c{}@layer c{.y{top:0}}`;

module.exports = { source };
