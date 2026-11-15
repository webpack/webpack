"use strict";

const { HotModuleReplacementPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					HotModuleReplacementPlugin.getCompilationHooks(
						compilation
					).updateManifest.tap("Test", (manifest, { chunks }) => {
						manifest.custom = chunks.map((chunk) => chunk.id);
					});
				});
			}
		}
	]
};
