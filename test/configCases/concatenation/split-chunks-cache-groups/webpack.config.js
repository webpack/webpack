"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	output: {
		filename: "[name].js"
	},
	optimization: {
		concatenateModules: true,
		splitChunks: {
			chunks: "all",
			minSize: 0,
			cacheGroups: {
				utils: {
					test: /util\.js/,
					name: "utils",
					enforce: true,
					priority: 10
				},
				default: false
			}
		}
	}
};
