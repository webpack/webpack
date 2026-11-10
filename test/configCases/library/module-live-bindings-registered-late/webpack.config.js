"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type: "module" } }
	},
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs"
	},
	optimization: {
		concatenateModules: false,
		runtimeChunk: "single",
		usedExports: true,
		mangleExports: "size"
	}
};
