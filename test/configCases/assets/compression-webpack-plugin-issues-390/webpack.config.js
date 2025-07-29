"use strict";

const { Compilation } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		{
			apply: (compiler) => {
				compiler.hooks.compilation.tap(
					"MockWebpackManifestPlugin",
					(compilation) => {
						compilation.hooks.processAssets.tap(
							{
								name: "MockWebpackManifestPlugin",
								stage: Infinity
							},
							() => {
								const manifest = {
									"main.js": "/main.js",
									"main.js.map": "/main.js.map"
								};
								compilation.emitAsset(
									"asset-manifest.json",
									new (require("../../../../").sources.RawSource)(
										JSON.stringify(manifest, null, 2)
									)
								);
							}
						);
					}
				);
			}
		},
		{
			apply: (compiler) => {
				compiler.hooks.compilation.tap(
					"MockCompressionPlugin",
					(compilation) => {
						compilation.hooks.processAssets.tapPromise(
							{
								name: "MockCompressionPlugin",
								stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER,
								additionalAssets: true
							},
							async (assets) => {
								for (const name of Object.keys(assets)) {
									const { info } = compilation.getAsset(name);
									if (info && name === "asset-manifest.json") {
										compilation.deleteAsset(name);
									}
								}
							}
						);
					}
				);
			}
		},
		{
			apply: (compiler) => {
				compiler.hooks.compilation.tap("MockTerserPlugin", (compilation) => {
					compilation.hooks.processAssets.tapPromise(
						{
							name: "MockTerserPlugin",
							stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
							additionalAssets: true
						},
						async (assets) => {
							for (const name of Object.keys(assets)) {
								const { info } = compilation.getAsset(name);
								if (info && name === "asset-manifest.json") {
									compilation.deleteAsset(name);
								}
							}
						}
					);
				});
			}
		}
	]
};
