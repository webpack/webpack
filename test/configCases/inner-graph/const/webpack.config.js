const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			any: []
		}
	},
	exp1: {
		usedExports: ["exp1"],
		expect: {
			any: ["im1"]
		}
	},
	exp2: {
		usedExports: ["exp2"],
		expect: {
			any: ["im2"]
		}
	},
	expCls: {
		usedExports: ["expCls"],
		expect: {
			any: ["im1"]
		}
	},
	exp4: {
		usedExports: ["exp4"],
		expect: {
			any: ["im2"]
		}
	},
	all: {
		usedExports: ["exp1", "exp2", "exp4", "expCls"],
		expect: {
			any: ["im1", "im2"]
		}
	}
});
