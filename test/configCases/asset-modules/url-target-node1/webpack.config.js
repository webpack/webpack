"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	devtool: false,
	output: {
		assetModuleFilename: "[name][ext]",
		publicPath: "public/"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				dependency: ["esm", "commonjs"],
				loader: "url-loader"
			}
		]
	}
};
