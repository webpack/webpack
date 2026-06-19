"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	output: {
		pathinfo: false,
		assetModuleFilename: "handled-[name][ext]"
	},
	experiments: {
		html: true
	}
};
