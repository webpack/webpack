"use strict";

const { repeat } = require("../_shared/record");

const filler = repeat(17000, (i) => `.f${i}{top:${i + 1}px}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@media all{@layer x.k{a{color:red}}${filler}.y{@layer x{b{top:0}}}@layer x.k{c{color:lime}}}`;

module.exports = { source };
