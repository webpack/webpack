"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return "./bundle.mjs";
	},
	moduleScope(scope) {
		scope.URL = URL;
	},
	afterExecute(options) {
		const workerCode = fs.readFileSync(
			path.resolve(options.output.path, "./worker_js.bundle.mjs"),
			"utf8"
		);

		// Either the runtime chunk-loading handler or the analyzable literal that
		// replaces it — both load the async chunk with `import()`.
		if (
			!/import\(\) chunk loading for javascript/.test(workerCode) &&
			!/import\([^;]*"\.\/chunk_js\.bundle\.mjs"\)/.test(workerCode)
		) {
			throw new Error(
				"import() was not found in the worker code for loading async chunks"
			);
		}
	}
};
