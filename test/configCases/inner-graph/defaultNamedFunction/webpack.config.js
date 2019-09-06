const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			any: []
		}
	},
	default: {
		usedExports: ["default"],
		expect: {
			any: ["fun1"]
		}
	}
});
