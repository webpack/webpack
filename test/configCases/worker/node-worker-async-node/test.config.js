"use strict";

const fs = require("node:fs");
const path = require("node:path");

module.exports = {
	findBundle() {
		return "./bundle.js";
	},
	afterExecute(options) {
		const workerCode = fs.readFileSync(
			path.resolve(options.output.path, "./worker_js.bundle.js"),
			"utf8"
		);

		if (!/ReadFile \+ VM\.run chunk loading for javascript/.test(workerCode)) {
			throw new Error(
				"require('fs').readFile(...) and require('vm').runInThisContext were not found in the worker code for loading async chunks"
			);
		}
	}
};
