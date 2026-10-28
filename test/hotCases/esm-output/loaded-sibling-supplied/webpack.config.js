"use strict";

/** @type {import("../../../../").Configuration} */
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
				shared: {
					test: /shared/,
					name: "shared",
					chunks: "async",
					enforce: true
				}
			}
		}
	}
};
