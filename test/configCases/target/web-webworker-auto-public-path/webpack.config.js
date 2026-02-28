"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "webworker"],
	output: {
		filename: "bundle0.js",
		publicPath: "auto",
		chunkLoading: "import-scripts",
		chunkFormat: "array-push"
	}
};
