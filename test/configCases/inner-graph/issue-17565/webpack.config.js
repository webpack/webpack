const createTestCases = require("../_helpers/createTestCases");

module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"./test": ["A", "B", "C1", "C2"]
		}
	},
	all: {
		usedExports: ["cls1", "cls3", "cls5", "cls7", "cls9"],
		expect: {
			"./test": ["A", "B", "C1", "C2"]
		}
	}
});
