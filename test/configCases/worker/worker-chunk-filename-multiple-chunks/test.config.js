"use strict";

const fs = require("fs");

module.exports = {
	findBundle() {
		return ["main.js"];
	},
	afterExecute(options) {
		const files = fs.readdirSync(options.output.path);
		const expected = [
			// only the worker entry chunk uses workerChunkFilename
			"worker-worker_js.js",
			// every chunk the worker loads stays on chunkFilename
			"chunk-a_js.js",
			"chunk-b_js.js"
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
