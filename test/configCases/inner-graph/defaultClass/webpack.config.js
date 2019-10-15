const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"lodash-es": []
		}
	},
	all: {
		usedExports: ["default"],
		expect: {
			"lodash-es": ["uniq"]
		}
	}
});
