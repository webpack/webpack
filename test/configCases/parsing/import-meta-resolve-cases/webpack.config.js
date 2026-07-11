"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	output: {
		assetModuleFilename: "[name][ext]"
	},
	optimization: {
		minimize: false
	}
};
