"use strict";

const { Compilation, optimize, sources } = require("../../../../");

const PLUGIN_NAME = "MixedHashLengthsPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: { realContentHash: true },
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				optimize.RealContentHashPlugin.getCompilationHooks(
					compilation
				).updateHash.tap(PLUGIN_NAME, (_contents, oldHash) =>
					oldHash === "abcdefgh" ? "zyxwvuts" : undefined
				);
				compilation.hooks.processAssets.tap(
					{
						name: PLUGIN_NAME,
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						// "abc" is too short to find by text, so it is not recomputed.
						compilation.emitAsset(
							"abc-abcdefgh.txt",
							new sources.RawSource("text"),
							{
								contenthash: ["abc", "abcdefgh"]
							}
						);
					}
				);
			});
		}
	]
};
