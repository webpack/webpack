"use strict";

module.exports = {
	findBundle() {
		return [
			"runtime~nested-shared.mjs",
			"nested-shared.mjs",
			"shared.mjs",
			"commons-dependency_js.mjs",
			"foo.mjs"
		];
	}
};
