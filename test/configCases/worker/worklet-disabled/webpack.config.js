"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "asset-[name][ext]",
		filename: "[name].js"
	},
	target: "web"
	// no `parser.worklet` and no `experiments.futureDefaults`: worklet parsing is off
};
