const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"./child-module1": [],
			"./child-module2": [],
			"./child-module3": []
		}
	}
});
