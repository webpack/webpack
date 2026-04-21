"use strict";

const createTestCases = require("../_helpers/createTestCases");

module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			dep: ["a", "b", "c"]
		}
	},
	leak: {
		usedExports: ["leak"],
		expect: {
			dep: ["a", "b", "c"]
		}
	}
});
