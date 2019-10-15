const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"./internal/_curry2": []
		}
	},
	all: {
		usedExports: ["default"],
		expect: {
			"./internal/_curry2": ["default"]
		}
	}
});
