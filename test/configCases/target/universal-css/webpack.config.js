"use strict";

const base = {
	target: ["web", "node"],
	devtool: false,
	mode: "development",
	experiments: {
		css: true,
		outputModule: true
	},
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs"
	},
	optimization: {
		minimize: false,
		splitChunks: {
			cacheGroups: {
				separate: {
					test: /style2/,
					chunks: "all",
					filename: "separate.mjs",
					enforce: true
				}
			}
		}
	}
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ name: "web", ...base },
	{ name: "node", ...base }
];
