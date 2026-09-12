"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		module: true,
		// Asked for by the configuration, so it is not a reference that lost its
		// literal — the hint has nothing to say about it.
		analyzableChunkImport: false
	},
	performance: {
		hints: "warning",
		analyzableBailouts: true
	}
};
