"use strict";

const { repeat } = require("../_shared/record");

const filler = repeat(17000, (i) => `.f${i}{top:${i + 1}px}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@media all{@layer a{.x{color:red}}@layer a.b{${filler}}@layer a{.y{color:#00f}}}`;

module.exports = { source };
