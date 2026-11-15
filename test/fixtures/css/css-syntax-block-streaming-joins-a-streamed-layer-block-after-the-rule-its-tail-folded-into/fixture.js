"use strict";

const { repeat } = require("../_shared/record");

const FILLER = repeat(3300, (i) => `.f${i}{margin:0}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@layer x{${FILLER}.a{color:red}.a{padding:0}}@layer x{.b{color:red;padding:0}}`;

module.exports = { source };
