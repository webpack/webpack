"use strict";

const createTestCases = require("../_helpers/createTestCases");

// impure top-level symbols stay; pure ones drop unless their export is used
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			dep: ["impureCall", "classImpureCall"]
		}
	},
	PureClass: {
		usedExports: ["PureClass"],
		expect: {
			dep: ["impureCall", "classImpureCall", "classPureCall"]
		}
	},
	ImpureClass: {
		usedExports: ["ImpureClass"],
		expect: {
			dep: ["impureCall", "classImpureCall"]
		}
	},
	usedPureConst: {
		usedExports: ["usedPureConst"],
		expect: {
			dep: ["impureCall", "classImpureCall", "pureCall"]
		}
	},
	all: {
		usedExports: ["PureClass", "ImpureClass", "usedPureConst", "impureConst"],
		expect: {
			dep: ["impureCall", "classImpureCall", "classPureCall", "pureCall"]
		}
	}
});
