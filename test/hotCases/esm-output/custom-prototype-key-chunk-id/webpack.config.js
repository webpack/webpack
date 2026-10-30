"use strict";

// A custom chunk id plugin may give a chunk an `Object.prototype` key as its id.

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		enabledLibraryTypes: ["module"]
	},
	optimization: {
		minimize: false,
		chunkIds: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				compilation.hooks.chunkIds.tap("Test", (chunks) => {
					for (const chunk of chunks) {
						const name = /** @type {string} */ (chunk.name);
						chunk.id = name;
						chunk.ids = [name];
					}
				});
			});
		}
	]
};
