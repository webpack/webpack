"use strict";

// Each level names its parent twice, so writing the rules out doubles the
// selector per level.
/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `.x{${"& &{".repeat(24)}top:0${"}".repeat(25)}`;

module.exports = { source };
