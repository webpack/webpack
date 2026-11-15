"use strict";

const { repeat } = require("../_shared/record");

const FILLER = repeat(3300, (i) => `.f${i}{color:red}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer outer{${FILLER}@layer a{x:i;.p{top:0}}.mid{margin:0}@layer a{y:j}}`;

module.exports = { source };
