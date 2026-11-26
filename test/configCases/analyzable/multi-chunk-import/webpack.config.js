"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	output: {
		module: true,
		publicPath: "auto",
		chunkFilename: "[name].mjs"
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 1,
			cacheGroups: {
				vendor: {
					test: /vendor/,
					name: "vendor",
					enforce: true
				}
			}
		}
	}
};
