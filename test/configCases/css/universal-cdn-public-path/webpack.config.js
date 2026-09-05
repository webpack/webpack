"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: ["web", "node"],
	mode: "development",
	experiments: {
		css: true,
		outputModule: true
	},
	output: {
		module: true,
		uniqueName: "universal-cdn-public-path",
		// Not a file url, so the stylesheet is not on disk to be read.
		publicPath: "https://cdn.example/assets/"
	}
};
