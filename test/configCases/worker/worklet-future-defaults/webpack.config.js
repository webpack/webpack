"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "asset-[name][ext]",
		filename: "[name].js"
	},
	target: "web",
	// `futureDefaults` turns on worklet parsing without an explicit `parser.worklet`
	experiments: {
		futureDefaults: true
	}
};
