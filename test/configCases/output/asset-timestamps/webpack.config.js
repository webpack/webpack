"use strict";

const { Compilation, sources } = require("../../../../");
const TIMESTAMPS = require("./timestamps");

/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				compilation.hooks.processAssets.tap(
					{ name: "Test", stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
					() => {
						compilation.emitAsset(
							"stamped.txt",
							new sources.RawSource("stamped"),
							{ timestamps: TIMESTAMPS }
						);
					}
				);
			});
		}
	]
};
