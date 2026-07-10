"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js",
		dedupePrefetch: true
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
