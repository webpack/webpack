"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		filename: "[name].mjs",
		library: {
			type: "module"
		}
	},
	target: ["web", "es2020"],
	experiments: {
		outputModule: true
	},
	optimization: {
		minimize: false,
		runtimeChunk: true,
		splitChunks: {
			cacheGroups: {
				separate: {
					test: /separate/,
					chunks: "all",
					filename: "separate.mjs",
					enforce: true
				}
			}
		}
	}
};
