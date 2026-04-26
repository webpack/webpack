"use strict";

const createTestCases = require("../_helpers/createTestCases");

module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			dep: []
		}
	},
	arr: {
		usedExports: ["arr"],
		expect: {
			dep: ["a"]
		}
	},
	obj: {
		usedExports: ["obj"],
		expect: {
			dep: ["b"]
		}
	},
	inst: {
		usedExports: ["inst"],
		expect: {
			dep: ["c"]
		}
	},
	all: {
		usedExports: ["arr", "obj", "inst"],
		expect: {
			dep: ["a", "b", "c"]
		}
	}
});
