"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js",
		crossOriginLoading: "anonymous"
	},
	experiments: {
		css: true
	},
	optimization: {
		chunkIds: "named",
		minimize: false,
		splitChunks: {
			minSize: 1
		}
	}
};
