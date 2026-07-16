"use strict";

const path = require("path");

// A custom loader is attached to the resource behind the built-in `<img src>`
// attribute, so developers can override its default logic and generate any
// custom content for that reference.
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				test: /logo\.svg$/,
				use: [path.resolve(__dirname, "generate-loader.js")]
			}
		]
	},
	experiments: {
		html: true
	}
};
