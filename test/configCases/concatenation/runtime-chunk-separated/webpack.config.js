"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	output: {
		filename: "[name].js"
	},
	optimization: {
		concatenateModules: true,
		runtimeChunk: "single",
		splitChunks: {
			chunks: "all",
			minSize: 0,
			cacheGroups: {
				shared: {
					test: /shared\.js/,
					name: "shared",
					enforce: true
				}
			}
		}
	}
};
