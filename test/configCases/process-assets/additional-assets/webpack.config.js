"use strict";

const newName = "file.txt";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "images/[name][ext]"
	},
	plugins: [
		{
			apply: (compiler) => {
				const PLUGIN_NAME = "TestPlugin";

				compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: PLUGIN_NAME,
							additionalAssets: (assets) => {
								for (const name of Object.keys(assets)) {
									if (newName !== name) {
										continue;
									}
									compilation.updateAsset(name, assets[name], {
										additional: true
									});
								}
							}
						},
						() => {
							compilation.emitAsset(
								newName,
								new compiler.webpack.sources.RawSource("text"),
								{
									new: true
								}
							);
						}
					);
				});
			}
		},
		{
			apply: (compiler) => {
				const PLUGIN_NAME = "TestPlugin1";

				compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: PLUGIN_NAME,
							additionalAssets: false
						},
						() => {
							compilation.emitAsset(
								"file1.txt",
								new compiler.webpack.sources.RawSource("text"),
								{
									new: true
								}
							);
						}
					);
				});
			}
		},
		{
			apply: (compiler) => {
				const PLUGIN_NAME = "TestPlugin2";

				compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: PLUGIN_NAME,
							additionalAssets: true
						},
						(assets) => {
							compilation.updateAsset(newName, assets[newName], {
								additionalAgain: true
							});
						}
					);
				});
			}
		}
	]
};
