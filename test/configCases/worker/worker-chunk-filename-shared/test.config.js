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
			// a chunk loaded inside the worker stays on chunkFilename
			"chunk-worker-only_js.js",
			// a chunk loaded on the main thread stays on chunkFilename
			"chunk-main-only_js.js",
			// a chunk shared by both stays on chunkFilename
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
