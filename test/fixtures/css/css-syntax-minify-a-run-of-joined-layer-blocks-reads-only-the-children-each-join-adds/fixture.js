"use strict";

const { repeat } = require("../_shared/record");

/**
 * @param {number=} n how many blocks each run holds, the snapshots' own where absent
 * @returns {string} the stylesheet the test reads
 */
const source = (n) => {
	const size = n === undefined ? 6 : n;
	return `${repeat(
		size,
		(i) =>
			`@layer a{.c${i}{z-index:${i}}@media print{.m${i}{left:${i}px}}}`
	)}@layer a{.c2{z-index:2}}${repeat(
		size - 3,
		(i) => `@media print{.x${i}{top:0}color:red}`
	)}`;
};

module.exports = { source };
