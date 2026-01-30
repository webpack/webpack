"use strict";

const webpack = require("../../../../");

class ReplacePlugin {
	constructor(hashPrefix) {
		this.hashPrefix = hashPrefix;
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap("Test", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "Test",
					stage:
						compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_HASH - 1
				},
				(assets) => {
					const asyncChunkFile = Object.keys(assets).find((file) =>
						file.startsWith("async")
					);
					const asyncChunkContentHash = compilation
						.getAsset(asyncChunkFile)
						.info.contenthash.slice(this.hashPrefix.length);
					const mainChunkFile = Object.keys(assets).find((file) =>
						file.startsWith("bundle")
					);
					compilation.updateAsset(mainChunkFile, (old) => {
						const replaced = old
							.source()
							.replace(
								"__USER_CONTENT__",
								JSON.stringify(asyncChunkContentHash)
							)
							.replace(
								"__BASE64_USER_CONTENT__",
								JSON.stringify(
									Buffer.from(asyncChunkContentHash).toString("base64")
								)
							);
						return new compiler.webpack.sources.RawSource(replaced);
					});
				}
			);
		});
	}
}

const hashConfig = {
	hashFunction: "md4",
	hashDigest: "hex"
};

const config = (i, hashPrefix) => ({
	output: {
		filename: `bundle${i}.[contenthash].js`,
		chunkFilename: `[name]${i}.[contenthash].js`,
		hashDigestLength: 4,
		...hashConfig
	},
	mode: "none",
	plugins: [
		new webpack.optimize.RealContentHashPlugin({
			...hashConfig,
			hashPrefix
		}),
		new ReplacePlugin(hashPrefix),
		new webpack.DefinePlugin({ PREFEXED: hashPrefix !== "" })
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [config(0, ""), config(1, "__WEBPACK_RCH_PLACEHOLDER__")];
