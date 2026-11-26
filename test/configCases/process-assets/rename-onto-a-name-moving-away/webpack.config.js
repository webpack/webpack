"use strict";

const { Compilation, optimize, sources } = require("../../../../");

/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "RenameChainPlugin";
// The first asset's new hash is the second's old one, which moves on in turn.
/** @type {Record<string, string>} */
const NEW_HASHES = { aaaaaaaa: "bbbbbbbb", bbbbbbbb: "cccccccc" };

/** @type {Configuration} */
module.exports = {
	optimization: { realContentHash: true },
	plugins: [
		/**
		 * @param {Compiler} compiler compiler
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
