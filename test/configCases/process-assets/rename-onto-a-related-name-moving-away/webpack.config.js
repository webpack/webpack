"use strict";

const { Compilation, optimize, sources } = require("../../../../");

const PLUGIN_NAME = "RelatedMovesAwayPlugin";
// The text asset's new name is the one the other asset's related file leaves.
/** @type {Record<string, string>} */
const NEW_HASHES = { aaaaaaaa: "bbbbbbbb", bbbbbbbb: "cccccccc" };

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
				).updateHash.tap(
					PLUGIN_NAME,
					(_contents, oldHash) => NEW_HASHES[oldHash]
				);
				compilation.hooks.processAssets.tap(
					{
						name: PLUGIN_NAME,
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						compilation.emitAsset(
							"x-aaaaaaaa.txt",
							new sources.RawSource("text"),
							{
								contenthash: "aaaaaaaa"
							}
						);
						compilation.emitAsset(
							"y-bbbbbbbb.js",
							new sources.RawSource("code"),
							{
								contenthash: "bbbbbbbb",
								related: { sourceMap: "x-bbbbbbbb.txt" }
							}
						);
						compilation.emitAsset(
							"x-bbbbbbbb.txt",
							new sources.RawSource("map"),
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
