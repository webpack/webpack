"use strict";

const path = require("path");

// CSS `url()` references are `url` dependencies, so — like the HTML `<img src>`
// case — a loader can be attached to them through the `dependency` rule
// condition, here scoped to `.css` issuers.
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				dependency: "url",
				issuer: /\.css$/,
				use: [path.resolve(__dirname, "dep-loader.js")]
			}
		]
	},
	experiments: {
		css: true
	}
};
