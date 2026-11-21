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
			`@layer a{@media print{.a${size + 6 - i}{color:red}}}@layer b{@media print{@supports (display:grid){.b${size + 6 - i}{color:red}}}}`
	)}@layer a{@media print{.a8,.a10{color:red}.x{top:0}}}@layer b{@media screen{.b9{color:red}}}${repeat(
		size - 1,
		(i) =>
			`@layer a{@media print{.c${size - 1 - i}{color:red}}}@layer b{@media screen{.d${size - 1 - i}{color:red}}}`
	)}@layer a{@media print{.e{color:red}}@media print{.f{color:red}}}@layer b{@media screen{.d4{color:red}}}@layer a{@media print{.c1,.c2{color:blue}}}@layer b{@media screen{@supports (display:grid){.d1{color:red}}}}`;
};

module.exports = { source };
