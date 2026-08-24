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
				parser: { dataUrlCondition: { maxSize: 100 } }
			}
		]
	},
	performance: {
		hints: "warning",
		inlinedAssets: true
	}
};
