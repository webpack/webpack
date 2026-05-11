"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	output: {
		assetModuleFilename: "handled-[name][ext]"
	},
	experiments: {
		html: true,
		css: true
	}
};
