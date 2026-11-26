"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	output: {
		assetModuleFilename: "[contenthash:10].file[ext]"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset"
			}
		],
		generator: {
			asset: {
				publicPath: "[contenthash]/assets/"
			}
		}
	}
};
