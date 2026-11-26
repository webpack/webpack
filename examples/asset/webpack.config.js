"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	output: {
		assetModuleFilename: "images/[hash][ext]"
	},
	module: {
		rules: [
			{
				test: /file\.(png|jpg|svg)$/,
				type: "asset"
			}
		]
	}
};

module.exports = config;
