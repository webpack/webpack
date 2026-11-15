"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		publicPath: "auto",
		environment: {
			nodePrefixForCoreModules: false
		}
	},
	optimization: {
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				dep: { test: /dep/, name: "dep", chunks: "all", enforce: true }
			}
		}
	}
};
