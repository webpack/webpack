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
				"some",
				"zip"
			],
			"../Associative": [],
			"../Either": ["left", "right"],
			"../Function": [],
			"../Identity": [],
			"../Ord": [],
			"../Prelude": [
				"implementCompactF",
				"implementForEachF",
				"implementSeparateF",
				"instance",
				"matchers",
				"orElseF",
				"structF",
				"succeedF",
				"tupleF"
			]
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
				"some",
				"zip"
			],
			"../Associative": [],
			"../Either": ["left", "right"],
			"../Function": [],
			"../Identity": [],
			"../Ord": [],
			"../Prelude": [
				"implementCompactF",
				"implementForEachF",
				"implementSeparateF",
				"instance",
				"matchers",
				"orElseF",
				"structF",
				"succeedF",
				"tupleF",
				"conditionalF"
			]
		}
	}
});
