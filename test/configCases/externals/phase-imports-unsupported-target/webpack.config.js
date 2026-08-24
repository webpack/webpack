"use strict";

// The phases are syntax the target has to parse, and nothing here says it can,
// so the build reports it rather than emitting what the target cannot read.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2020"],
	entry: "./index.js",
	output: {
		filename: "[name].js",
		module: true
	},
	optimization: { concatenateModules: false },
	experiments: {
		outputModule: true,
		deferImport: true
	},
	externals: {
		"ext-mod-defer": "module ext-mod-defer"
	}
};
