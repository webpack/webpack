"use strict";

const createTestCases = require("../_helpers/createTestCases");

module.exports = createTestCases({
	// The `nothing` variant — `usedExports: []`, expecting `./dependency: []` — is not
	// covered here.
	a: {
		usedExports: ["a"],
		expect: {
			"./dependency": ["x"]
		}
	}
	// The `b` variant — `usedExports: ["b"]`, expecting `./dependency: ["y"]` — is not
	// covered here.
});
