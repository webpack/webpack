"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true
	},
	output: {
		filename: "bundle.mjs",
		// The analyzable literal bakes the content hash; each rebuild must
		// re-substitute the new hash or the import would load the stale file.
		chunkFilename: "[name].[contenthash].mjs"
	}
};
