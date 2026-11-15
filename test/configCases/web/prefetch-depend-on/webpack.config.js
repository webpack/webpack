"use strict";

/** @type {import("../../../../").Configuration} */
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
