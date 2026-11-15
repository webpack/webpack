"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: { main: "./index.js", other: "./other.js" },
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
				m: {
					test: /[\\/]m\.js$/,
					name: "m",
					chunks: "initial",
					minChunks: 2,
					enforce: true
				}
			}
		}
	}
};
