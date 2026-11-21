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
		(i) => `@layer a{@media print{.c${i}{z-index:${i}}}}`
	)}@layer a{@media print{.c1{z-index:1}}}${repeat(
		size - 1,
		(i) => `@layer a{@media print{@supports (display:grid){.s${i}{top:${i}px}}}}`
	)}@layer a{@media print{.d{top:0}}.e{top:0}}${repeat(
		size - 2,
		(i) => `@layer a{@media print{.f${i}{top:0}}}`
	)}`;
};

module.exports = { source };
