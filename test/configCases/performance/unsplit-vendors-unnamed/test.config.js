"use strict";

module.exports = {
	// The shared chunk both entrypoints reference has to be there first.
	findBundle(index, options, output) {
		return [
			"./shared-node_modules_vendor-lib_index_js-shared_js.js",
			"./main.js"
		];
	}
};
