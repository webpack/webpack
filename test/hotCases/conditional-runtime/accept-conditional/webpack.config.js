"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
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
