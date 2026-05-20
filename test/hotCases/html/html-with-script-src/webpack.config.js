"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "web",
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true
	}
};
