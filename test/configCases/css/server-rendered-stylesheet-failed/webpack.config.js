"use strict";

const { SSRManifestPlugin } = require("../../../../");

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
		// keeps SSRManifestPlugin from warning about an "auto" public path
		publicPath: "",
		// the adopted link below never fires an event, so the case waits this out
		chunkLoadTimeout: 50
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	},
	plugins: [new SSRManifestPlugin()]
};
