"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	devtool: false,
	target: "node",
	mode: "development",
	output: {
		publicPath: "/",
		assetModuleFilename: "[name][ext][query]"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/auto",
				parser: { exportType: "text" }
			}
		]
	},
	experiments: { css: true }
};
