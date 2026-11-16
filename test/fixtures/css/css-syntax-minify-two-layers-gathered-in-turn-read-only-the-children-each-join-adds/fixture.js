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
		(i) => `@layer a{.a${i}{z-index:${i}}}@layer b{.b${i}{z-index:${i}}}`
	)}@layer a{.a1{z-index:1}}${repeat(
		size - 1,
		(i) =>
			`@layer a{@media print{.m${i}{top:${i}px}}}@layer b{@media print{.n${i}{top:${i}px}}}`
	)}@layer c{}@layer c{.x{top:0}}@layer c{.y{top:0}}`;
};

module.exports = { source };
