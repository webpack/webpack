"use strict";

// The rule below is inactive in this compiler by design, so the plugin must
// stay silent — any warning fails the case.
/** @type {import("../../../../").Configuration} */
module.exports = {
	name: "main-compiler",
	mode: "development",
	performance: {
		hints: "warning",
		unusedRules: true
	},
	module: {
		rules: [
			{ test: /\.js$/, use: [] },
			{
				test: /\.js$/,
				compiler: "other-compiler",
				loader: "./loader"
			}
		]
	}
};
