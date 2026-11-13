"use strict";

const { repeat } = require("../_shared/record");

const FILLER = repeat(6000, (i) => `.f${i}{color:red}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@media print{@layer x{${FILLER}c{x:1}}@layer x{b{x:1}}}` +
	`@layer y{${FILLER}c{x:1}}@layer y{c{x:1}}` +
	`@layer z{${FILLER}@layer a{[x="a,.q,b"]{color:teal}}.mid{margin:0}@layer a{.q{color:teal}}}`;

module.exports = { source };
