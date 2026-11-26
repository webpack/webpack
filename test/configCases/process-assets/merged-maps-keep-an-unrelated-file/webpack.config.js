"use strict";

const { Compilation, optimize, sources } = require("../../../../");

/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "MergedMapsPlugin";

/** @type {Configuration} */
module.exports = {
	optimization: { realContentHash: true },
	plugins: [
		/**
		 * @param {Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				// Two assets come out the same, and both maps move onto a file
				// no asset is related to.
				optimize.RealContentHashPlugin.getCompilationHooks(
					compilation
				).updateHash.tap(PLUGIN_NAME, () => "cccccccc");
				compilation.hooks.processAssets.tap(
					{
						name: PLUGIN_NAME,
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						for (const letter of ["a", "b"]) {
							const hash = letter.repeat(8);
							compilation.emitAsset(
								`${hash}.js`,
								new sources.RawSource("same"),
								{
									contenthash: hash,
									related: { sourceMap: `${hash}.js.map` }
								}
							);
							compilation.emitAsset(
								`${hash}.js.map`,
								new sources.RawSource(`map ${letter}`),
								{ contenthash: hash }
							);
						}
						compilation.emitAsset(
							"cccccccc.js.map",
							new sources.RawSource("unrelated")
						);
					}
				);
			});
		}
	]
};
