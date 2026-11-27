"use strict";

// A value whose every pair of numbers needs a space between them, which each
// read back from the whole value written so far.
/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `a{x:${"1-".repeat(100000)}1}`;

module.exports = { source };
