"use strict";

const { RawSource } = require("webpack-sources");
const { Compilation } = require("../../../../");

// Two chunks naming each other, with nothing asked to repair their hashes: the fill
// marks both, and the repair runs for them alone, so both directions bake.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: { realContentHash: false, chunkIds: "named" },
	plugins: [
		// Writes the names out as they were before the repair ran, for the test to
		// compare — encoded, or the repair would rewrite the hashes in them too.
		(compiler) => {
			compiler.hooks.compilation.tap("NamesBeforeRepair", (compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: "NamesBeforeRepair",
						stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_HASH - 1
					},
					(assets) => {
						compilation.emitAsset(
							"names-before-repair.txt",
							new RawSource(
								Buffer.from(JSON.stringify(Object.keys(assets))).toString(
									"base64"
								)
							)
						);
					}
				);
			});
		}
	]
};
