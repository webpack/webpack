"use strict";

const createTestCases = require("../_helpers/createTestCases");

module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"dep-a": [],
			"dep-o": [],
			"dep-u": [],
			"dep-b": [],
			"dep-n": []
		}
	},
	arr: {
		usedExports: ["arr"],
		expect: {
			"dep-a": ["a"],
			"dep-o": [],
			"dep-u": [],
			"dep-b": [],
			"dep-n": []
		}
	},
	obj: {
		usedExports: ["obj"],
		expect: {
			"dep-a": [],
			"dep-o": ["o"],
			"dep-u": [],
			"dep-b": [],
			"dep-n": []
		}
	},
	neg: {
		usedExports: ["neg"],
		expect: {
			"dep-a": [],
			"dep-o": [],
			"dep-u": ["u"],
			"dep-b": [],
			"dep-n": []
		}
	},
	sum: {
		usedExports: ["sum"],
		expect: {
			"dep-a": [],
			"dep-o": [],
			"dep-u": [],
			"dep-b": ["b"],
			"dep-n": []
		}
	},
	inst: {
		usedExports: ["inst"],
		expect: {
			"dep-a": [],
			"dep-o": [],
			"dep-u": [],
			"dep-b": [],
			"dep-n": ["N"]
		}
	},
	all: {
		usedExports: ["arr", "obj", "neg", "sum", "inst", "used"],
		expect: {
			"dep-a": ["a"],
			"dep-o": ["o"],
			"dep-u": ["u"],
			"dep-b": ["b"],
			"dep-n": ["N"]
		}
	}
});
