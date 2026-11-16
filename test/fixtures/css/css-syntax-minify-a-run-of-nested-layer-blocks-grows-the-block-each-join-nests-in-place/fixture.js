"use strict";

const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`${repeat(
		4,
		(i) => `@layer a{@media print{.c${i}{z-index:${i}}}}`
	)}@layer a{@media print{.c1{z-index:1}}}${repeat(
		3,
		(i) => `@layer a{@media print{@supports (display:grid){.s${i}{top:${i}px}}}}`
	)}@layer a{@media print{.d{top:0}}.e{top:0}}${repeat(
		2,
		(i) => `@layer a{@media print{.f${i}{top:0}}}`
	)}`;

module.exports = { source };
