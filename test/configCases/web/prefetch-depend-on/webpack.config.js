"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	entry: {
		shared: "./shared.js",
		main: { import: "./index.js", dependOn: "shared" }
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single"
	}
};
