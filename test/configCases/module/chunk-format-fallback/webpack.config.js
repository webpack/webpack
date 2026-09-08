"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: {
			import: "./index.js",
			library: { type: "module" }
		}
	},
	output: {
		module: true,
		filename: "[name].mjs"
	},
	optimization: {
		runtimeChunk: "single"
	},
	mode: "development",
	devtool: false
};
