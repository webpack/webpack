"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	node: {
		__dirname: false,
		__filename: false
	},
	externalsPresets: {
		node: true
	},
	output: {
		filename: "[name].js",
		assetModuleFilename: "assets/[name][ext]"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true
	}
};
