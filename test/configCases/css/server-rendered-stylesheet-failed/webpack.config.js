"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: {
		css: true
	},
	output: {
		chunkFilename: "[name].js",
		cssChunkFilename: "[name].css",
		// the adopted link below never fires an event, so the case waits this out
		chunkLoadTimeout: 50
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
