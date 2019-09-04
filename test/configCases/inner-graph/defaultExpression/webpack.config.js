const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			any: ["fun2", "var1"]
		}
	},
	all: {
		usedExports: ["default"],
		expect: {
			any: ["fun2", "var1"]
		}
	}
});
