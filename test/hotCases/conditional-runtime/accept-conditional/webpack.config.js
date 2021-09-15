"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		sideEffects: true,
		usedExports: true,
		innerGraph: true,
		splitChunks: {
			cacheGroups: {
				forceMerge: {
					test: /shared/,
					enforce: true,
					name: "shared",
					chunks: "all"
				}
			}
		}
	},
	module: {
		rules: [
			{
				test: /dep/,
				sideEffects: false
			}
		]
	}
};
