"use strict";

const createTestCases = require("../_helpers/createTestCases");

module.exports = createTestCases({
	useX: {
		usedExports: ["useX"],
		expect: {
			"./dependency": ["x"]
		}
	},
	useY: {
		usedExports: ["useY"],
		expect: {
			"./dependency": ["y"]
		}
	},
	both: {
		usedExports: ["useX", "useY"],
		expect: {
			"./dependency": ["x", "y"]
		}
	}
});
