"use strict";

const { repeat } = require("../_shared/record");

const filler = repeat(3400, (i) => `.f${i}{top:${i + 1}px}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@media all{@layer x{a{color:red}}${filler}@layer x{c{color:lime}}}`;

module.exports = { source };
