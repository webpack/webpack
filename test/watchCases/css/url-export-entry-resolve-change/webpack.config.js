"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "web",
	// Memory cache keeps the issuer module when only the URL target changes.
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
