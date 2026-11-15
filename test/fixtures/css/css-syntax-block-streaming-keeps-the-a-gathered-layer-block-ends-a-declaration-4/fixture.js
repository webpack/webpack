"use strict";

const { repeat } = require("../_shared/record");

const FILLER = repeat(3274, (i) => `.f${i}{color:red}`);

/**
 * @returns {string} the stylesheet the test reads: 3274 filler rules are the
 * fewest whose nodes pass `_STREAM_MIN_NODES`, so the outer block streams
 */
const source = () =>
	`@layer outer{${FILLER}@layer a{x:i}.mid{margin:0}@layer a{y:j}}`;

module.exports = { source };
