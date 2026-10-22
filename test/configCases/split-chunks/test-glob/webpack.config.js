"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	optimization: {
		splitChunks: {
			chunks: "all",
			// intersection discovery reads the test as well, through its size bound
			dedupDepth: 1,
			cacheGroups: {
				default: false,
				defaultVendors: false,
				vendor: {
					test: { glob: ["vendor/**", "!vendor/skip.js"] },
					minSize: 1
				}
			}
		}
	}
};
