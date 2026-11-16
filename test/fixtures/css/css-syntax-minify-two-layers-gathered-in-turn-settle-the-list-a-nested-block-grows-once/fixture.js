"use strict";

const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`${repeat(
		4,
		(i) =>
			`@layer a{@media print{.a${10 - i}{color:red}}}@layer b{@media print{@supports (display:grid){.b${10 - i}{color:red}}}}`
	)}@layer a{@media print{.a8,.a10{color:red}.x{top:0}}}@layer b{@media screen{.b9{color:red}}}${repeat(
		3,
		(i) =>
			`@layer a{@media print{.c${3 - i}{color:red}}}@layer b{@media screen{.d${3 - i}{color:red}}}`
	)}@layer a{@media print{.e{color:red}}@media print{.f{color:red}}}@layer b{@media screen{.d4{color:red}}}@layer a{@media print{.c1,.c2{color:blue}}}@layer b{@media screen{@supports (display:grid){.d1{color:red}}}}`;

module.exports = { source };
