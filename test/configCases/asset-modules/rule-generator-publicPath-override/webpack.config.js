"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	output: {
		assetModuleFilename: "file[ext]",
		publicPath: "assets/"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset",
				generator: {
					publicPath: ""
				}
			}
		]
	}
};
