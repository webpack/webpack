"use strict";

const { RawSource } = require("webpack-sources");
const webpack = require("../../../../");

/** @import Compiler from "../../../../lib/Compiler" */

class EmitHashedAssetPlugin {
	/**
	 * @param {number} hashLength length of the hex hash in the emitted file name
	 */
	constructor(hashLength) {
		this.hashLength = hashLength;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const hookOptions = {
			name: "EmitHashedAssetPlugin",
			stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
		};

		compiler.hooks.thisCompilation.tap(hookOptions, (compilation) => {
			compilation.hooks.processAssets.tap(hookOptions, () => {
				compilation.emitAsset(
					`third.${"a1".repeat(this.hashLength / 2)}.js`,
					new RawSource("// some compilation result\n")
				);
				compilation.emitAsset(
					"page.Ab-c_1z9.html",
					new RawSource("<!doctype html>\n"),
					{ contenthash: "Ab-c_1z9" }
				);
				compilation.emitAsset(
					"twice.Ab-c_1z9.Ab-c_1z9.html",
					new RawSource("<!doctype html>\n"),
					{ contenthash: ["Ab-c_1z9", "Ab-c_1z9"] }
				);
			});
		});
	}
}

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		output: {
			hashFunction: "sha256",
			hashDigestLength: 64
		},
		plugins: [
			new EmitHashedAssetPlugin(64),
			new webpack.ManifestPlugin({ filename: "sha256.json" }),
			new webpack.DefinePlugin({
				MANIFEST: JSON.stringify("sha256.json"),
				HASH_LENGTH: 64
			})
		]
	},
	{
		output: {
			hashFunction: "md4",
			hashDigestLength: 40
		},
		plugins: [
			new EmitHashedAssetPlugin(32),
			new webpack.ManifestPlugin({ filename: "md4.json" }),
			new webpack.DefinePlugin({
				MANIFEST: JSON.stringify("md4.json"),
				HASH_LENGTH: 32
			})
		]
	}
];
