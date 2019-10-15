const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			any: []
		}
	},
	exp1: {
		usedExports: ["default"],
		expect: {
			any: ["fun1"]
		}
	}
});
