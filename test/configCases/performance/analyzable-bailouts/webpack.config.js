"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	// `import.meta` does not parse inside the eval wrapper, so the url keeps the
	// runtime form and the hint names the devtool.
	devtool: "eval",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		// A worker loading its chunks some other way is the second reason.
		workerChunkLoading: "import-scripts"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	performance: {
		hints: "warning",
		analyzableBailouts: true
	}
};
