"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	// Every check is asked for, but hints are off — nothing may be reported.
	performance: {
		hints: false,
		cacheEffectiveness: true,
		duplicateModules: true,
		duplicatePackages: true,
		maxAssetSize: 1,
		maxEntrypointSize: 1
	},
	optimization: {
		splitChunks: false
	}
};
