"use strict";

const createTestCases = require("../_helpers/createTestCases");

module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"@effect-ts/tracing-utils": [],
			"@effect-ts/system/Option": [
				"extend",
				"flatten",
				"getLeft",
				"getRight",
				"isNone",
				"map",
				"map_",
				"none",
				"zip"
			],
			"../Associative": [],
			"../Either": [],
			"../Function": [],
			"../Identity": [],
			"../Ord": [],
			"../Prelude": ["instance", "matchers"]
		}
	},
	if: {
		usedExports: ["if"],
		expect: {
			"@effect-ts/tracing-utils": [],
			"@effect-ts/system/Option": [
				"extend",
				"flatten",
				"getLeft",
				"getRight",
				"isNone",
				"map",
				"map_",
				"none",
				"zip"
			],
			"../Associative": [],
			"../Either": [],
			"../Function": [],
			"../Identity": [],
			"../Ord": [],
			"../Prelude": ["conditionalF", "instance", "matchers"]
		}
	}
});
