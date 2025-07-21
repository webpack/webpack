"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		main: "./index.js",
		warnings: "./generate-warnings.js"
	},
	output: {
		filename: "[name].js",
		assetModuleFilename: "[name][ext]"
	},
	target: "web",
	module: {
		rules: [
			{
				test: /\.(png|jpg|css|woff2)$/,
				type: "asset/resource"
			}
		]
	}
};
