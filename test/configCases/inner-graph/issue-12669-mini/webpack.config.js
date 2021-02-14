const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	// nothing: {
	// 	usedExports: [],
	// 	expect: {
	// 		"./dependency": []
	// 	}
	// },
	a: {
		usedExports: ["a"],
		expect: {
			"./dependency": ["x"]
		}
	}
	// b: {
	// 	usedExports: ["b"],
	// 	expect: {
	// 		"./dependency": ["y"]
	// 	}
	// }
});
