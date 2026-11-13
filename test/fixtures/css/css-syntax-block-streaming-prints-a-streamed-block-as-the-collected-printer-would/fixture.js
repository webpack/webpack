"use strict";

const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`.root{color:red;${repeat(1800, (i) => `& .n${i}{color:red}`)}}`;

module.exports = { source };
