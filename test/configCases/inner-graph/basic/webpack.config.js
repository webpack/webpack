const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"./assert": ["equal"]
		}
	},
	myFunction: {
		usedExports: ["myFunction"],
		expect: {
			"./assert": ["deepEqual", "equal"]
		}
	}
});
