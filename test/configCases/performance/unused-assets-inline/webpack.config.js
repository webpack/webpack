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
				test: /\.(png|jpg)$/,
				type: "asset/inline"
			}
		]
	},
	performance: {
		hints: "warning",
		unusedAssets: true
	}
};
