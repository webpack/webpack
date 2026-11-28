"use strict";

// A radial gradient whose first argument holds `at` between two long runs of
// spaces, which a backtracking split read in cubic time.
const space = " ".repeat(400);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`.a{background:radial-gradient("a${space}at${space}"f(),red,blue)}`;

module.exports = { source };
