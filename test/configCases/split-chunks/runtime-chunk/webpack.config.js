"use strict";

const path = require("node:path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a",
		b: "./b"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				dep: {
					chunks: "all",
					test: path.resolve(__dirname, "shared.js"),
					enforce: true
				}
			}
		}
	}
};
