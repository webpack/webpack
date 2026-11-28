"use strict";

// A comment parts each range from the comma after it, so the print decides a
// junction 100,000 times over a value that grows with each.
/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@font-face{unicode-range:${"U+0/**/,".repeat(100000)}U+1}`;

module.exports = { source };
