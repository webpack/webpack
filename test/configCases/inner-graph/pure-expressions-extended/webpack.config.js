"use strict";

const createTestCases = require("../_helpers/createTestCases");

module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			dep: []
		}
	},
	chained: {
		usedExports: ["chained"],
		expect: {
			dep: ["a"]
		}
	},
	tagged: {
		usedExports: ["tagged"],
		expect: {
			dep: ["b"]
		}
	},
	negated: {
		usedExports: ["negated"],
		expect: {
			dep: ["c"]
		}
	},
	typed: {
		usedExports: ["typed"],
		expect: {
			dep: ["d"]
		}
	},
	voided: {
		usedExports: ["voided"],
		expect: {
			dep: ["e"]
		}
	},
	all: {
		usedExports: ["chained", "tagged", "negated", "typed", "voided"],
		expect: {
			dep: ["a", "b", "c", "d", "e"]
		}
	}
});
