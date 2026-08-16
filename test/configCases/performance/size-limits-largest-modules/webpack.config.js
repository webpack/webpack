"use strict";

const { sources } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		// Any bundle exceeds this, so the size hint always fires.
		maxAssetSize: 1,
		maxEntrypointSize: 1
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap("Test", () => {
						// Belongs to no chunk, so nothing describes its contents.
						compilation.emitAsset(
							"standalone.txt",
							new sources.RawSource("standalone")
						);
					});
				});
			}
		}
	]
};
