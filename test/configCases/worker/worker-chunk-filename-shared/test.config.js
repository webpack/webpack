"use strict";

const fs = require("fs");

module.exports = {
	findBundle() {
		return ["main.js"];
	},
	afterExecute(options) {
		const files = fs.readdirSync(options.output.path);
		const expected = [
			// worker entry chunk
			"worker-worker_js.js",
			// chunk reachable only from the worker
			"worker-worker-only_js.js",
			// chunk reachable only from the main thread
			"chunk-main-only_js.js",
			// chunk reachable from both -> falls back to chunkFilename
			"chunk-shared_js.js"
		];
		const missing = expected.filter((file) => !files.includes(file));

		if (missing.length > 0) {
			throw new Error(
				`Missing expected files ${JSON.stringify(
					missing
				)}, got ${JSON.stringify(files)}`
			);
		}
	}
};
