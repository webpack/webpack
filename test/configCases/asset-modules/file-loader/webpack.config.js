"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.png$/,
				loader: "file-loader",
				options: {
					name: "file-loader.[ext]"
				}
			}
		]
	}
};
