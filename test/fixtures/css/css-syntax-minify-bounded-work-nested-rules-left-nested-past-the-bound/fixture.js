"use strict";

// A long parent holding 1,024 rules of different blocks: past the bound on what
// writing them out adds, the rest stay nested in the parent.
const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`.${"a".repeat(16384)}{${repeat(1024, (i) => `.c${i}{top:${i}px}`)}}`;

module.exports = { source };
