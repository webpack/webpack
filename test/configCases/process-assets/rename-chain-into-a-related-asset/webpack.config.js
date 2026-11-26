"use strict";

const { Compilation, optimize, sources } = require("../../../../");

/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "RenameQueuePlugin";
/** @type {Record<string, string>} */
const NEW_HASHES = {
	aaaaaaaa: "bbbbbbbb",
	bbbbbbbb: "cccccccc",
	cccccccc: "dddddddd"
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
						// x-a takes x-b, which takes x-c, a related asset moving to x-d.
						compilation.emitAsset(
							"x-aaaaaaaa.txt",
							new sources.RawSource("first"),
							{
								contenthash: "aaaaaaaa"
							}
						);
						compilation.emitAsset(
							"x-bbbbbbbb.txt",
							new sources.RawSource("second"),
							{
								contenthash: "bbbbbbbb"
							}
						);
						compilation.emitAsset(
							"y-cccccccc.js",
							new sources.RawSource("code"),
							{
								contenthash: "cccccccc",
								related: { sourceMap: "x-cccccccc.txt" }
							}
						);
						compilation.emitAsset(
							"x-cccccccc.txt",
							new sources.RawSource("map"),
							{
								contenthash: "cccccccc"
							}
						);
					}
				);
			});
		}
	]
};
