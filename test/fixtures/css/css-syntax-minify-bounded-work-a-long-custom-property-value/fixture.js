"use strict";

// A custom property of many tokens, whose every boundary read back from the
// whole value written so far.
/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `a{--x:${"a ".repeat(200000)}}`;

module.exports = { source };
