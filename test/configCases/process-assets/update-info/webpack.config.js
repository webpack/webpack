/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "images/[name][ext]"
	},
	plugins: [
		{
			apply: compiler => {
				compiler.hooks.compilation.tap("TestPlugin", compilation => {
					compilation.hooks.processAssets.tap(
						{
							name: "TestPlugin",
							additionalAssets: true
						},
						assets => {
							for (const asset of Object.keys(assets)) {
								switch (asset) {
									case "images/file.svg": {
										compilation.updateAsset(asset, assets[asset], {
											custom: true,
											related: { first: ["first"] }
										});
										compilation.updateAsset(asset, assets[asset], info => ({
											...info,
											related: { ...info.related, second: ["second"] },
											customFn: true
										}));
										break;
									}
									case "images/file1.svg": {
										compilation.updateAsset(asset, assets[asset], {
											custom: true
										});
										compilation.updateAsset(
											asset,
											assets[asset],
											() => undefined
										);
										break;
									}
								}
							}
						}
					);
				});
			}
		}
	]
};
