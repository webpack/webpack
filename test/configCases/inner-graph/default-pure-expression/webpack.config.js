"use strict";

const createTestCases = require("../_helpers/createTestCases");

// pure default expression drops its import unless the default export is used
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			dep: []
		}
	},
	default: {
		usedExports: ["default"],
		expect: {
			dep: ["a"]
		}
	},
	other: {
		usedExports: ["other"],
		expect: {
			dep: ["b"]
		}
	},
	all: {
		usedExports: ["default", "other"],
		expect: {
			dep: ["a", "b"]
		}
	}
});
