"use strict";

const createTestCases = require("../_helpers/createTestCases");

module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			dep: []
		}
	},
	joined: {
		usedExports: ["joined"],
		expect: {
			dep: ["a"]
		}
	},
	flags: {
		usedExports: ["flags"],
		expect: {
			dep: ["b", "c"]
		}
	},
	Derived: {
		usedExports: ["Derived"],
		expect: {
			dep: ["E", "d"]
		}
	},
	Named: {
		usedExports: ["Named"],
		expect: {
			dep: ["F"]
		}
	}
});
