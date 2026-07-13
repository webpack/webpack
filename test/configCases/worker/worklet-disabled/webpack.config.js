"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "asset-[name][ext]",
		filename: "[name].js"
	},
	target: "web"
	// no `parser.worklet` and no `experiments.futureDefaults`: worklet parsing is off
};
