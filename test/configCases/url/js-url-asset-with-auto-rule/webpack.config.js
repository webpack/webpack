"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: { assetModuleFilename: "[name][ext]" },
	module: {
		rules: [{ test: /\.js$/, type: "javascript/auto" }]
	}
};
