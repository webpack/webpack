"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "asset-[name][ext]",
		filename: "[name].mjs"
	},
	target: "web",
	// `futureDefaults` turns on worklet parsing without an explicit `parser.worklet`
	experiments: {
		futureDefaults: true
	}
};
