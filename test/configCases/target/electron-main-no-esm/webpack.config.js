"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	// electron 10 predates ESM support, so module output must still use `require`
	target: "electron10-main",
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFormat: "module"
	},
	entry: {
		externals: "./externals",
		main: "./index"
	},
	optimization: {
		concatenateModules: false,
		minimize: false
	},
	experiments: {
		outputModule: true
	}
};
