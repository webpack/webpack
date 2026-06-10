"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	output: {
		assetModuleFilename: "out-[name][ext]"
	},
	experiments: {
		html: true
	}
};
