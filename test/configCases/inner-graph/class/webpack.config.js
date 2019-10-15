const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"./assert": []
		}
	},
	ExportCls1: {
		usedExports: ["ExportCls1"],
		expect: {
			"./assert": ["deepEqual"]
		}
	},
	ExportCls2: {
		usedExports: ["ExportCls2"],
		expect: {
			"./assert": ["equal"]
		}
	},
	all: {
		usedExports: ["ExportCls1", "ExportCls2"],
		expect: {
			"./assert": ["deepEqual", "equal"]
		}
	}
});
