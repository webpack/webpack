"use strict";

module.exports = {
	findBundle() {
		// load the copy of shared.js without y first, so it is the one that
		// marks its chunk ids as installed in the runtimes of b and b2
		return [
			"./shared-a+a2.js",
			"./a.js",
			"./a2.js",
			"./shared-b+b2.js",
			"./b.js",
			"./b2.js"
		];
	}
};
