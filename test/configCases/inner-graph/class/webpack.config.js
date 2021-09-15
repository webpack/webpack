const createTestCases = require("../_helpers/createTestCases");
const base = ["getNameA", "getNameB"];
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"./assert": [...base]
		}
	},
	ExportCls1: {
		usedExports: ["ExportCls1"],
		expect: {
			"./assert": [...base, "deepEqual"]
		}
	},
	ExportCls2: {
		usedExports: ["ExportCls2"],
		expect: {
			"./assert": [...base, "equal"]
		}
	},
	ExportCls3: {
		usedExports: ["ExportCls3"],
		expect: {
			"./assert": [...base, "strictEqual"]
		}
	},
	ExportCls4: {
		usedExports: ["ExportCls4"],
		expect: {
			"./assert": [...base, "notEqual"]
		}
	},
	ExportCls6: {
		usedExports: ["ExportCls6"],
		expect: {
			"./assert": [...base, "maybeEqual"]
		}
	},
	ExportCls7: {
		usedExports: ["ExportCls7"],
		expect: {
			"./assert": [...base, "definiteEqual"]
		}
	},
	ExportCls1_2: {
		usedExports: ["ExportCls1", "ExportCls2"],
		expect: {
			"./assert": [...base, "deepEqual", "equal"]
		}
	},
	all: {
		usedExports: [
			"ExportCls1",
			"ExportCls2",
			"ExportCls3",
			"ExportCls4",
			"ExportCls5a",
			"ExportCls5b",
			"ExportCls6",
			"ExportCls7"
		],
		expect: {
			"./assert": [
				...base,
				"deepEqual",
				"equal",
				"strictEqual",
				"notEqual",
				"maybeEqual",
				"definiteEqual"
			]
		}
	}
});
