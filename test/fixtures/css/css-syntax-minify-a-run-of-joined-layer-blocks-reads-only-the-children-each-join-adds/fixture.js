"use strict";

const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`${repeat(
		6,
		(i) =>
			`@layer a{.c${i}{z-index:${i}}@media print{.m${i}{left:${i}px}}}`
	)}@layer a{.c2{z-index:2}}${repeat(
		3,
		(i) => `@media print{.x${i}{top:0}color:red}`
	)}`;

module.exports = { source };
