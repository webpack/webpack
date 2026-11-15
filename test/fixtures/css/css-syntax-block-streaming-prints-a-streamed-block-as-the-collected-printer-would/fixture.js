"use strict";

const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads: 2341 child rules are the
 * fewest whose nodes pass `_STREAM_MIN_NODES`, so its block streams
 */
const source = () =>
	`.root{color:red;${repeat(2341, (i) => `& .n${i}{color:red}`)}}`;

module.exports = { source };
