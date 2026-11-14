"use strict";

const { Compilation, optimize, sources } = require("../../../../");

const PLUGIN_NAME = "RenameCollisionPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: { realContentHash: true },
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				// Both assets get the same new hash although their content differs.
				optimize.RealContentHashPlugin.getCompilationHooks(
					compilation
				).updateHash.tap(PLUGIN_NAME, () => "cccccccc");
				compilation.hooks.processAssets.tap(
					{
						name: PLUGIN_NAME,
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						compilation.emitAsset(
							"aaaaaaaa.txt",
							new sources.RawSource("first"),
							{
								contenthash: "aaaaaaaa"
							}
						);
						compilation.emitAsset(
							"bbbbbbbb.txt",
							new sources.RawSource("second"),
							{
								contenthash: "bbbbbbbb"
							}
						);
					}
				);
			});
		}
	]
};
