"use strict";

const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer outer{${repeat(
		6000,
		(i) => `.f${i}{color:red}`
	)}@layer a{.w{color:teal}.x{color:lime}}@layer b{.m{color:#00f}}@layer a{.y{color:lime}.z{color:teal}}}`;

module.exports = { source };
