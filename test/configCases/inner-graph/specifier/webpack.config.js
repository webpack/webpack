const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"./assert": []
		}
	},
	fun1: {
		usedExports: ["fun1"],
		expect: {
			"./assert": ["deepEqual", "equal"]
		}
	},
	fun2: {
		usedExports: ["fun2"],
		expect: {
			"./assert": ["deepEqual"]
		}
	},
	all: {
		usedExports: ["fun1", "fun2"],
		expect: {
			"./assert": ["deepEqual", "equal"]
		}
	}
});
