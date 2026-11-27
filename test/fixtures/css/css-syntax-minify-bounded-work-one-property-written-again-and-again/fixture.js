"use strict";

// One rule writing one unknown property again and again, no write of which
// can be ranked against another.
const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `a{${repeat(20000, (i) => `pppppp:x${i};`)}}`;

module.exports = { source };
