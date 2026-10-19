"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js",
		first: { import: "./library.js", dependOn: "main" },
		second: { import: "./library.js", dependOn: "main" }
	},
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		library: { type: "module" }
	},
	optimization: { concatenateModules: false, minimize: false }
};
