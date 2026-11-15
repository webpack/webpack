"use strict";

const { repeat } = require("../_shared/record");

const FILLER = repeat(6000, (i) => `.f${i}{color:red}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer outer{${FILLER}@layer a{.p{color:teal}}.mid{margin:0}@layer a{@media print{.q{color:teal}}}}`;

module.exports = { source };
