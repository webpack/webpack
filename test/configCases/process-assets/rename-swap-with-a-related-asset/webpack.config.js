"use strict";

const { Compilation, optimize, sources } = require("../../../../");

/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "RenameQueuePlugin";
/** @type {Record<string, string>} */
const NEW_HASHES = { aaaaaaaa: "bbbbbbbb", bbbbbbbb: "aaaaaaaa" };

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
						// x-a and the related x-b take each other's names.
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
