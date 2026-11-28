"use strict";

// A `calc()` adding a zero percentage to a long run of digits, which a
// backtracking number pattern read in quadratic time.
/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`.a{transform:translate(calc(0% + ${"1".repeat(200000)}),0)}`;

module.exports = { source };
