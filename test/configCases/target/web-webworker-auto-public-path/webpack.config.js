"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: ["web", "webworker"],
	output: {
		filename: "bundle0.js",
		publicPath: "auto",
		chunkLoading: "import-scripts",
		chunkFormat: "array-push"
	}
};
