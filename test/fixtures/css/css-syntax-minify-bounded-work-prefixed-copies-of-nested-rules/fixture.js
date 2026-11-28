"use strict";

// Each level is a rule a target needs a prefixed copy of, each copy holding
// the copies of the levels in it.
/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `${"a:autofill{".repeat(20)}top:0${"}".repeat(20)}`;

module.exports = { source };
