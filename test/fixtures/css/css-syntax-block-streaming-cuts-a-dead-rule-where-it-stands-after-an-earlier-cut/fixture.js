"use strict";

const { repeat } = require("../_shared/record");

const dead = ".p{color:red}.q{color:blue}";
const victim =
	".victim{opacity:1;background:red;border-radius:0;align-items:flex-start}";

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer outer{${repeat(
		6000,
		(i) => `.f${i}{color:red}`
	)}@layer a{${dead}}@layer a{${dead}}@layer a{${victim}}@layer a{.q{color:blue}}}`;

module.exports = { source };
