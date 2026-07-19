"use strict";

const path = require("path");

// HTML asset references (`<img src>`, …) are `url` dependencies, so — just like
// CSS `@import` uses `dependency: "css-import"` — a loader can be attached to
// them through the `dependency` rule condition, here scoped to `.html` issuers.
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				dependency: "url",
				issuer: /\.html$/,
				use: [path.resolve(__dirname, "dep-loader.js")]
			}
		]
	},
	experiments: {
		html: true
	}
};
