"use strict";

const createTestCases = require("../_helpers/createTestCases");

module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			dep: []
		}
	},
	chained: {
		usedExports: ["chained"],
		expect: {
			dep: ["a"]
		}
	},
	tagged: {
		usedExports: ["tagged"],
		expect: {
			dep: ["b"]
		}
	},
	negated: {
		usedExports: ["negated"],
		expect: {
			dep: ["c"]
		}
	},
	typed: {
		usedExports: ["typed"],
		expect: {
			dep: ["d"]
		}
	},
	voided: {
		usedExports: ["voided"],
		expect: {
			dep: ["e"]
		}
	},
	eqStrict: {
		usedExports: ["eqStrict"],
		expect: {
			dep: ["f"]
		}
	},
	neStrict: {
		usedExports: ["neStrict"],
		expect: {
			dep: ["g"]
		}
	},
	tplPure: {
		usedExports: ["tplPure"],
		expect: {
			dep: ["h"]
		}
	},
	all: {
		usedExports: [
			"chained",
			"tagged",
			"negated",
			"typed",
			"voided",
			"eqStrict",
			"neStrict",
			"tplPure"
		],
		expect: {
			dep: ["a", "b", "c", "d", "e", "f", "g", "h"]
		}
	}
});
