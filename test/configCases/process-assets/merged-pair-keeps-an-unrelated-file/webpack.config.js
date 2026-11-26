"use strict";

const { Compilation, optimize, sources } = require("../../../../");

/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "MergedPairPlugin";

/**
 * @param {Compilation} compilation compilation
 * @param {string} hash the asset's hash
 * @param {string} map the source map's content
 * @param {boolean} related whether the map is listed as related to the asset
 */
const emitWithMap = (compilation, hash, map, related) => {
	compilation.emitAsset(`${hash}.js`, new sources.RawSource("same"), {
		contenthash: hash,
		related: related ? { sourceMap: `${hash}.js.map` } : undefined
	});
	compilation.emitAsset(`${hash}.js.map`, new sources.RawSource(`map ${map}`), {
		contenthash: hash
	});
};

/** @type {Configuration} */
module.exports = {
	optimization: { realContentHash: true },
	plugins: [
		/**
		 * @param {Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				// Both assets come out the same, and one is already at that name.
				optimize.RealContentHashPlugin.getCompilationHooks(
					compilation
				).updateHash.tap(PLUGIN_NAME, () => "cccccccc");
				compilation.hooks.processAssets.tap(
					{
						name: PLUGIN_NAME,
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						emitWithMap(compilation, "aaaaaaaa", "a", true);
						emitWithMap(compilation, "cccccccc", "c", false);
					}
				);
			});
		}
	]
};
