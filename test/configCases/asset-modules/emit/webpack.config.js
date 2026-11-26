"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	output: {
		assetModuleFilename: "images/file[ext]"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset/resource",
				generator: {
					emit: false
				}
			},
			{
				test: /\.jpg$/,
				type: "asset/resource"
			}
		]
	}
};
