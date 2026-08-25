"use strict";

/** @type {import("../../../../").Configuration} */
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
		hints: "warning",
		inlinedAssets: true
	}
};
