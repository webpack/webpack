"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "web",
	cache: {
		type: "memory"
	},
	output: {
		filename: "bundle.js",
		cssFilename: "[name].css",
		assetModuleFilename: "assets/[name][ext]"
	},
	resolve: {
		extensions: [".css", ".txt"]
	},
	experiments: {
		css: true
	},
	node: {
		__dirname: false
	}
};
