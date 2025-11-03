"use strict";

module.exports = {
	findBundle() {
		return [
			"runtime~nested-shared.js",
			"nested-shared.js",
			"shared.js",
			"commons-dependency_js.js",
			"foo.js"
		];
	}
};
