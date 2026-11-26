"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	},
	module: {
		rules: [
			{
				test: /\.svg$/,
				type: "asset",
				// Inlines whatever it is handed, which is the mistake being reported.
				parser: { dataUrlCondition: { maxSize: Infinity } }
			}
		]
	},
	performance: {
		hints: "stats",
		inlinedAssets: true
	}
};
