"use strict";

const { Compilation, optimize, sources } = require("../../../../");

/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "RenameConflictPlugin";

/** @type {Configuration} */
module.exports = {
	optimization: { realContentHash: true },
	plugins: [
		/**
		 * @param {Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				// The new name is one a file without a hash already holds.
				optimize.RealContentHashPlugin.getCompilationHooks(
					compilation
				).updateHash.tap(PLUGIN_NAME, (_contents, oldHash) =>
					oldHash === "aaaaaaaa" ? "taken" : undefined
				);
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
						compilation.emitAsset("taken.txt", new sources.RawSource("second"));
					}
				);
			});
		}
	]
};
