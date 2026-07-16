"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		assetModuleFilename: "[name][ext]"
	},
	optimization: {
		minimize: false
	},
	module: {
		parser: {
			javascript: {
				url: "relative"
			}
		}
	}
};
