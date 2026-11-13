"use strict";

const { repeat } = require("../_shared/record");

const filler = repeat(17000, (i) => `.f${i}{top:${i + 1}px}`);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@media all{::-webkit-input-placeholder{color:red}${filler}::placeholder{color:red}}`;

module.exports = { source };
