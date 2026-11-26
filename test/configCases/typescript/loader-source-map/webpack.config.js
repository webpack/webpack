"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	devtool: "source-map",
	entry: "./index.ts",
	experiments: {
		typescript: true
	},
	module: {
		rules: [
			{
				test: /data\.ts$/,
				use: [require.resolve("./loader/banner-loader.js")]
			}
		]
	}
};
