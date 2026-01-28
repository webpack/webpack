"use strict";

module.exports = {
	findBundle(i) {
		if (i === 0) {
			return ["bundle0.js"];
		}

		return [
			"runtime~nested-shared.js",
			"nested-shared.js",
			"shared.js",
			"commons-dependency_js.js",
			"foo.js"
		];
	}
};
