const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"./test": []
		}
	},
	a: {
		usedExports: ["a"],
		expect: {
			"./test": ["A"]
		}
	},
	b: {
		usedExports: ["b"],
		expect: {
			"./test": []
		}
	},
	c: {
		usedExports: ["c"],
		expect: {
			"./test": ["C1", "C2"]
		}
	},
	d: {
		usedExports: ["d"],
		expect: {
			"./test": ["D2"]
		}
	},
	e: {
		usedExports: ["e"],
		expect: {
			"./test": ["E2"]
		}
	},
	f: {
		usedExports: ["f"],
		expect: {
			"./test": ["F"]
		}
	},
	g: {
		usedExports: ["g"],
		expect: {
			"./test": ["G"]
		}
	}
});
