"use strict";

const createTestCases = require("../_helpers/createTestCases");

module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"./inner": ["effect_e", "effect_f", "effect_g", "effect_h"]
		}
	},
	all: {
		usedExports: ["callAll"],
		expect: {
			"./inner": [
				"a",
				"b",
				"c",
				"d",
				"effect_e",
				"effect_f",
				"effect_g",
				"effect_h"
			]
		}
	}
});
