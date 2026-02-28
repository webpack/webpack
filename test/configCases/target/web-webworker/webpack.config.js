"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "webworker"],
	output: {
		filename: "bundle0.js",
		publicPath: "https://test.cases/path/",
		chunkLoading: "import-scripts",
		chunkFormat: "array-push"
	}
};
