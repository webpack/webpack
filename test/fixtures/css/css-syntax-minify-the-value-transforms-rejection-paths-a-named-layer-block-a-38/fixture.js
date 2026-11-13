"use strict";

const { repeat } = require("../_shared/record");

const filler = repeat(17000, (i) => `.f${i}{top:${i + 1}px}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer u{@layer a.b{.q{top:0}}@layer a/*c*/.b{${filler}}}`;

module.exports = { source };
