"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs"
	},
	optimization: {
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				dep: { test: /dep/, name: "dep", chunks: "initial", enforce: true }
			}
		}
	}
};
