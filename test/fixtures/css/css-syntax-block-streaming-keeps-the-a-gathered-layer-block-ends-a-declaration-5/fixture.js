"use strict";

const { repeat } = require("../_shared/record");

const FILLER = repeat(6000, (i) => `.f${i}{color:red}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer outer{${FILLER}@layer a{x:i}.mid{margin:0}@layer a{.q{top:0}}}`;

module.exports = { source };
