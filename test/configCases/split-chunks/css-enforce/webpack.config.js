"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: {
		css: true
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			cacheGroups: {
				vendors: {
					name: "vendors",
					test: /node_modules/,
					enforce: true
				}
			}
		}
	}
};
